#!/usr/bin/env python3
"""Set GitHub Actions secrets for momflix auto-deployment to Vercel.

All credentials are read from environment variables — never hardcode them:
    GH_TOKEN=... VERCEL_TOKEN=... VERCEL_ORG_ID=... VERCEL_PROJECT_ID=... \
        python3 scripts/set_gh_secrets.py
"""
import base64
import json
import os
import urllib.request
from nacl import encoding, public

GH_TOKEN = os.environ.get("GH_TOKEN", "")
REPO = "mahbubakhanam177-ai/momflix"

SECRETS = {
    "VERCEL_TOKEN": os.environ.get("VERCEL_TOKEN", ""),
    "VERCEL_ORG_ID": os.environ.get("VERCEL_ORG_ID", ""),
    "VERCEL_PROJECT_ID": os.environ.get("VERCEL_PROJECT_ID", ""),
}

_missing = [k for k, v in SECRETS.items() if not v]
if not GH_TOKEN or _missing:
    raise SystemExit(
        "Missing credentials — export GH_TOKEN and "
        + ", ".join(_missing or ["VERCEL_*"]) + " first."
    )


def api(path, method="GET", data=None):
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/{path}",
        method=method,
        headers={
            "Authorization": f"Bearer {GH_TOKEN}",
            "Accept": "application/vnd.github+json",
        },
        data=json.dumps(data).encode() if data else None,
    )
    with urllib.request.urlopen(req) as r:
        body = r.read().decode()
        return json.loads(body) if body else {}


pk = api("actions/secrets/public-key")["key"]
key_id = api("actions/secrets/public-key")["key_id"]
pub = public.PublicKey(pk.encode(), encoding.Base64Encoder())
sealed = public.SealedBox(pub)

for name, value in SECRETS.items():
    encrypted = base64.b64encode(sealed.encrypt(value.encode())).decode()
    api(
        f"actions/secrets/{name}",
        method="PUT",
        data={"encrypted_value": encrypted, "key_id": key_id},
    )
    print(f"secret set: {name}")
