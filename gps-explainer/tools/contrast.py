#!/usr/bin/env python3
"""WCAG 2.x contrast check for every text color pair declared in brand/tokens.json.

  python3 tools/contrast.py        # exits 1 if any pair is below 4.5:1
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def lum(hex_color):
    h = hex_color.lstrip("#")
    rgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def ratio(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)


def main():
    tokens = json.loads((ROOT / "brand" / "tokens.json").read_text())
    c = tokens["color"]
    worst = 99
    for fg, bg in tokens["text_pairs"]:
        r = ratio(c[fg], c[bg])
        worst = min(worst, r)
        print(f"{fg:>12} on {bg:<12} {r:5.2f}:1  {'ok' if r >= 4.5 else 'FAIL'}")
    sys.exit(0 if worst >= 4.5 else 1)


if __name__ == "__main__":
    main()
