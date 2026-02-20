#!/usr/bin/env python3
"""Generate text-based dice face SVG masks (256x256) for CD/AD/DD/MD."""
from pathlib import Path

SIZE = 256
FONT_FAMILY = "HeroQuest"
FONT_SIZE = 112
Y_OFFSET = 6

FACES = ["CD", "AD", "DD", "MD"]
OUT_DIR = Path("src/assets/dice")
OUT_DIR.mkdir(parents=True, exist_ok=True)

for face in FACES:
    svg = f"""<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{SIZE}\" height=\"{SIZE}\" viewBox=\"0 0 {SIZE} {SIZE}\">
  <text x=\"128\" y=\"{128 + Y_OFFSET}\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"{FONT_FAMILY}\" font-size=\"{FONT_SIZE}\" fill=\"#ffffff\" letter-spacing=\"2\">{face}</text>
</svg>
"""
    out_path = OUT_DIR / f"combat_{face.lower()}.svg"
    out_path.write_text(svg, encoding="utf-8")

print(f"Wrote {len(FACES)} SVGs to {OUT_DIR}")
