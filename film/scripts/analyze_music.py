#!/usr/bin/env python3
"""曲を解析して data/music.json と docs/music_analysis.png を出力する。

使い方:
  python3 scripts/analyze_music.py public/audio/music.wav

出力する主な情報:
  duration        曲の長さ（秒。末尾の無音は除いた実質的な終わり end_sound も別途）
  beats           拍の時刻（テンポが変わり続ける曲に強い PLP 方式で検出）
  tempo_curve     局所テンポ（BPM）の推移
  downbeats       アクセント拍（周囲の拍より強く鳴る拍。大きな転換の候補）
  sections        構造の区切り（音色・和声の変化から自己類似行列で分割）
  energy          音の密度・大きさの推移（0..1、0.5秒刻み）
  hits            強いアタック（映像の大きな転換に使える候補）
  pulses          低音域のアタック（体感のパルス。カットはこれに合わせる）
  harmony         和声（低音の音高）の変わり目
  drop            音量が急に落ちる位置（曲の終わりのブレイク）
"""
import json
import sys
from pathlib import Path

import numpy as np
import librosa
from scipy import ndimage, signal

ROOT = Path(__file__).resolve().parent.parent


def smooth(x, n):
    if n <= 1:
        return x
    k = np.hanning(n)
    k /= k.sum()
    return np.convolve(x, k, mode="same")


def analyze(path: Path):
    y, sr = librosa.load(str(path), sr=22050, mono=True)
    hop = 512
    duration = len(y) / sr

    # 実質的な鳴り終わり（-50 dB を下回った最後の位置）
    rms = librosa.feature.rms(y=y, hop_length=hop)[0]
    rms_db = librosa.amplitude_to_db(rms, ref=np.max)
    t_frames = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)
    loud = np.where(rms_db > -50)[0]
    start_sound = float(t_frames[loud[0]]) if len(loud) else 0.0
    end_sound = float(t_frames[loud[-1]]) if len(loud) else duration

    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)

    # テンポが変化し続ける曲なので、固定テンポ前提の beat_track ではなく
    # PLP（predominant local pulse）のピークを拍とする
    pulse = librosa.beat.plp(onset_envelope=onset_env, sr=sr, hop_length=hop,
                             tempo_min=40, tempo_max=240)
    beat_frames = np.flatnonzero(librosa.util.localmax(pulse))
    # 周囲4秒の最大値の半分に満たない弱いピークを除外（局所適応しきい値）
    local_max = ndimage.maximum_filter1d(pulse, size=int(4.0 / (hop / sr)))
    beat_frames = beat_frames[pulse[beat_frames] >= 0.5 * local_max[beat_frames]]
    beats = librosa.frames_to_time(beat_frames, sr=sr, hop_length=hop)
    # 拍ごとの強さ（カット位置の優先度に使う）
    oe_norm = onset_env / (onset_env.max() + 1e-9)
    beat_strength = [round(float(oe_norm[max(0, f - 2):f + 3].max()), 3) for f in beat_frames]

    # 参考: 従来の beat_track の結果も残す
    bt_tempo, bt_frames = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr,
                                                  hop_length=hop, tightness=50)
    bt_times = librosa.frames_to_time(bt_frames, sr=sr, hop_length=hop)

    # 局所テンポ
    dtempo = librosa.feature.tempo(onset_envelope=onset_env, sr=sr, hop_length=hop,
                                   aggregate=None, max_tempo=260)
    tc_t = librosa.frames_to_time(np.arange(len(dtempo)), sr=sr, hop_length=hop)
    step = max(1, int(1.0 / (hop / sr)))  # 1秒刻みに間引く
    dtempo = ndimage.median_filter(dtempo, size=int(6.0 / (hop / sr)))
    tempo_curve = [[round(float(tc_t[i]), 2), round(float(dtempo[i]), 1)]
                   for i in range(0, len(dtempo), step)]

    # アクセント拍: 前後8拍の中で強さが上位25%の拍。
    # テンポが変わり続ける管弦楽曲では小節頭の推定が不安定なため、
    # 「強く鳴っている拍」を大きな転換の候補として使う
    downbeats = []
    if len(beat_frames) >= 8:
        bs = np.array(beat_strength)
        for i, b in enumerate(beats):
            w = bs[max(0, i - 8):i + 9]
            if bs[i] >= np.percentile(w, 75):
                downbeats.append(float(b))

    # エネルギー（RMS とスペクトル帯域の積で「音の密度」も反映）
    S = np.abs(librosa.stft(y, hop_length=hop))
    flux = np.concatenate([[0], np.sqrt((np.diff(S, axis=1).clip(min=0) ** 2).sum(axis=0))])
    centroid = librosa.feature.spectral_centroid(S=S, sr=sr)[0]
    n = min(len(rms), len(flux), len(centroid))
    dens = (rms[:n] / (rms.max() + 1e-9)) * 0.6 + (flux[:n] / (flux.max() + 1e-9)) * 0.25 \
        + (centroid[:n] / (centroid.max() + 1e-9)) * 0.15
    dens = smooth(dens, int(2.0 / (hop / sr)))
    dens = (dens - dens.min()) / (dens.max() - dens.min() + 1e-9)
    e_step = int(0.5 / (hop / sr))
    energy = [[round(float(t_frames[i]), 2), round(float(dens[i]), 3)]
              for i in range(0, n, e_step)]

    # 構造の区切り: MFCC + chroma を拍同期させ、自己類似行列から区切りを推定
    mfcc = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop, n_mfcc=20)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop)
    feat = np.vstack([librosa.util.normalize(mfcc, axis=1), chroma])
    sync_frames = beat_frames if len(beat_frames) > 16 else bt_frames
    fs = librosa.util.sync(feat, sync_frames, aggregate=np.median)
    k = int(np.clip(round(duration / 15), 4, 12))
    try:
        bounds = librosa.segment.agglomerative(fs, k)
        bound_frames = librosa.util.fix_frames(np.array(sync_frames)[np.clip(bounds, 0, len(sync_frames) - 1)],
                                               x_min=0)
        bound_times = sorted(set(round(float(t), 2) for t in
                                 librosa.frames_to_time(bound_frames, sr=sr, hop_length=hop)))
    except Exception as e:  # noqa: BLE001
        print("segment failed:", e, file=sys.stderr)
        bound_times = [0.0]
    if bound_times[0] > 0.5:
        bound_times = [0.0] + bound_times
    sections = []
    for i, t0 in enumerate(bound_times):
        t1 = bound_times[i + 1] if i + 1 < len(bound_times) else end_sound
        if t1 - t0 < 2.0:
            continue
        m = (t_frames[:n] >= t0) & (t_frames[:n] < t1)
        sections.append({"start": t0, "end": round(float(t1), 2),
                         "energy": round(float(dens[m].mean()) if m.any() else 0.0, 3)})

    # 強いアタック（大きな転換の候補）: onset 強度の上位かつ直前より音量が跳ねる箇所
    on_frames = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, hop_length=hop,
                                           backtrack=False, units="frames")
    hits = []
    if len(on_frames):
        thr = np.percentile(onset_env[on_frames], 92)
        for f in on_frames:
            if onset_env[f] < thr:
                continue
            pre = rms[max(0, f - int(0.5 / (hop / sr))):f].mean() if f > 2 else 0
            post = rms[f:f + int(0.3 / (hop / sr))].mean()
            if post > pre * 1.4:
                hits.append(round(float(librosa.frames_to_time(f, sr=sr, hop_length=hop)), 3))

    # 体感のパルス: 低音域（300Hz 未満）のアタック。加速する曲でも、拍の表に近い位置が取れる
    hop2 = 256
    M = librosa.feature.melspectrogram(y=y, sr=sr, hop_length=hop2, n_mels=128, fmin=30, fmax=8000)
    mf = librosa.mel_frequencies(n_mels=128, fmin=30, fmax=8000)
    oe_low = librosa.onset.onset_strength(S=librosa.power_to_db(M[mf < 300]), sr=sr, hop_length=hop2)
    oe_low = ndimage.gaussian_filter1d(oe_low, 1.5)
    t2 = librosa.times_like(oe_low, sr=sr, hop_length=hop2)
    loc = ndimage.uniform_filter1d(oe_low, size=int(3 / (hop2 / sr)))
    pk, _ = signal.find_peaks(oe_low, distance=int(0.7 / (hop2 / sr)),
                              prominence=np.percentile(oe_low, 90) * 0.5)
    pk = [q for q in pk if oe_low[q] > 1.6 * loc[q]]
    pulses = [round(float(t2[q]), 3) for q in pk]
    pulse_strength = [round(float(oe_low[q] / (oe_low.max() + 1e-9)), 3) for q in pk]

    # 和声の変わり目: 低音域クロマの前後0.8秒の平均の差
    Cq = np.abs(librosa.cqt(y, sr=sr, hop_length=hop, fmin=librosa.note_to_hz("C1"), n_bins=48))
    chb = ndimage.uniform_filter1d(librosa.feature.chroma_cqt(C=Cq, sr=sr, hop_length=hop), size=9, axis=1)
    chb /= np.linalg.norm(chb, axis=0, keepdims=True) + 1e-9
    W = int(0.8 / (hop / sr))
    nov = np.zeros(chb.shape[1])
    for i in range(W, chb.shape[1] - W):
        a, b = chb[:, i - W:i].mean(1), chb[:, i:i + W].mean(1)
        nov[i] = 1 - a @ b / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9)
    nov = ndimage.gaussian_filter1d(nov, 2)
    hk, _ = signal.find_peaks(nov, height=0.05, distance=int(1.0 / (hop / sr)), prominence=0.04)
    th = librosa.times_like(nov, sr=sr, hop_length=hop)
    harmony = [round(float(th[q]), 3) for q in hk]

    # ブレイク: -14dB を下回ったまま 2 秒以上戻らない最初の位置を探し、
    # そこから遡って最後に -6dB 以上鳴っていたフレームを「落ちる瞬間」とする
    drop = None
    rdb = librosa.amplitude_to_db(librosa.feature.rms(y=y, hop_length=hop2)[0], ref=np.max)
    rdb = ndimage.uniform_filter1d(rdb, 3)
    span = int(2.0 / (hop2 / sr))
    loud_seen = False
    for i in range(len(rdb) - span):
        loud_seen = loud_seen or rdb[i] > -6
        if loud_seen and rdb[i] < -14 and rdb[i:i + span].max() < -14:
            j = i
            while j > 0 and rdb[j] <= -6:
                j -= 1
            drop = round(float(t2[j]), 3)
            break

    # 終わり方: 最後の2秒の音量変化
    tail_m = t_frames[:n] > end_sound - 2.0
    tail_shape = "abrupt" if (len(rms_db[:n][tail_m]) and rms_db[:n][tail_m][:-5].mean() > -20) else "decay"

    return {
        "source": str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path),
        "provisional": False,
        "sr": sr,
        "duration": round(duration, 3),
        "start_sound": round(start_sound, 3),
        "end_sound": round(end_sound, 3),
        "ending": tail_shape,
        "tempo_global_beat_track": round(float(np.atleast_1d(bt_tempo)[0]), 1),
        "beats": [round(float(b), 3) for b in beats],
        "beat_strength": beat_strength,
        "beats_beat_track": [round(float(b), 3) for b in bt_times],
        "downbeats": [round(d, 3) for d in downbeats],
        "tempo_curve": tempo_curve,
        "sections": sections,
        "energy": energy,
        "hits": hits,
        "pulses": pulses,
        "pulse_strength": pulse_strength,
        "harmony": harmony,
        "drop": drop,
    }


def plot(res, out_png: Path):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return
    fig, ax = plt.subplots(3, 1, figsize=(14, 7), sharex=True)
    e = np.array(res["energy"])
    ax[0].plot(e[:, 0], e[:, 1], color="#2b6")
    ax[0].set_ylabel("density")
    for s in res["sections"]:
        for a in ax:
            a.axvline(s["start"], color="#888", lw=0.8, ls="--")
    for h in res["hits"]:
        ax[0].axvline(h, color="#d33", lw=0.6)
    tc = np.array(res["tempo_curve"])
    ax[1].plot(tc[:, 0], tc[:, 1], color="#36c")
    ax[1].set_ylabel("BPM")
    ax[2].vlines(res["beats"], 0, 0.5, color="#555", lw=0.5)
    ax[2].vlines(res["downbeats"], 0, 1, color="#000", lw=1.0)
    ax[2].vlines(res.get("pulses", []), 0, 0.8, color="#c60", lw=1.2)
    for h in res.get("harmony", []):
        ax[0].axvline(h, color="#36c", lw=0.6, ls=":")
    if res.get("drop"):
        for a in ax:
            a.axvline(res["drop"], color="#000", lw=1.5)
    ax[2].set_ylabel("beats")
    ax[2].set_xlabel("sec")
    fig.tight_layout()
    fig.savefig(out_png, dpi=110)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    src = Path(sys.argv[1]).resolve()
    res = analyze(src)
    out = ROOT / "data" / "music.json"
    out.write_text(json.dumps(res, ensure_ascii=False, indent=1))
    plot(res, ROOT / "docs" / "music_analysis.png")
    print(f"duration {res['duration']}s (sound {res['start_sound']}–{res['end_sound']}), "
          f"beats {len(res['beats'])}, sections {len(res['sections'])}, hits {len(res['hits'])}, "
          f"ending={res['ending']}, pulses {len(res['pulses'])}, harmony {len(res['harmony'])}, drop {res['drop']}")
    for s in res["sections"]:
        print(f"  section {s['start']:7.2f}–{s['end']:7.2f}  energy {s['energy']:.2f}")


if __name__ == "__main__":
    main()
