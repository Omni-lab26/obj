#!/usr/bin/env python3
"""General-flash check (WCAG 2.3.1 style) on a rendered video.
A flash = a pair of opposing changes in relative luminance of >= 0.10 where the darker state is < 0.80.
Checked on the whole frame and on each cell of a 4x4 grid; fails if any 1-second window has more than 3 flashes.
  python3 tools/flash.py out/master_16x9.mp4"""
import subprocess, sys
import numpy as np
path = sys.argv[1]
W, H = 64, 36
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={W}:{H}:flags=area,format=rgb24", "-f", "rawvideo", "-"],
                     capture_output=True, check=True).stdout
fps = float(eval(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries", "stream=r_frame_rate",
                                  "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip()))
f = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(np.float64) / 255
lin = np.where(f <= 0.04045, f / 12.92, ((f + 0.055) / 1.055) ** 2.4)
L = 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]
regions = {"frame": L.mean(axis=(1, 2))}
for i in range(4):
    for j in range(4):
        regions[f"cell{i}{j}"] = L[:, i * H // 4:(i + 1) * H // 4, j * W // 4:(j + 1) * W // 4].mean(axis=(1, 2))
worst = 0
for name, s in regions.items():
    # find extrema-to-extrema transitions
    events = []
    last_ext, direction = s[0], 0
    for k in range(1, len(s)):
        d = s[k] - last_ext
        if abs(d) >= 0.10 and min(s[k], last_ext) < 0.80:
            nd = 1 if d > 0 else -1
            if nd != direction:
                events.append(k)
                direction = nd
            last_ext = s[k]
        elif (direction >= 0 and s[k] > last_ext) or (direction <= 0 and s[k] < last_ext):
            last_ext = s[k]
    flashes = [events[i] for i in range(1, len(events))]  # each opposing pair
    w = int(round(fps))
    peak = max((sum(1 for e in flashes if t <= e < t + w) for t in range(0, len(s), max(1, w // 4))), default=0) // 1
    worst = max(worst, peak)
print(f"{path}: {len(s)} frames, max flashes in any 1 s window (any region) = {worst} → {'ok' if worst <= 3 else 'FAIL'}")
sys.exit(0 if worst <= 3 else 1)
