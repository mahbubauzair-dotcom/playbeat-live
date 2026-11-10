#!/usr/bin/env python3
"""Merge resources.json + availability.json into a single dataset for the preview panel app."""
import json
from pathlib import Path

REPO = Path("/home/z/my-project/repo_analysis/awesome-zhuiju-free")
OUT = Path("/home/z/my-project/src/data/collection.json")
OUT.parent.mkdir(parents=True, exist_ok=True)

resources_doc = json.loads((REPO / "resources/resources.json").read_text())
availability = json.loads((REPO / "reports/availability.json").read_text())
readme = (REPO / "README.md").read_text()

# Map availability results by resource id
av_by_id = {r["resource_id"]: r for r in availability.get("results", [])}

CATEGORY_META = {
    "online_video":  {"zh": "在线影视",            "en": "Online Streaming",  "icon": "film"},
    "video_app":     {"zh": "影视APP",             "en": "Video Apps",        "icon": "smartphone"},
    "cloud_search":  {"zh": "网盘资源搜索",        "en": "Cloud Drive Search","icon": "cloud"},
    "magnet_search": {"zh": "磁力 & BT",           "en": "Magnet & BT",       "icon": "magnet"},
    "subtitles":     {"zh": "字幕资源",            "en": "Subtitles",         "icon": "captions"},
    "tvbox_config":  {"zh": "TVBox 配置",          "en": "TVBox Configs",     "icon": "tv"},
    "player":        {"zh": "播放器 / 空壳",       "en": "Players & Shells",  "icon": "play"},
    "open_source":   {"zh": "开源项目",            "en": "Open Source",       "icon": "code"},
    "subscription":  {"zh": "直播源 / 订阅",       "en": "Live & IPTV",       "icon": "radio"},
}

items = []
for r in resources_doc["resources"]:
    rid = r["id"]
    av = av_by_id.get(rid)
    scores = r.get("scores", {})
    vals = [v for v in scores.values() if isinstance(v, (int, float))]
    avg = round(sum(vals) / len(vals), 1) if vals else None
    items.append({
        "id": rid,
        "name": r.get("name", rid),
        "url": r.get("url", ""),
        "category": r.get("category", "unknown"),
        "summary": r.get("summary", ""),
        "summaryShort": r.get("summary_short", ""),
        "tags": r.get("tags", []),
        "requiresLogin": bool(r.get("access", {}).get("requires_login", False)),
        "freeLevel": r.get("access", {}).get("free_level", "unknown"),
        "regions": r.get("access", {}).get("regions", []),
        "scores": scores,
        "avgScore": avg,
        "risks": r.get("risks", {}),
        "verification": {
            "status": r.get("verification", {}).get("status", "unknown"),
            "lastChecked": r.get("verification", {}).get("last_checked"),
            "method": r.get("verification", {}).get("method"),
            "notes": r.get("verification", {}).get("notes", ""),
        },
        "submittedBy": r.get("source", {}).get("submitted_by"),
        "addedAt": r.get("source", {}).get("added_at"),
        "featured": bool(r.get("featured", False)),
        "availability": None if av is None else {
            "status": av.get("status"),
            "httpStatus": av.get("http_status"),
            "finalUrl": av.get("final_url"),
            "responseMs": av.get("response_ms"),
            "checkedAt": av.get("checked_at"),
            "error": av.get("error"),
        },
    })

# Category counts (for filter chips)
cat_counts = {}
for it in items:
    cat_counts[it["category"]] = cat_counts.get(it["category"], 0) + 1

dataset = {
    "meta": {
        "repo": "laoma528/awesome-zhuiju-free",
        "repoUrl": "https://github.com/laoma528/awesome-zhuiju-free",
        "site": "https://zhuiju.me",
        "license": "CC BY 4.0",
        "resourcesUpdatedAt": resources_doc.get("updated_at"),
        "availabilityGeneratedAt": availability.get("generated_at"),
        "total": len(items),
        "categoryCounts": cat_counts,
    },
    "categories": CATEGORY_META,
    "items": items,
}

OUT.write_text(json.dumps(dataset, ensure_ascii=False, indent=1))
print(f"Wrote {OUT} ({OUT.stat().st_size/1024:.1f} KB), {len(items)} items")
