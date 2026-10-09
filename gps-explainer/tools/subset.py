#!/usr/bin/env python3
"""Subset IBM Plex Sans JP / IBM Plex Mono to the characters the film uses (src/*.js, directions/*.html)."""
import re
from pathlib import Path
from fontTools import subset
ROOT = Path(__file__).resolve().parent.parent
NM = ROOT / "node_modules" / "@expo-google-fonts"
FACES = {
    "IBMPlexSansJP-400.ttf": NM / "ibm-plex-sans-jp/400Regular/IBMPlexSansJP_400Regular.ttf",
    "IBMPlexSansJP-500.ttf": NM / "ibm-plex-sans-jp/500Medium/IBMPlexSansJP_500Medium.ttf",
    "IBMPlexSansJP-600.ttf": NM / "ibm-plex-sans-jp/600SemiBold/IBMPlexSansJP_600SemiBold.ttf",
    "IBMPlexMono-500.ttf": NM / "ibm-plex-mono/500Medium/IBMPlexMono_500Medium.ttf",
}
chars = set(chr(c) for c in range(0x20, 0x7F)) | set("、。・「」『』（）？！＝＋×→…ー々")
for p in list((ROOT / "src").glob("*.js")) + list((ROOT / "directions").glob("*.html")):
    chars |= set(p.read_text())
text = "".join(sorted(c for c in chars if c.isprintable()))
out = ROOT / "fonts"
out.mkdir(exist_ok=True)
for name, src in FACES.items():
    o = subset.Options(); o.layout_features = ["*"]; o.notdef_outline = True
    f = subset.load_font(str(src), o); s = subset.Subsetter(o); s.populate(text=text); s.subset(f)
    subset.save_font(f, str(out / name), o)
    print(name, (out / name).stat().st_size // 1024, "KB")
for lic in ["ibm-plex-sans-jp", "ibm-plex-mono"]:
    (out / f"OFL-{lic}.txt").write_text((NM / lic / "LICENSE_FONT").read_text())
