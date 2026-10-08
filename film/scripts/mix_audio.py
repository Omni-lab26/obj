#!/usr/bin/env python3
"""映像のタイムライン（src/data/edl.json）に合わせて環境音と曲をミックスする。

  python3 scripts/mix_audio.py

出力:
  public/audio/mix_full.wav     曲 + 環境音（曲ファイルがあるときのみ）
  public/audio/mix_nomusic.wav  環境音のみ（投稿先で公式音源を付ける版。環境音の音量は完成版と同じ）
  work/mix/report.json          ラウドネスなどの測定値

方針:
  - 環境音は各ショットの amb タグに従い、カットをまたいで 0.6 秒でクロスフェード
  - 曲が鳴っている間は控えめ（config.audio.ambience_gain_db_under_music）、
    曲の前後（冒頭の暗闇・余韻）は少し前に出す（ambience_gain_db_no_music_section）
  - 曲は -14 LUFS に正規化してから重ねる。最後にトゥルーピーク -1.5 dB 付近でリミッター
  - work/amb_override/<tag>.wav があれば合成音の代わりに使う（実録音への差し替え用）
"""
import json
import subprocess
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
SR = 48000

TAG_DB = {
    "rumble": 1.0, "lava": -2.0, "surf": 0.0, "thunder": -5.0, "wind": -2.0, "wind_soft": -4.0, "space": -7.0,
    "underwater": -1.0, "underwater_close": -2.0, "bubbles": -4.0, "water_lap": -3.0, "forest_air": -3.0,
    "wings": -5.0, "waterfall": 0.0, "rain": -1.0, "stream": -2.0, "drip": -2.0, "birds_far": -8.0,
}
SECONDARY_DB = -3.0  # 2つ目以降のタグ


def db(x):
    return 10 ** (x / 20)


def load_stem(tag):
    for d in ("amb_override", "amb"):
        p = ROOT / "work" / d / f"{tag}.wav"
        if p.exists():
            y, sr = sf.read(p, dtype="float32", always_2d=True)
            assert sr == SR, f"{p} must be {SR} Hz"
            if y.shape[1] == 1:
                y = np.repeat(y, 2, axis=1)
            return y
    raise FileNotFoundError(f"ambience stem missing: {tag} (run scripts/ambience.py)")


def ramp(n_total, a, b, xf):
    """[a,b) を 1、境界の前後 xf 秒で上昇/下降する raised-cosine の窓（サンプル単位）。"""
    e = np.zeros(n_total, dtype=np.float32)
    x = xf * SR
    lo, hi = max(0, int(a - x / 2)), min(n_total, int(b + x / 2) + 1)
    if hi <= lo:
        return e
    t = np.arange(lo, hi, dtype=np.float64)
    if x <= 0:
        e[lo:hi] = 1.0
        return e
    up = np.clip((t - (a - x / 2)) / x, 0, 1)
    down = np.clip(((b + x / 2) - t) / x, 0, 1)
    e[lo:hi] = 0.5 - 0.5 * np.cos(np.pi * np.minimum(up, down))
    return e


def decode_music(path: Path):
    wav = ROOT / "work" / "mix" / "music_48k.wav"
    wav.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-ac", "2", "-ar", str(SR), "-c:a", "pcm_f32le",
                    str(wav)], check=True)
    y, _ = sf.read(wav, dtype="float32", always_2d=True)
    return y


def limit_and_write(y, out: Path, tp_db):
    tmp = ROOT / "work" / "mix" / (out.stem + "_prelimit.wav")
    tmp.parent.mkdir(parents=True, exist_ok=True)
    sf.write(tmp, y, SR, subtype="FLOAT")
    out.parent.mkdir(parents=True, exist_ok=True)
    lim = db(tp_db - 0.5)  # サンプルピーク基準なので少し余裕を取る
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(tmp), "-af",
                    f"alimiter=limit={lim:.4f}:attack=3:release=80:level=false",
                    "-c:a", "pcm_s24le", str(out)], check=True)


def measure(path: Path):
    y, sr = sf.read(path, dtype="float32", always_2d=True)
    meter = pyln.Meter(sr)
    loud = meter.integrated_loudness(y)
    return {"file": str(path.relative_to(ROOT)), "lufs": round(float(loud), 2),
            "sample_peak_db": round(float(20 * np.log10(np.abs(y).max() + 1e-9)), 2),
            "duration": round(len(y) / sr, 3)}


def main():
    cfg = json.loads((ROOT / "data" / "config.json").read_text())
    edl = json.loads((ROOT / "src" / "data" / "edl.json").read_text())
    acfg = cfg["audio"]
    fps = edl["fps"]
    N = int(round(edl["durationInFrames"] / fps * SR))
    xf = acfg["ambience_crossfade"]

    # 曲が鳴っている区間の曲線（環境音の音量を切り替える）
    m0 = edl["music"]["offset_s"]
    # 曲が急に途切れる曲では、その瞬間から環境音を前に出す（無音にせず余韻を残す）
    m1 = edl["music"].get("drop_s") or edl["music"]["end_s"]
    music_on = ramp(N, int(m0 * SR), int((m1 + 0.4) * SR), 1.2)
    bed_db = acfg["ambience_gain_db_no_music_section"] + music_on * (
        acfg["ambience_gain_db_under_music"] - acfg["ambience_gain_db_no_music_section"])
    bed = db(bed_db)[:, None]

    # タグごとの窓を作る
    env = {}
    shots = edl["shots"]
    for k, s in enumerate(shots):
        a = int(s["cut_frame"] / fps * SR)
        b = int(s["end_frame"] / fps * SR)
        if k == len(shots) - 1:
            b = N  # 最後のショットの環境音はタイトル・クレジットまで薄く続ける
        for i, tag in enumerate(s.get("amb", [])):
            g = db(TAG_DB.get(tag, 0.0) + (SECONDARY_DB if i else 0.0))
            w = ramp(N, a, b, xf) * g
            env[tag] = np.maximum(env.get(tag, np.zeros(N, dtype=np.float32)), w)

    # 終盤: タイトル以降はゆっくり下げ、最後の 1.5 秒で無音へ
    title = next((t for t in edl["texts"] if t["style"] == "title"), None)
    tail = np.ones(N, dtype=np.float32)
    if title:
        t0 = int(title["from"] / fps * SR)
        tail[t0:] = db(np.linspace(0, -12, N - t0))
    fo = int(1.5 * SR)
    tail[-fo:] *= np.linspace(1, 0, fo)

    amb = np.zeros((N, 2), dtype=np.float32)
    for tag, w in env.items():
        stem = load_stem(tag)
        reps = int(np.ceil(N / len(stem)))
        loop = np.tile(stem, (reps, 1))[:N]
        amb += loop * w[:, None]
    amb *= bed * tail[:, None]

    # 単発の効果音（ショットの fx 指定。カット位置に置く）
    for s in shots:
        for fx in s.get("fx") or []:
            one = load_stem(fx) * db(-4.0)
            a = int(s["cut_frame"] / fps * SR)
            e = min(N, a + len(one))
            amb[a:e] += one[: e - a]

    report = {}
    out_nomusic = ROOT / "public" / "audio" / "mix_nomusic.wav"
    limit_and_write(amb, out_nomusic, acfg["true_peak"])
    report["nomusic"] = measure(out_nomusic)

    mfile = edl["music"]["file"]
    if mfile:
        music = decode_music(ROOT / mfile)
        meter = pyln.Meter(SR)
        loud = meter.integrated_loudness(music)
        music *= db(acfg["target_lufs"] - loud + cfg["music"].get("gain_db", 0.0))
        full = amb.copy()
        a = int(m0 * SR)
        e = min(N, a + len(music))
        full[a:e] += music[: e - a]
        out_full = ROOT / "public" / "audio" / "mix_full.wav"
        limit_and_write(full, out_full, acfg["true_peak"])
        report["full"] = measure(out_full)
        report["music_source_lufs"] = round(float(loud), 2)
    (ROOT / "work" / "mix").mkdir(parents=True, exist_ok=True)
    (ROOT / "work" / "mix" / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1))
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
