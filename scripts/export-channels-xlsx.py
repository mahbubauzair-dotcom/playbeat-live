#!/usr/bin/env python3
"""
Playbeat TV — channel catalog export to .xlsx
Sheet 1 "Summary": key catalog stats + top countries
Sheet 2 "Channels": one row per healthy source — Channel Name | Country | Category | Quality | Source # | Source URL
Data: src/data/stream-catalog.json (health-verified Oct 14, 2026)
"""
import json
import sys
import os
from datetime import datetime, timezone

SKILL = "/home/z/my-project/skills/xlsx"
for sub in [SKILL, os.path.join(SKILL, "templates")]:
    if sub not in sys.path:
        sys.path.insert(0, sub)

from base import (  # noqa: E402
    FONT_NAME, setup_sheet, style_header_row, style_data_row, style_total_row,
    auto_fit_columns, font_body, font_caption, font_subheader,
    align_text, align_number,
)
from openpyxl import Workbook  # noqa: E402
from openpyxl.styles import Font, Alignment  # noqa: E402

CATALOG = "/home/z/my-project/src/data/stream-catalog.json"
OUT = "/home/z/my-project/download/playbeat-tv-channels.xlsx"

catalog = json.load(open(CATALOG))
countries_map = {c["code"]: (c["name"], c.get("flag", "")) for c in catalog["countries"]}
categories_map = {c["id"]: c["name"] for c in catalog["categories"]}


def q_label(q: int) -> str:
    if q >= 1080:
        return "1080p"
    if q >= 720:
        return "HD"
    if q >= 480:
        return "480p"
    if q > 0:
        return f"{q}p"
    return "SD"


rows = []  # (channel_name, country_display, cats_display, quality, src_no, url)
for ch in catalog["channels"]:
    cname = countries_map.get(ch["country"], (ch["country"], ""))[0]
    flag = countries_map.get(ch["country"], ("", ""))[1]
    country_display = f"{flag} {cname}".strip()
    cats_display = ", ".join(categories_map.get(cid, cid) for cid in ch.get("cats", []))
    for i, src in enumerate(ch.get("srcs", []), start=1):
        rows.append([ch["name"], country_display, cats_display, q_label(src.get("q", 0)), f"{i}/{len(ch['srcs'])}", src["u"]])

rows.sort(key=lambda r: (r[1], r[0].lower()))

wb = Workbook()

# ============ Sheet 1: Summary ============
ws = wb.active
ws.title = "Summary"
hc = catalog["meta"].get("healthCheck", {})
checked = hc.get("checkedAt", catalog["meta"].get("generatedAt", ""))
facts = [
    ("Generated", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")),
    ("Working channels", len(catalog["channels"])),
    ("Healthy stream sources", sum(len(ch.get("srcs", [])) for ch in catalog["channels"])),
    ("Countries", len(catalog["countries"])),
    ("Categories", len(catalog["categories"])),
    ("Health check date", checked),
    ("Dead sources pruned in last sweep", hc.get("deadSourcesPruned", "n/a")),
    ("Catalog source", catalog["meta"].get("source", "iptv-org")),
]
last_col_s = 3
setup_sheet(ws, title="Playbeat TV — Channel Catalog", last_col=last_col_s)
ws.cell(row=4, column=2, value="Metric")
ws.cell(row=4, column=3, value="Value")
style_header_row(ws, row_num=4, col_start=2, col_end=last_col_s)
for i, (k, v) in enumerate(facts):
    r = 5 + i
    ws.cell(row=r, column=2, value=k)
    ws.cell(row=r, column=3, value=v)
    style_data_row(ws, row_num=r, col_start=2, col_end=last_col_s, row_index=i)
    ws.cell(row=r, column=3).alignment = align_text() if isinstance(v, str) else align_number()

# Top 15 countries by channel count
top_start = 5 + len(facts) + 2
ws.cell(row=top_start - 1, column=2, value="Top countries by channel count").font = font_subheader()
ws.cell(row=top_start, column=2, value="Country")
ws.cell(row=top_start, column=3, value="Channels")
style_header_row(ws, row_num=top_start, col_start=2, col_end=last_col_s)
per_country = {}
for ch in catalog["channels"]:
    nm = countries_map.get(ch["country"], (ch["country"], ""))[0]
    per_country[nm] = per_country.get(nm, 0) + 1
top = sorted(per_country.items(), key=lambda kv: -kv[1])[:15]
for i, (nm, cnt) in enumerate(top):
    r = top_start + 1 + i
    ws.cell(row=r, column=2, value=nm)
    ws.cell(row=r, column=3, value=cnt)
    style_data_row(ws, row_num=r, col_start=2, col_end=last_col_s, row_index=i)
    ws.cell(row=r, column=3).alignment = align_number()
tr = top_start + 1 + len(top)
ws.cell(row=tr, column=2, value="Other countries")
ws.cell(row=tr, column=3, value=len(catalog["channels"]) - sum(c for _, c in top))
style_total_row(ws, row_num=tr, col_start=2, col_end=last_col_s)
ws.cell(row=tr, column=3).alignment = align_number()
note_r = tr + 2
ws.cell(row=note_r, column=2,
        value="Every listed source answered manifest + playlist + segment probes at the health-check date. Streams are third-party public feeds and can go offline at any time.")
ws.cell(row=note_r, column=2).font = font_caption()
auto_fit_columns(ws, min_width=10, max_width=42, header_row=4, data_start_row=5)

# ============ Sheet 2: Channels (one row per source) ============
ws2 = wb.create_sheet("Channels")
headers = ["Channel Name", "Country", "Category", "Quality", "Source #", "Source URL"]
last_col = len(headers) + 1  # B..G
setup_sheet(ws2, title=f"Working Channels — {len(catalog['channels']):,} channels / {len(rows):,} sources", last_col=last_col)
for col_idx, h in enumerate(headers, start=2):
    ws2.cell(row=4, column=col_idx, value=h)
style_header_row(ws2, row_num=4, col_start=2, col_end=last_col)

for i, row_data in enumerate(rows):
    r = 5 + i
    for col_idx, value in enumerate(row_data, start=2):
        ws2.cell(row=r, column=col_idx, value=value)
    if i % 200 == 0:
        pass  # progress marker (kept lean)
    style_data_row(ws2, row_num=r, col_start=2, col_end=last_col, row_index=i)
    ws2.cell(row=r, column=5).alignment = Alignment(horizontal="center", vertical="center")

# AutoFilter over the data table (exclude header row styling effects)
ws2.auto_filter.ref = f"B4:G{4 + len(rows)}"
ws2.freeze_panes = "C5"
auto_fit_columns(ws2, min_width=8, max_width=60, header_row=4, data_start_row=5)
# URLs are long: cap URL column, shrink quality
ws2.column_dimensions["G"].width = 60

wb.properties.creator = "Z.ai"
os.makedirs(os.path.dirname(OUT), exist_ok=True)
wb.save(OUT)
print(f"saved: {OUT}")
print(f"rows written: {len(rows)} (one per healthy source)")
print(f"unique channels: {len(catalog['channels'])}")
