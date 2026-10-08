#!/usr/bin/env python3
"""採用素材の全体を等間隔のコマで並べ、使い始め位置（selects.json の in）を決めるためのシートを作る。

  python3 scripts/source_strips.py            # 章ごとに work/strips/ch<N>.jpg
  python3 scripts/source_strips.py C1-02 C6-01

各行 = 1ショット。コマの下に素材の秒数、行頭に現在の in（未指定なら自動）と必要な長さを表示。
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "work" / "strips"
N = 9


def main():
    edl = json.loads((ROOT / "src" / "data" / "edl.json").read_text())
    sel = json.loads((ROOT / "data" / "selects.json").read_text())
    only = set(sys.argv[1:])
    rows_by_ch = {}
    for s in edl["shots"]:
        if only and s["id"] not in only:
            continue
        x = sel.get(s["id"]) or {}
        f = x.get("file")
        if not f:
            continue
        src = ROOT / f
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                    str(src)], capture_output=True, text=True).stdout)
        tdir = OUT / s["id"]
        tdir.mkdir(parents=True, exist_ok=True)
        tiles = []
        for k in range(N):
            t = dur * (k + 0.5) / N
            dst = tdir / f"{k}.jpg"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(src), "-frames:v", "1",
                            "-vf", f"scale=200:-2,drawtext=text='{t:.1f}s':x=4:y=h-20:fontcolor=white:fontsize=15:"
                                   f"box=1:boxcolor=black@0.6", str(dst)], check=True)
            tiles.append(str(dst))
        row = tdir / "row.jpg"
        subprocess.run(["montage", *tiles, "-tile", f"{N}x1", "-geometry", "+1+1", "-background", "#111", str(row)],
                       check=True)
        need = (s["end_frame"] - s["cut_frame"]) / edl["fps"]
        label = f"{s['id']}  len {need:.1f}s  in={x.get('in')}  src {dur:.1f}s  {s['desc'][:30]}"
        subprocess.run(["convert", str(row), "-gravity", "north", "-background", "#111", "-splice", "0x22",
                        "-fill", "#fc6", "-pointsize", "16", "-annotate", "+0+3", label, str(row)], check=True)
        rows_by_ch.setdefault(s["chapter"], []).append(str(row))
    for ch, rows in rows_by_ch.items():
        out = OUT / f"ch{ch}.jpg"
        subprocess.run(["convert", *rows, "-append", str(out)], check=True)
        print(out)


if __name__ == "__main__":
    main()
