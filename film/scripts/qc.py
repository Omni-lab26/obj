#!/usr/bin/env python3
"""書き出した動画の品質確認。

  python3 scripts/qc.py out/生命の軌跡_1080p.mp4 [--animatic]

確認する項目:
  - 形式: 解像度・fps・コーデック・尺・音声
  - 黒いフレーム（blackdetect）: EDL の意図した黒（冒頭のフェードイン、タイトル・クレジット）以外を警告
  - 静止（freezedetect）: 素材不足でコマが止まっていないか（--animatic では省略）
  - 音の途切れ（silencedetect）と、ラウドネス・トゥルーピーク（ebur128）
  - 各章の中央と、すべてのカットの直前・直後のフレームを抽出し、比較シートを作る
    （画質・色の統一・構図・透かしの有無を目で確認するため）
出力: out/qc/<動画名>/ にフレームとシート、report.json。docs/qc_report.md に要約。
"""
import argparse
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def probe(path):
    r = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", str(path)])
    return json.loads(r.stdout)


def detect(path, vf=None, af=None):
    cmd = ["ffmpeg", "-v", "info", "-i", str(path)]
    if vf:
        cmd += ["-vf", vf, "-an"]
    if af:
        cmd += ["-af", af, "-vn"]
    cmd += ["-f", "null", "-"]
    return run(cmd).stderr


def intervals(log, key):
    starts = [float(x) for x in re.findall(rf"{key}_start:\s*([\d.]+)", log)]
    ends = [float(x) for x in re.findall(rf"{key}_end:\s*([\d.]+)", log)]
    return [[round(s, 3), round(e, 3)] for s, e in zip(starts, ends + [None] * (len(starts) - len(ends))) if e]


def covered(iv, allowed, tol=0.25):
    return any(iv[0] >= a - tol and iv[1] <= b + tol for a, b in allowed)


def extract(path, frames, out_dir: Path, w=480):
    out_dir.mkdir(parents=True, exist_ok=True)
    for f in out_dir.glob("*.jpg"):
        f.unlink()
    frames = sorted(set(frames))
    expr = "+".join(f"eq(n\\,{n})" for n in frames)
    run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-vf", f"select='{expr}',scale={w}:-2", "-vsync", "0",
         "-q:v", "3", str(out_dir / "f_%04d.jpg")])
    got = sorted(out_dir.glob("f_*.jpg"))
    mapping = {}
    for n, p in zip(frames, got):
        dst = out_dir / f"n{n:05d}.jpg"
        p.rename(dst)
        mapping[n] = dst
    return mapping


def sheet(pairs, out: Path, title):
    """pairs: [(label, before_jpg, after_jpg)] → 1行に [前|後] を並べたシート。"""
    rows = []
    tmp = out.parent / "_rows"
    tmp.mkdir(exist_ok=True)
    for i, (label, a, b) in enumerate(pairs):
        if not (a and b):
            continue
        row = tmp / f"r{i:03d}.jpg"
        subprocess.run(["montage", str(a), str(b), "-tile", "2x1", "-geometry", "+2+2", "-background", "#111",
                        str(row)], check=True)
        subprocess.run(["convert", str(row), "-gravity", "west", "-background", "#111", "-splice", "220x0",
                        "-fill", "#ddd", "-pointsize", "18", "-annotate", "+8+0", label, str(row)], check=True)
        rows.append(str(row))
    if not rows:
        return None
    # 6行ずつのページに分ける
    pages = []
    for k in range(0, len(rows), 6):
        page = out.with_name(f"{out.stem}_{k // 6 + 1:02d}.jpg")
        subprocess.run(["convert", *rows[k:k + 6], "-append", "-gravity", "north", "-background", "#000",
                        "-splice", "0x30", "-fill", "#fc6", "-pointsize", "20", "-annotate", "+0+4", title,
                        str(page)], check=True)
        pages.append(page)
    for r in rows:
        Path(r).unlink()
    return pages


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--animatic", action="store_true", help="仮編集（静止スレート）なので静止検出を省く")
    args = ap.parse_args()
    video = Path(args.video).resolve()
    edl = json.loads((ROOT / "src" / "data" / "edl.json").read_text())
    fps = edl["fps"]
    qdir = ROOT / "out" / "qc" / video.stem
    qdir.mkdir(parents=True, exist_ok=True)

    info = probe(video)
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    rep = {"file": str(video.relative_to(ROOT)) if video.is_relative_to(ROOT) else str(video),
           "video": {"codec": v["codec_name"], "w": v["width"], "h": v["height"], "fps": v["r_frame_rate"],
                     "pix_fmt": v.get("pix_fmt"), "color": v.get("color_space")},
           "audio": ({"codec": a["codec_name"], "sr": a["sample_rate"], "ch": a["channels"]} if a else None),
           "duration": float(info["format"]["duration"]), "expected_duration": edl["durationInFrames"] / fps,
           "issues": []}
    if abs(rep["duration"] - rep["expected_duration"]) > 0.1:
        rep["issues"].append(f"尺が EDL と違う: {rep['duration']:.2f}s vs {rep['expected_duration']:.2f}s")

    allowed_black = [[b["from"] / fps, b["to"] / fps] for b in edl.get("intentional_black", [])]
    blacks = intervals(detect(video, vf="blackdetect=d=0.06:pix_th=0.05:pic_th=0.98"), "black")
    rep["black"] = [{"interval": iv, "intended": covered(iv, allowed_black)} for iv in blacks]
    for b in rep["black"]:
        if not b["intended"]:
            rep["issues"].append(f"意図しない黒: {b['interval']}")

    if not args.animatic:
        freezes = intervals(detect(video, vf="freezedetect=n=0.0008:d=1.2"), "freeze")
        rep["freeze"] = freezes
        for iv in freezes:
            if not covered(iv, allowed_black):
                rep["issues"].append(f"静止の疑い（素材不足・コマ止まり）: {iv}")

    if a:
        sil = intervals(detect(video, af="silencedetect=noise=-60dB:d=0.5"), "silence")
        rep["silence"] = sil
        for iv in sil:
            if iv[1] < rep["duration"] - 0.3:
                rep["issues"].append(f"無音区間: {iv}")
        log = detect(video, af="ebur128=peak=true")
        m = re.search(r"Integrated loudness:\s+I:\s+(-?[\d.]+) LUFS", log)
        p = re.search(r"True peak:\s+Peak:\s+(-?[\d.]+) dBFS", log)
        rep["loudness_lufs"] = float(m.group(1)) if m else None
        rep["true_peak_dbtp"] = float(p.group(1)) if p else None
        if rep["true_peak_dbtp"] is not None and rep["true_peak_dbtp"] > -1.0:
            rep["issues"].append(f"トゥルーピークが高い: {rep['true_peak_dbtp']} dBTP")

    # フレーム抽出
    last = edl["durationInFrames"] - 1
    wanted = []
    for c in edl["chapters"]:
        wanted.append((c["from"] + c["to"]) // 2)
    for s in edl["shots"]:
        wanted += [max(0, s["cut_frame"] - 2), min(last, s["cut_frame"] + 2)]
    for t in edl["texts"]:
        wanted.append(min(last, t["from"] + t["dur"] // 2))
    wanted.append(min(last, edl["credits"]["from"] + edl["credits"]["dur"] // 2))
    fr = extract(video, wanted, qdir / "frames")
    pairs = []
    for i, s in enumerate(edl["shots"]):
        prev = edl["shots"][i - 1]["id"] if i else "—"
        pairs.append((f"{prev} → {s['id']}\n{s['cut_frame'] / fps:7.2f}s\n{s['transition_in']}",
                      fr.get(max(0, s["cut_frame"] - 2)), fr.get(min(last, s["cut_frame"] + 2))))
    rep["cut_sheets"] = [str(p.relative_to(ROOT)) for p in (sheet(pairs, qdir / "cuts.jpg", f"{video.name}  カット前後") or [])]
    mids = [fr.get((c["from"] + c["to"]) // 2) for c in edl["chapters"]]
    mids = [str(m) for m in mids if m]
    if mids:
        chap = qdir / "chapters.jpg"
        subprocess.run(["montage", *mids, "-tile", "3x", "-geometry", "+3+3", "-background", "#111", str(chap)], check=True)
        rep["chapter_sheet"] = str(chap.relative_to(ROOT))

    (qdir / "report.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1))
    lines = [f"# QC: {video.name}", "",
             f"- 形式: {rep['video']['w']}x{rep['video']['h']} {rep['video']['codec']} {rep['video']['fps']} {rep['video']['pix_fmt']}"
             f" / 音声: {rep['audio']}",
             f"- 尺: {rep['duration']:.2f}s（EDL {rep['expected_duration']:.2f}s）",
             f"- ラウドネス: {rep.get('loudness_lufs')} LUFS / トゥルーピーク {rep.get('true_peak_dbtp')} dBTP",
             f"- 黒: " + (", ".join(f"{b['interval']}{'（意図）' if b['intended'] else '（要確認）'}" for b in rep["black"]) or "なし"),
             f"- 静止: {rep.get('freeze', '（仮編集のため省略）')}",
             f"- 無音: {rep.get('silence')}",
             "", "## 問題", ""]
    lines += [f"- {x}" for x in rep["issues"]] or ["- なし"]
    lines += ["", "## 確認用シート", ""] + [f"- {p}" for p in rep["cut_sheets"]] + [f"- {rep.get('chapter_sheet')}"]
    (ROOT / "docs" / f"qc_{video.stem}.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
