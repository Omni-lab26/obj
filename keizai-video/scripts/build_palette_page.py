"""Builds palettes/index.html (the colour reference page) from src/talk/palettes.json.

    python scripts/build_palette_page.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
data = json.loads((ROOT / "src/talk/palettes.json").read_text())
template = (ROOT / "palettes/template.html").read_text()
(ROOT / "palettes/index.html").write_text(
    template.replace("/*PALETTES*/[]", json.dumps(data, ensure_ascii=False))
)
print(f"wrote palettes/index.html with {len(data)} palettes")
