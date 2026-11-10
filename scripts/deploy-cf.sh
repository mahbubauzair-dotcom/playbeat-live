#!/usr/bin/env bash
# PlayBeat TV → Cloudflare Workers + playbeattv.buzz (one command, needs CF_API_TOKEN)
set -euo pipefail
: "${CF_API_TOKEN:?export CF_API_TOKEN=<cloudflare api token>}"
: "${CF_ACCOUNT_ID:=0935a1089ed3050082d9a2b69fff2bd7}"

cd /home/z/my-project

echo "== 1. build (Next → OpenNext worker) =="
bun run build

echo "== 2. bundle for Cloudflare =="
bunx opennextjs-cloudflare build

echo "== 3. deploy worker + bind custom domains =="
CLOUDFLARE_API_TOKEN="$CF_API_TOKEN" CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID" \
  bunx wrangler deploy

echo "== 4. zone nameservers (if zone newly added) =="
curl -s -H "Authorization: Bearer $CF_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones?name=playbeattv.buzz" \
  | python3 -c "
import json,sys
d=json.load(sys.stdin)
for z in d.get('result',[]):
    print('zone:', z['id'], z['status'])
    print('nameservers:', ', '.join(z.get('name_servers',[])))
"
echo "DONE — if the zone was just added, set these nameservers at Spaceship for playbeattv.buzz."
