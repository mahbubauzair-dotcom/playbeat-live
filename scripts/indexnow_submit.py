#!/usr/bin/env python3
"""One-time IndexNow bulk submission for playbeattv.buzz.
Reads download/playbeat-bing-urls-all-636.txt and POSTs them to
api.indexnow.org in chunks of 200 (well under the 10k bulk limit).
"""
import json, time, urllib.request, urllib.error

KEY = "4abc5d14a63441c0b4118f37ca7ad0d4"
HOST = "playbeattv.buzz"
KEYLOC = f"https://{HOST}/{KEY}.txt"
ENDPOINT = "https://api.indexnow.org/IndexNow"
URLS_FILE = "/home/z/my-project/download/playbeat-bing-urls-all-636.txt"
CHUNK = 200

with open(URLS_FILE, encoding="utf-8") as f:
    urls = [u.strip() for u in f if u.strip().startswith("http")]

print(f"loaded {len(urls)} urls")
total_ok = 0
for i in range(0, len(urls), CHUNK):
    chunk = urls[i : i + CHUNK]
    body = json.dumps({"host": HOST, "key": KEY, "keyLocation": KEYLOC, "urlList": chunk}).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT, data=body, method="POST",
        headers={"Content-Type": "application/json; charset=utf-8", "User-Agent": "playbeat-indexnow/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            code, text = r.status, r.read(200).decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        code, text = e.code, e.read(200).decode("utf-8", "replace")
    except Exception as e:
        code, text = -1, str(e)[:120]
    print(f"chunk {i//CHUNK+1}: urls={len(chunk)} http={code} body={text[:80]!r}")
    if code in (200, 202):
        total_ok += len(chunk)
    else:
        break
    time.sleep(2)  # polite spacing

print(f"RESULT: {total_ok}/{len(urls)} urls accepted")
