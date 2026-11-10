#!/usr/bin/env python3
"""Generate all logo/brand assets for stream.playbeattv.buzz from the uploaded
Stream PlayBeat TV logo (neon red-pink-purple S mark + cyan orbit, black bg).

Outputs into /home/z/my-project/stream-site/public/:
  logo.png            full transparent logo (wordmark incl.), width ~820
  logo-mark.png       square transparent S-mark, 512x512
  icon-192.png        192x192 mark (transparent)
  icon-512.png        512x512 mark (transparent)
  apple-touch-icon.png 180x180 mark on black (iOS needs opaque)
  favicon.ico         16/32/48 multi-size
  og.png              1200x630 social card
"""

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np
import os

SRC = "/home/z/my-project/upload/streamplaybeattv.png"
OUT = "/home/z/my-project/stream-site/public"
os.makedirs(OUT, exist_ok=True)

# ---------- 1. load + black->alpha unpremultiply (floor-suppressed) ----------
FLOOR = 36.0
im = Image.open(SRC).convert("RGB")
W, H = im.size
arr = np.asarray(im).astype(np.float32)
mx = arr.max(axis=2)
alpha = np.clip((mx - FLOOR) / (255.0 - FLOOR), 0, 1) ** 0.9 * 255.0
with np.errstate(divide="ignore", invalid="ignore"):
    un = np.where(mx[..., None] > 0, arr / np.maximum(mx[..., None], 1) * 255.0, 0)
rgba = np.dstack([np.clip(un, 0, 255), alpha]).astype(np.uint8)
logo = Image.fromarray(rgba)

# soft threshold: kill near-invisible noise
a = np.asarray(logo).copy()
a[..., 3] = np.where(a[..., 3] < 8, 0, a[..., 3])
logo = Image.fromarray(a, "RGBA")

# ---------- 2. trim full logo ----------
bbox = logo.getbbox()
full = logo.crop(bbox)
fw, fh = full.size
print(f"src {W}x{H}  trimmed full logo {fw}x{fh}")

target_w = 820
full_r = full.resize((target_w, round(fh * target_w / fw)), Image.LANCZOS)
full_r.save(f"{OUT}/logo.png")

# ---------- 3. S-mark square crop (bright region, keep S centered) ----------
arr_top = np.asarray(logo)[: int(H * 0.635)]
bright = arr_top[:, :, 3] > 140
ys, xs = np.nonzero(bright)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
print(f"mark bright bbox: x {x0}-{x1}  y {y0}-{y1}")

CUT = 708  # wordmark white letters start at y≈716; stay safely above
mw, mh = x1 - x0, y1 - y0
cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
side = max(mw, mh)
side = min(side, 2 * (CUT - cy))  # never reach the wordmark
# crop with transparent padding canvas so edges never clip
pad = 60
canvas = Image.new("RGBA", (W + 2 * pad, H + 2 * pad), (0, 0, 0, 0))
canvas.paste(logo, (pad, pad))
crop = canvas.crop((cx - side // 2 + pad, cy - side // 2 + pad, cx + side // 2 + pad, cy + side // 2 + pad))
mark = crop.resize((512, 512), Image.LANCZOS)
mark.save(f"{OUT}/logo-mark.png")
mark.resize((192, 192), Image.LANCZOS).save(f"{OUT}/icon-192.png")
mark.save(f"{OUT}/icon-512.png")

# ---------- 4. apple-touch-icon (opaque black bg) ----------
apple = Image.new("RGB", (180, 180), (0, 0, 0))
mk = mark.resize((150, 150), Image.LANCZOS)
apple.paste(mk, (15, 15), mk)
apple.save(f"{OUT}/apple-touch-icon.png")

# ---------- 5. favicon.ico ----------
mark.resize((256, 256), Image.LANCZOS).save(
    f"{OUT}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)]
)

# ---------- 6. OG image 1200x630 ----------
OW, OH = 1200, 630
og = Image.new("RGB", (OW, OH), (6, 6, 12))
d = ImageDraw.Draw(og)
# vertical gradient base
for y in range(OH):
    t = y / OH
    d.line([(0, y), (OW, y)], fill=(round(6 + 8 * t), round(6 + 4 * t), round(12 + 18 * t)))
# neon glows
glow = Image.new("RGB", (OW, OH), (0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse((-220, -260, 420, 260), fill=(70, 8, 60))      # fuchsia top-left
gd.ellipse((760, 380, 1420, 900), fill=(45, 10, 90))      # purple bottom-right
gd.ellipse((520, -300, 1100, 160), fill=(8, 40, 80))      # cyan top-right
glow = glow.filter(ImageFilter.GaussianBlur(120))
og = Image.fromarray(np.clip(np.asarray(og).astype(np.float32) + np.asarray(glow).astype(np.float32), 0, 255).astype(np.uint8))
d = ImageDraw.Draw(og)

# logo on the left (opaque original crop, black blends into og bg)
op = Image.open(SRC).convert("RGBA")
op_arr = np.asarray(op).copy()
op_arr[..., 3] = np.where(op_arr[..., :3].max(axis=2) < 10, 0, 255).astype(np.uint8)
op = Image.fromarray(op_arr)
lg_h = 400
lg_w = round(op.size[0] * lg_h / op.size[1])
lg = op.resize((lg_w, lg_h), Image.LANCZOS)
# feathered rounded mask so the black rectangle blends into the og bg
m = Image.new("L", (lg_w, lg_h), 0)
md = ImageDraw.Draw(m)
md.rounded_rectangle((10, 10, lg_w - 10, lg_h - 10), radius=46, fill=255)
m = m.filter(ImageFilter.GaussianBlur(18))
og.paste(lg, (48, (OH - lg_h) // 2 - 8), m)

FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
f_word = ImageFont.truetype(FB, 36)
f_big = ImageFont.truetype(FB, 46)
f_sm = ImageFont.truetype(FR, 23)
f_url = ImageFont.truetype(FB, 26)

tx = 48 + lg_w + 52
# wordmark row: STREAM (white) PLAYBEAT (gradient letters) [TV] badge
wy = 118
x = tx
for ch in "STREAM ":
    d.text((x, wy), ch, font=f_word, fill=(255, 255, 255))
    x += d.textlength(ch, font=f_word)
grad = [(255, 61, 94), (255, 47, 150), (200, 60, 220), (168, 85, 247)]
word = "PLAYBEAT"
cw = [d.textlength(c, font=f_word) for c in word]
total = sum(cw)
for i, c in enumerate(word):
    t = i / max(len(word) - 1, 1)
    c1, c2 = grad[min(int(t * (len(grad) - 1)), len(grad) - 2)], grad[min(int(t * (len(grad) - 1)) + 1, len(grad) - 1)]
    lt = t * (len(grad) - 1) % 1
    col = tuple(round(a + (b - a) * lt) for a, b in zip(c1, c2))
    d.text((x, wy), c, font=f_word, fill=col)
    x += cw[i]
# TV badge
x += 14
bw, bh = 78, 54
by = wy + 4
for i in range(3):  # pseudo gradient border via concentric rounded rects
    col = grad[i]
    d.rounded_rectangle((x - i, by - i, x + bw + i, by + bh + i), radius=12, outline=col, width=2)
d.rounded_rectangle((x, by, x + bw, by + bh), radius=12, fill=(8, 6, 14))
tw = d.textlength("TV", font=f_word)
d.text((x + (bw - tw) / 2, by + 4), "TV", font=f_word, fill=(255, 255, 255))

# headline
hy = 242
d.text((tx, hy), "4,819+ FREE LIVE", font=f_big, fill=(255, 255, 255))
d.text((tx, hy + 58), "TV CHANNELS", font=f_big, fill=(255, 255, 255))
d.text((tx, hy + 130), "166 countries · news, sports, movies", font=f_sm, fill=(168, 162, 190))
d.text((tx, hy + 166), "100% open sources · no signup", font=f_sm, fill=(168, 162, 190))
# url pill
py = hy + 232
uw0 = d.textlength("stream.playbeattv.buzz", font=f_url)
pw, ph = round(uw0) + 52, 58
for i in range(3):
    col = grad[i]
    d.rounded_rectangle((tx - i, py - i, tx + pw + i, py + ph + i), radius=31, outline=col, width=2)
d.rounded_rectangle((tx, py, tx + pw, py + ph), radius=29, fill=(10, 8, 18))
d.text((tx + (pw - uw0) / 2, py + 13), "stream.playbeattv.buzz", font=f_url, fill=(255, 255, 255))

og.save(f"{OUT}/og.png")

# ---------- summary ----------
for f in sorted(os.listdir(OUT)):
    p = os.path.join(OUT, f)
    if os.path.isfile(p):
        print(f"{f:24s} {os.path.getsize(p):>9,} bytes")
print("DONE")
