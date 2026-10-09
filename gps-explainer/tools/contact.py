#!/usr/bin/env python3
"""contact.png: one frame per story beat (TIMELINE.keyBeats) extracted from the rendered master, labelled with time."""
import json, subprocess, sys, tempfile
from pathlib import Path
video, out = sys.argv[1], sys.argv[2]
T = json.loads(subprocess.run(["node", "-e", "const T=require('./src/timeline.js');console.log(JSON.stringify({spb:T.spb,k:T.keyBeats,sc:T.scenes}))"],
                              capture_output=True, text=True, check=True).stdout)
tmp = Path(tempfile.mkdtemp())
tiles = []
for i, b in enumerate(T["k"]):
    t = b * T["spb"]
    sc = next(s for s in T["sc"] if s["from"] <= b < s["to"])
    f = tmp / f"{i:02d}.png"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", video, "-frames:v", "1", "-vf", "scale=640:-2", str(f)], check=True)
    lab = tmp / f"{i:02d}l.png"
    subprocess.run(["convert", str(f), "-gravity", "north", "-background", "#1C1A17", "-splice", "0x30", "-fill", "#F3EFE6",
                    "-font", "DejaVu-Sans-Mono", "-pointsize", "18", "-annotate", "+0+5", f"{sc['id']} {sc['part']}  {t:5.2f}s", str(lab)], check=True)
    tiles.append(str(lab))
subprocess.run(["montage", *tiles, "-tile", "4x", "-geometry", "+6+6", "-background", "#C9C0AF", out], check=True)
print(out, len(tiles), "frames")
