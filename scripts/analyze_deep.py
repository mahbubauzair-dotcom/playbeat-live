#!/usr/bin/env python3
"""Deep dive: risk/verification distributions, disclaimer text, stars, maintenance model."""
import json, re, subprocess
from collections import Counter

REPO = "/home/z/my-project/repo_analysis/awesome-zhuiju-free"

with open(f"{REPO}/resources/resources.json", encoding="utf-8") as f:
    data = json.load(f)
items = data["resources"]
print("Schema version:", data.get("version"), "| updated_at:", data.get("updated_at"))

print("\n--- verification.status distribution ---")
print(Counter(i.get("verification", {}).get("status", "?") for i in items))
print("\n--- verification.method ---")
print(Counter(i.get("verification", {}).get("method", "?") for i in items))
print("\n--- risks.copyright ---")
print(Counter(i.get("risks", {}).get("copyright", "?") for i in items))
print("\n--- risks.safety ---")
print(Counter(i.get("risks", {}).get("safety", "?") for i in items))
print("\n--- risks.privacy ---")
print(Counter(i.get("risks", {}).get("privacy", "?") for i in items))
print("\n--- access.free_level ---")
print(Counter(i.get("access", {}).get("free_level", "?") for i in items))
print("\n--- access.requires_login ---")
print(Counter(str(i.get("access", {}).get("requires_login", "?")) for i in items))
print("\n--- featured count ---")
print(Counter(str(i.get("featured")) for i in items))
print("\n--- source.submitted_by ---")
print(Counter(i.get("source", {}).get("submitted_by", "?") for i in items))
print("\n--- added_at month distribution ---")
months = Counter(str(i.get("source", {}).get("added_at", "?"))[:7] for i in items)
for k in sorted(months):
    print(f"  {k}: {months[k]}")

# availability.json detail
print("\n--- availability.json detail ---")
with open(f"{REPO}/reports/availability.json", encoding="utf-8") as f:
    av = json.load(f)
print("generated_at:", av.get("generated_at"), "| checker:", json.dumps(av.get("checker"), ensure_ascii=False))
res = av["results"]
statuses = Counter(r.get("status") for r in res)
print("status counts:", dict(statuses))
lat = [r.get("latency_ms") for r in res if isinstance(r.get("latency_ms"), (int, float))]
if lat:
    lat.sort()
    print(f"latency ms: min={lat[0]}, median={lat[len(lat)//2]}, max={lat[-1]}")

# verifications.json sample
print("\n--- verifications.json sample ---")
with open(f"{REPO}/reports/verifications.json", encoding="utf-8") as f:
    ver = json.load(f)
recs = ver.get("records", [])
print("records:", len(recs))
if recs:
    print("sample:", json.dumps(recs[0], ensure_ascii=False)[:500])

# README disclaimer & principles
print("\n--- README disclaimer/principles (extracted) ---")
with open(f"{REPO}/README.md", encoding="utf-8") as f:
    md = f.read()
for sec in ["## 免责声明", "## 项目原则", "## 我们怎么维护", "## 怎么看评分", "## 项目数据"]:
    idx = md.find(sec)
    if idx >= 0:
        nxt = md.find("\n## ", idx + 5)
        chunk = md[idx:nxt if nxt > 0 else idx + 1500]
        print(f"\n<<< {sec} >>>")
        print(chunk[:1600])
