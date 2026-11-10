#!/usr/bin/env python3
"""Generate PlayBeat TV PWA icon set from the existing brand logo mark.

Outputs (public/icons/):
- pwa-192.png / pwa-512.png          any-purpose icons (navy tile, subtle vignette)
- pwa-maskable-192.png / -512.png    maskable icons (logo in 80% safe zone)
- apple-touch-icon.png               180x180, opaque navy (iOS rounds it itself)
"""
from PIL import Image, ImageDraw, ImageOps

SRC = "/home/z/my-project/public/brand/logo-mark-512.png"
OUT = "/home/z/my-project/public/icons"
NAVY = (8, 15, 31)  # #080F1F

import os
os.makedirs(OUT, exist_ok=True)

logo = Image.open(SRC).convert("RGBA")

def rounded_tile(size: int, radius_ratio: float) -> Image.Image:
    """Navy rounded-corner tile with a soft radial glow, logo centered."""
    tile = Image.new("RGBA", (size, size), NAVY + (255,))
    # soft amber-tinted radial glow behind the logo (premium look)
    glow = Image.new("L", (size, size), 0)
    gd = ImageDraw.Draw(glow)
    cx = cy = size // 2
    r = int(size * 0.42)
    gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=46)
    glow = glow.filter(__import__("PIL.ImageFilter", fromlist=["GaussianBlur"]).GaussianBlur(size * 0.10))
    amber = Image.new("RGBA", (size, size), (245, 158, 11, 255))  # amber-500
    tile.paste(amber, (0, 0), glow)
    # rounded-corner mask
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=255)
    bg = Image.new("RGBA", (size, size), NAVY + (255,))
    tile = Image.composite(tile, bg, mask)
    return tile

def stamp(tile: Image.Image, scale: float) -> Image.Image:
    size = tile.size[0]
    logo_size = int(size * scale)
    lg = logo.resize((logo_size, logo_size), Image.LANCZOS)
    # feather the logo's own square background so it melts into the tile:
    # rounded-rect mask, slightly inset, blurred — edges fade out softly
    feather = Image.new("L", (logo_size, logo_size), 0)
    fd = ImageDraw.Draw(feather)
    inset = max(2, int(logo_size * 0.04))
    fd.rounded_rectangle(
        [inset, inset, logo_size - inset, logo_size - inset],
        radius=int(logo_size * 0.18),
        fill=255,
    )
    feather = feather.filter(__import__("PIL.ImageFilter", fromlist=["GaussianBlur"]).GaussianBlur(logo_size * 0.05))
    off = (size - logo_size) // 2
    tile.paste(lg, (off, off), feather)
    return tile

# --- any-purpose icons: logo large on rounded navy tile ---
for s in (192, 512):
    stamp(rounded_tile(s, 0.22), 0.88).convert("RGB").save(f"{OUT}/pwa-{s}.png", optimize=True)
    print(f"pwa-{s}.png done")

# --- maskable icons: full-bleed navy square, logo in 80% safe zone ---
for s in (192, 512):
    tile = Image.new("RGBA", (s, s), NAVY + (255,))
    stamp(tile, 0.70).convert("RGB").save(f"{OUT}/pwa-maskable-{s}.png", optimize=True)
    print(f"pwa-maskable-{s}.png done")

# --- apple touch icon: 180, opaque navy, logo at 84% ---
stamp(rounded_tile(180, 0.22), 0.84).convert("RGB").save(f"{OUT}/apple-touch-icon.png", optimize=True)
print("apple-touch-icon.png done")

# report sizes
for f in sorted(os.listdir(OUT)):
    print(f, os.path.getsize(f"{OUT}/{f}") // 1024, "KB")
