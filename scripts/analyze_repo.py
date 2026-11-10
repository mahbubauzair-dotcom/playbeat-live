#!/usr/bin/env python3
"""Analyze awesome-zhuiju-free repo: README structure, resource inventory, availability, commit history."""
import json, re, os, subprocess
from collections import Counter

REPO = "/home/z/my-project/repo_analysis/awesome-zhuiju-free"

print("=" * 60)
print("1. RESOURCES.JSON INVENTORY")
print("=" * 60)
with open(f"{REPO}/resources/resources.json", encoding="utf-8") as f:
    data = json.load(f)

if isinstance(data, dict):
    print("Top-level keys:", list(data.keys())[:20])
    items = data.get("resources") or data.get("items") or []
else:
    items = data
print(f"Total resources: {len(items)}")

if items:
    print("\nSample resource keys:", list(items[0].keys()))
    print("\nSample (first item, truncated):")
    s = json.dumps(items[0], ensure_ascii=False, indent=1)
    print(s[:800])

for field in ["category", "type", "status", "platform"]:
    vals = Counter(str(it.get(field)) for it in items if field in it)
    if vals:
        print(f"\nBy '{field}':")
        for k, v in vals.most_common(25):
            print(f"  {k}: {v}")

print("\n" + "=" * 60)
print("2. AVAILABILITY REPORT")
print("=" * 60)
for fn in ["availability.json", "verifications.json", "notices.json", "navigation-sync.json"]:
    path = f"{REPO}/reports/{fn}"
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            rep = json.load(f)
        size = os.path.getsize(path)
        print(f"\n--- {fn} ({size} bytes) ---")
        if isinstance(rep, dict):
            print("keys:", list(rep.keys())[:15])
            for k in ("summary", "stats", "meta"):
                if k in rep:
                    print(f"{k}:", json.dumps(rep[k], ensure_ascii=False)[:500])
            if "results" in rep and isinstance(rep["results"], list):
                st = Counter(str(r.get("status", r.get("ok"))) for r in rep["results"])
                print("result statuses:", dict(st))
                print("num results:", len(rep["results"]))
        elif isinstance(rep, list):
            print("list length:", len(rep))
            if rep:
                print("sample:", json.dumps(rep[0], ensure_ascii=False)[:400])

print("\n" + "=" * 60)
print("3. README SECTIONS")
print("=" * 60)
with open(f"{REPO}/README.md", encoding="utf-8") as f:
    md = f.read()
print(f"README size: {len(md)} chars, {len(md.splitlines())} lines")
for line in md.splitlines():
    if re.match(r"^#{1,4}\s", line) or re.match(r"^<h[1-4]", line):
        print(" ", line[:100])
links = re.findall(r"https?://[^\s\)\"'<>]+", md)
print(f"\nTotal links in README: {len(links)}")
domains = Counter(re.sub(r"^https?://([^/]+).*", r"\1", l) for l in links)
print("Top domains:")
for d, c in domains.most_common(15):
    print(f"  {d}: {c}")

print("\n" + "=" * 60)
print("4. COMMIT HISTORY")
print("=" * 60)
out = subprocess.run(["git", "-C", REPO, "log", "--format=%ad|%an|%s", "--date=iso", "--all"],
                     capture_output=True, text=True).stdout
lines = [l for l in out.splitlines() if l.strip()]
print(f"Total commits (this clone, depth-limited): {len(lines)}")
dates = [l.split("|")[0][:10] for l in lines]
print("First commit date in clone:", dates[-1] if dates else "n/a")
print("Last commit date:", dates[0] if dates else "n/a")
authors = Counter(l.split("|")[1] for l in lines)
print("Authors:", dict(authors))
bot = sum(1 for l in lines if "bot" in l.lower() or "chore: update daily availability" in l)
print(f"Bot/automation commits: {bot} ({bot*100//max(len(lines),1)}%)")

print("\n" + "=" * 60)
print("5. LICENSE & META")
print("=" * 60)
with open(f"{REPO}/LICENSE", encoding="utf-8") as f:
    lic = f.read()
print("LICENSE first 2 lines:", " / ".join(lic.splitlines()[:2]))
print("LICENSE length:", len(lic))

for fn in ["CONTRIBUTING.md", "MAINTAINERS.md", "CLAUDE.md"]:
    p = f"{REPO}/{fn}"
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            c = f.read()
        print(f"\n--- {fn} ({len(c)} chars) first 600 ---")
        print(c[:600])

print("\n" + "=" * 60)
print("6. WORKFLOWS")
print("=" * 60)
wf_dir = f"{REPO}/.github/workflows"
for wf in sorted(os.listdir(wf_dir)):
    with open(f"{wf_dir}/{wf}", encoding="utf-8") as f:
        w = f.read()
    cron = re.findall(r"cron: ['\"]([^'\"]+)['\"]", w)
    name = re.search(r"^name:\s*(.+)$", w, re.M)
    print(f"  {wf}: name={name.group(1) if name else '?'} | crons={cron}")
