#!/usr/bin/env python3
"""
Build a slim, copyright-safe stream catalog from the iptv-org open-source API.

Pipeline:
1. Load channels / streams / countries / categories from cached API dumps.
2. Keep only HTTPS + .m3u8 streams (browser-playable, no mixed content).
3. Exclude streams requiring custom user-agent / referrer headers (impossible for <video>).
4. Exclude NSFW channels, closed channels, and channels with no playable stream.
5. Slim fields, prefer best quality (max 2 sources per channel), attach best logo.
6. Write to src/data/stream-catalog.json AND public/data/stream-catalog.json.
"""
import json
import os
import re
from collections import defaultdict
from datetime import datetime, timezone

CACHE = os.path.join(os.path.dirname(__file__), "iptv_cache")
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_PATHS = [os.path.join(ROOT, "src/data/stream-catalog.json"), os.path.join(ROOT, "public/data/stream-catalog.json")]
MAX_SOURCES = 2

M3U8_RE = re.compile(r"\.m3u8(\?|$)", re.IGNORECASE)


def load(name):
    with open(os.path.join(CACHE, f"{name}.json"), encoding="utf-8") as f:
        return json.load(f)


def quality_num(q):
    if not q:
        return 0
    m = re.match(r"(\d+)", str(q))
    return int(m.group(1)) if m else 0


def main():
    channels = load("channels")
    streams = load("streams")
    countries = load("countries")
    categories = load("categories")
    logos = load("logos")
    try:
        blocks = {b.get("channel") for b in load("blocks") if b.get("channel")}
    except FileNotFoundError:
        blocks = set()

    # best channel-level logo per channel: in_use first, then largest width, https only
    logo_by_channel = {}
    for lg in logos:
        cid = lg.get("channel")
        url = lg.get("url") or ""
        if not cid or not url.startswith("https://"):
            continue
        if lg.get("feed"):  # prefer channel-level logos, not feed-specific
            continue
        score = (1 if lg.get("in_use") else 0, lg.get("width") or 0)
        if cid not in logo_by_channel or score > logo_by_channel[cid][0]:
            logo_by_channel[cid] = (score, url)

    # ---- 2. collect playable https-m3u8 streams per channel ----
    by_channel = defaultdict(list)
    skipped_http = 0
    skipped_non_m3u8 = 0
    skipped_blocked = 0
    for s in streams:
        url = s.get("url") or ""
        if not s.get("channel"):
            continue
        if s.get("user_agent") or s.get("referrer"):
            skipped_blocked += 1  # header-gated streams cannot play in a browser
            continue
        if not url.startswith("https://"):
            skipped_http += 1
            continue
        if not M3U8_RE.search(url):
            skipped_non_m3u8 += 1
            continue
        by_channel[s["channel"]].append(
            {"url": url, "q": quality_num(s.get("quality"))}
        )

    country_meta = {
        c["code"]: {"name": c["name"], "flag": c.get("flag", "")}
        for c in countries
    }
    category_meta = {c["id"]: c["name"] for c in categories}

    # ---- 3. filter channels ----
    items = []
    for ch in channels:
        cid = ch["id"]
        if cid in blocks:
            continue
        if ch.get("is_nsfw"):
            continue
        if ch.get("closed"):  # channel shut down
            continue
        srcs = by_channel.get(cid)
        if not srcs:
            continue
        # dedupe by URL, best quality first, cap sources
        seen = set()
        uniq = []
        for s in sorted(srcs, key=lambda x: -x["q"]):
            if s["url"] in seen:
                continue
            seen.add(s["url"])
            uniq.append(s)
            if len(uniq) >= MAX_SOURCES:
                break
        cats = [c for c in (ch.get("categories") or []) if c in category_meta]
        cm = country_meta.get(ch.get("country"))
        logo = logo_by_channel.get(cid, (None, ""))[1]
        items.append(
            {
                "id": cid,
                "name": ch["name"].strip(),
                "country": ch.get("country") or "",
                "flag": cm["flag"] if cm else "",
                "cats": cats,
                "logo": logo,
                "srcs": [{"u": s["url"], "q": s["q"]} for s in uniq],
            }
        )

    items.sort(key=lambda x: x["name"].lower())

    # ---- 4. referenced countries / categories ----
    used_countries = sorted({i["country"] for i in items if i["country"]})
    used_categories = sorted({c for i in items for c in i["cats"]})

    catalog = {
        "meta": {
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source": "iptv-org (open-source index of publicly available free-to-air channels)",
            "sourceUrl": "https://github.com/iptv-org",
            "api": "https://iptv-org.github.io/api/",
            "criteria": [
                "HTTPS .m3u8 streams only (browser-playable)",
                "NSFW channels excluded",
                "Blocked streams excluded (iptv-org blocks.json)",
                "Closed channels excluded",
            ],
            "channels": len(items),
            "countries": len(used_countries),
            "categories": len(used_categories),
        },
        "countries": [
            {"code": c, "name": country_meta[c]["name"], "flag": country_meta[c]["flag"]}
            for c in used_countries
        ],
        "categories": [{"id": c, "name": category_meta[c]} for c in used_categories],
        "channels": items,
    }

    size = len(json.dumps(catalog, ensure_ascii=False))
    for p in OUT_PATHS:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(catalog, f, ensure_ascii=False, separators=(",", ":"))
        print(f"wrote {p} ({os.path.getsize(p)/1e6:.2f} MB)")

    # ---- stats ----
    hd = sum(1 for i in items if any(s["q"] >= 720 for s in i["srcs"]))
    with_logo = sum(1 for i in items if i["logo"])
    print(
        f"channels={len(items)} countries={len(used_countries)} "
        f"categories={len(used_categories)} hd={hd} with_logo={with_logo} "
        f"json={size/1e6:.2f}MB"
    )
    print(
        f"skipped: http={skipped_http} non_m3u8={skipped_non_m3u8} blocked={skipped_blocked}"
    )
    # sanity: sample a few
    for i in items[:5]:
        print(" ", i["name"], "|", i["country"], "|", i["cats"])


if __name__ == "__main__":
    main()
