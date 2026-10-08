#!/usr/bin/env python3
"""しっぽり明朝を作品で使う文字だけに絞り、public/fonts に置く（1書体 約9MB → 数十KB）。

  python3 scripts/subset_font.py

文字の収集元: data/shots.json（字幕・タイトル・仮編集スレートの説明文）、src/data/credits.json、
src/components/*.tsx の日本語、および英数字・記号。
"""
import json
import re
from pathlib import Path

from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
PKG = ROOT / "node_modules" / "@expo-google-fonts" / "shippori-mincho"
WEIGHTS = {"400": PKG / "400Regular" / "ShipporiMincho_400Regular.ttf",
           "500": PKG / "500Medium" / "ShipporiMincho_500Medium.ttf"}


def collect():
    chars = set(chr(c) for c in range(0x20, 0x7F))
    chars |= set("、。・「」『』（）〜—–…：　ー々〇●○◇")
    for p in [ROOT / "data" / "shots.json", ROOT / "src" / "data" / "credits.json"]:
        if p.exists():
            chars |= set(p.read_text())
    for p in (ROOT / "src").rglob("*.tsx"):
        chars |= set(re.sub(r"[\x00-\x1f]", "", p.read_text()))
    return "".join(sorted(c for c in chars if c.isprintable()))


def main():
    text = collect()
    out_dir = ROOT / "public" / "fonts"
    out_dir.mkdir(parents=True, exist_ok=True)
    for w, src in WEIGHTS.items():
        dst = out_dir / f"ShipporiMincho-{w}-subset.ttf"
        opts = subset.Options()
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        font = subset.load_font(str(src), opts)
        s = subset.Subsetter(opts)
        s.populate(text=text)
        s.subset(font)
        subset.save_font(font, str(dst), opts)
        print(f"{dst.name}: {dst.stat().st_size // 1024} KB ({len(text)} chars)")
    lic = PKG / "LICENSE_FONT"
    if lic.exists():
        (out_dir / "OFL-ShipporiMincho.txt").write_text(lic.read_text())


if __name__ == "__main__":
    main()
