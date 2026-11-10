#!/usr/bin/env python3
"""PlayBeat TV → NEXA re-skin: bulk color token replacement."""
import re
from pathlib import Path

ROOT = Path("/home/z/my-project/src")

# old dark-blue/neon hexes → NEXA neutral surfaces
HEX_MAP = {
    "#07070f": "#0c0c0e",
    "#0b0819": "#101013",
    "#0a0a15": "#101013",
    "#0d0d1c": "#141416",
    "#0b0810": "#0c0c0e",
    "#101020": "#141416",
    "#101a2e": "#141416",
    "#080f1f": "#0c0c0e",
    "#0a2540": "#1b1b1e",
    "#0d3a5c": "#242428",
    "#0d4a3a": "#242428",
    "#3a2060": "#242428",
    "#5c1f2c": "#242428",
    "#4a1f30": "#242428",
    "#4a2a10": "#242428",
    "#1e2a5c": "#242428",
    "#14352c": "#242428",
    "#2a1a4a": "#242428",
    "#1a2440": "#1b1b1e",
    "#0d2b1e": "#141416",
    "#0b1428": "#141416",
    "#0b1520": "#141416",
    "#1c0b12": "#141416",
    "#241703": "#ffffff",
    "#080F1F": "#0c0c0e",
}

# gradient CTA class groups → solid accent
GRADIENT_MAP = [
    (r"bg-gradient-to-\w+ from-amber-300 to-yellow-500", "bg-theme"),
    (r"bg-gradient-to-\w+ from-amber-300 to-yellow-400", "bg-theme"),
    (r"bg-gradient-to-\w+ from-\[#FFD76A\] via-\[#FFBD36\] to-\[#F0A323\]", "bg-theme"),
    (r"bg-gradient-to-\w+ from-\[#FFD76A\] via-\[#FFBD36\] to-\[#F0A323\]", "bg-theme"),
    (r"bg-gradient-to-\w+ from-amber-300 to-yellow-500 bg-clip-text", "bg-theme"),
    (r"from-amber-400/\[0\.08\]", "from-theme/10"),
    (r"via-\[#F0A323\]", ""),
]

# amber-*/yellow-* class families → theme
CLASS_MAP = [
    (r"border-amber-400/(\d+)", r"border-theme/\1"),
    (r"border-amber-400", "border-theme/40"),
    (r"border-amber-200/(\d+)", r"border-theme/\1"),
    (r"ring-amber-400/(\d+)", r"ring-theme/\1"),
    (r"ring-amber-200/(\d+)", r"ring-theme/\1"),
    (r"ring-amber-200", "ring-theme/40"),
    (r"shadow-amber-\d00/\d+", "shadow-theme/25"),
    (r"bg-amber-400/(\d+)", r"bg-theme/\1"),
    (r"bg-amber-400", "bg-theme"),
    (r"bg-amber-300", "bg-theme"),
    (r"text-amber-\d00", "text-theme"),
    (r"fill-amber-\d00", "fill-theme"),
    (r"outline-amber-\d00", "outline-theme"),
    (r"text-zinc-950", "text-white"),
    (r"hover:text-amber-\d00", "hover:text-theme"),
]

# amber-tinted radial glows → neutral white glow
RGBA_MAP = [
    (r"rgba\(251, ?191, ?36, ?0\.1[46]\)", "rgba(255,255,255,0.07)"),
    (r"rgba\(255, ?189, ?54, ?0\.\d+\)", "var(--theme-glow)"),
]

files = sorted(ROOT.rglob("*.tsx")) + sorted(ROOT.rglob("*.ts"))
# skip the ui primitives (shadcn) — they use semantic vars already
files = [f for f in files if "/stream/" in str(f) or "/app/" in str(f)]
changed = {}
for f in files:
    src = f.read_text()
    out = src
    for old, new in HEX_MAP.items():
        out = re.sub(re.escape(old), new, out, flags=re.IGNORECASE)
    for pat, rep in GRADIENT_MAP:
        out = re.sub(pat, rep, out)
    for pat, rep in CLASS_MAP:
        out = re.sub(pat, rep, out)
    for pat, rep in RGBA_MAP:
        out = re.sub(pat, rep, out)
    if out != src:
        f.write_text(out)
        n = sum(1 for a, b in zip(src.split("\n"), out.split("\n")) if a != b)
        changed[str(f).replace(str(ROOT) + "/", "")] = n

for k, v in changed.items():
    print(f"  {k}: {v} lines")
print(f"\n{len(changed)} files re-skinned")

# sanity: no amber left in stream components
left = 0
for f in sorted((ROOT / "components/stream").glob("*.tsx")):
    txt = f.read_text()
    hits = re.findall(r"amber-\d00", txt)
    if hits:
        print(f"  LEFTOVER {f.name}: {len(hits)} amber refs")
        left += len(hits)
print(f"amber leftovers: {left}")
