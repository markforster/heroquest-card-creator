"""Generate a white alpha mask from the bordered frame image.

Usage:
  python scripts/generate-border-mask.py \
    --input src/assets/card-backgrounds/bordered.png \
    --output src/assets/card-backgrounds/bordered-mask.png
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def build_mask(input_path: Path, output_path: Path) -> None:
    img = Image.open(input_path).convert("RGBA")
    _, _, _, alpha = img.split()
    white = Image.new("RGBA", img.size, (255, 255, 255, 0))
    white.putalpha(alpha)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    white.save(output_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a white alpha mask from a border PNG")
    parser.add_argument("--input", required=True, type=Path, help="Source bordered PNG")
    parser.add_argument("--output", required=True, type=Path, help="Output mask PNG")
    args = parser.parse_args()

    build_mask(args.input, args.output)


if __name__ == "__main__":
    main()
