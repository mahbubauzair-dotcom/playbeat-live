#!/usr/bin/env python3
"""Inspect the stream catalog to hand-pick hero/featured channels and check category coverage."""
import json, sys

CAT = json.load(open("/home/z/my-project/src/data/stream-catalog.json"))
channels = CAT["channels"]
print(f"channels={len(channels)}  categories={len(CAT['categories'])}  countries={len(CAT['countries'])}")
print("category ids:", sorted(c["id"] for c in CAT["categories"]))

counts = {}
for ch in channels:
    for c in ch["cats"]:
        counts[c] = counts.get(c, 0) + 1
top = sorted(counts.items(), key=lambda kv: -kv[1])
print("\ncategory counts (top 20):", top[:20])

def find(*needles, require_logo=True, limit=8):
    out = []
    for ch in channels:
        n = ch["name"].lower()
        if any(nd.lower() in n for nd in needles):
            if require_logo and not ch["logo"]:
                continue
            out.append(ch)
    out.sort(key=lambda c: -(c["srcs"][0]["q"] if c["srcs"] else 0))
    return out[:limit]

CANDIDATES = [
    ("NASA", ["nasa"]),
    ("Bloomberg", ["bloomberg"]),
    ("DW", ["dw ", "deutsche welle"]),
    ("France24", ["france 24", "france24"]),
    ("AlJazeera", ["al jazeera", "aljazeera"]),
    ("RedBull", ["red bull"]),
    ("Tastemade", ["tastemade"]),
    ("FashionTV", ["fashion tv"]),
    ("Euronews", ["euronews"]),
    ("TRT", ["trt world"]),
    ("CNA", ["channel news asia", "cna"]),
    ("Vevo", ["vevo"]),
    ("MTV", ["mtv"]),
    ("CartoonNetwork", ["cartoon"]),
    ("Nick", ["nick"]),
    ("ABC news", ["abc news"]),
    ("NBC", ["nbc news"]),
    ("CBS", ["cbs news"]),
    ("SkyNews", ["sky news"]),
    ("Bloomberg flagship", ["bloomberg tv"]),
]

print("\n--- candidates ---")
for label, needles in CANDIDATES:
    hits = find(*needles, limit=4)
    print(f"\n[{label}] {len(hits)} hits")
    for ch in hits:
        q = ch["srcs"][0]["q"] if ch["srcs"] else 0
        print(f"  id={ch['id']!r} name={ch['name']!r} country={ch['country']} cats={ch['cats']} q={q} srcs={len(ch['srcs'])} logo={'Y' if ch['logo'] else 'N'}")
