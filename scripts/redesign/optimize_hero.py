#!/usr/bin/env python3
"""Convert generated hero PNGs to optimized webp for production use."""
from PIL import Image
from pathlib import Path

SRC = Path("/home/z/my-project/public/hero/redesign")
for png in sorted(SRC.glob("hero-*.png")):
    webp = png.with_suffix(".webp")
    im = Image.open(png).convert("RGB")
    im.save(webp, "WEBP", quality=82, method=6)
    print(f"{png.name} {png.stat().st_size//1024}KB -> {webp.name} {webp.stat().st_size//1024}KB")
