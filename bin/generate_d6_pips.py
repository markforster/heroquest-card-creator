#!/usr/bin/env python3
"""Generate simple D6 pip SVG masks (256x256) with black pips on transparent bg."""
from pathlib import Path

SIZE = 256
R = 22
# grid positions (x, y)
P = {
    "tl": (64, 64),
    "tr": (192, 64),
    "ml": (64, 128),
    "mr": (192, 128),
    "bl": (64, 192),
    "br": (192, 192),
    "c": (128, 128),
}

FACES = {
    1: ["c"],
    2: ["tl", "br"],
    3: ["tl", "c", "br"],
    4: ["tl", "tr", "bl", "br"],
    5: ["tl", "tr", "c", "bl", "br"],
    6: ["tl", "ml", "bl", "tr", "mr", "br"],
}

OUT_DIR = Path("src/assets/dice")
OUT_DIR.mkdir(parents=True, exist_ok=True)

SVG_HEADER = f"""<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{SIZE}\" height=\"{SIZE}\" viewBox=\"0 0 {SIZE} {SIZE}\">\n"""
SVG_FOOTER = "</svg>\n"

for face, dots in FACES.items():
    circles = []
    for key in dots:
        x, y = P[key]
        circles.append(f"  <circle cx=\"{x}\" cy=\"{y}\" r=\"{R}\" fill=\"#ffffff\" />\n")
    svg = SVG_HEADER + "".join(circles) + SVG_FOOTER
    out_path = OUT_DIR / f"d6_pips_{face}.svg"
    out_path.write_text(svg, encoding="utf-8")

print(f"Wrote {len(FACES)} SVGs to {OUT_DIR}")
