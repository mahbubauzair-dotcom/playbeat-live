#!/usr/bin/env python3
"""Add Spaceship Spacemail DNS records to the playbeattv.buzz Cloudflare zone."""
import json, urllib.request

Z = "3424888fc3c2e287465eda77d202c2a1"
T = "REDACTED_CREDENTIAL"
BASE = f"https://api.cloudflare.com/client/v4/zones/{Z}/dns_records"
DKIM = ("v=DKIM1;k=rsa;p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAixxZj+AouZQBudOneBpCUYToDgPHbGXcf77RgqvlREafCD3X5RyNL7Qg+"
        "saCMOZXUwaCG2R/5pZa2TJs5n0VdDYRV+aLKE7r+eNCn5YaU5q9A611cK2PVYyjTCFZ9jj90iScJWVvdhgmOm0cOej+H+DFcTzIEunvF8LN4av/YAqQrjU"
        "f3lNHyuMOzPysn43vKDNAAu3jgyEURSlba1PLCtXKVSNzy/8sk3WCkTyWx9U3MKKH0QqrP9nkb0I4TQTkgU1ohuLlPRt0XuaMISZ9W+GeHhw48HG01YY1T+"
        "X5qBknW6f55TnWJqQt4ceuEH/i1Mq4XXhwZl1FWWOeRZ2+ywIDAQAB")

records = [
    {"type": "MX",  "name": "playbeattv.buzz", "content": "mx1.spacemail.com", "priority": 0, "ttl": 1},
    {"type": "MX",  "name": "playbeattv.buzz", "content": "mx2.spacemail.com", "priority": 0, "ttl": 1},
    {"type": "SRV", "name": "_autodiscover._tcp", "ttl": 1,
     "data": {"service": "_autodiscover", "proto": "_tcp", "name": "playbeattv.buzz",
              "priority": 0, "weight": 0, "port": 443, "target": "autoconfig.spacemail.com"}},
    {"type": "TXT", "name": "playbeattv.buzz", "content": "v=spf1 include:spf.spacemail.com ~all", "ttl": 1},
    {"type": "TXT", "name": "spacemail._domainkey", "content": DKIM, "ttl": 1},
]

for rec in records:
    req = urllib.request.Request(BASE, data=json.dumps(rec).encode(),
                                 headers={"Authorization": f"Bearer {T}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            d = json.loads(r.read())
        ok = d.get("success")
        rid = (d.get("result") or {}).get("id", "?")
        print(f"{'OK ' if ok else 'ERR'} {rec['type']:4} {rec['name']:24} id={str(rid)[:12]}")
        if not ok:
            print("   errors:", d.get("errors"))
    except urllib.error.HTTPError as e:
        print(f"ERR {rec['type']:4} {rec['name']:24} HTTP {e.code}: {e.read().decode()[:200]}")
