#!/usr/bin/env python3
"""Process the uploaded PlayBeat TV logo into web assets.

Outputs (all under public/brand/):
- logo-mark.png  : square crop of the "D + play" icon (navbar / favicon)
- logo-mark-512.png : 512px downscaled mark (favicon/apple-touch)
- logo-full.png  : full lockup (icon + PLAYBEAT TV wordmark) for OG / about
"""
from PIL import Image
import os

SRC = "/home/z/my-project/upload/pb tv logo.png"
OUT_DIR = "/home/z/my-project/public/brand"
os.makedirs(OUT_DIR, exist_ok=True)

img = Image.open(SRC).convert("RGB")
W, H = img.size
print(f"source: {W}x{H}")

def clamp(v, lo, hi):
    return max(lo, min(hi, v))

# Manual crops tuned to the 1254x1254 source layout:
#   icon "D + play + waves"  : x ~400..845, y ~250..730
#   wordmark "PLAYBEAT TV"   : x ~90..1160, y ~755..900
assert W == H, "unexpected source aspect"

MARK = (362, 230, 882, 750)     # square around icon w/ margin
FULL = (60, 230, 1190, 935)     # icon + wordmark + glow

mark = img.crop(MARK)
side = mark.size[0]
mark.save(f"{OUT_DIR}/logo-mark.png", optimize=True)
print(f"logo-mark.png: {side}x{side}")

mark512 = mark.resize((512, 512), Image.LANCZOS)
mark512.save(f"{OUT_DIR}/logo-mark-512.png", optimize=True)

full = img.crop(FULL)
fw, fh = full.size
full.save(f"{OUT_DIR}/logo-full.png", optimize=True)
print(f"logo-full.png: {fw}x{fh}")
