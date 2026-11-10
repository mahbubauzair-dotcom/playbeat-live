#!/usr/bin/env bash
# Set env vars on the playbeat-tv-bu8m Vercel project (git-linked to uzzirulzz-cyber/playbeat-tv)
set -euo pipefail

# Usage: VERCEL_TOKEN=vcp_... bash scripts/set_vercel_env.sh
# Never hardcode the token here — it is read from the environment.
: "${VERCEL_TOKEN:?set VERCEL_TOKEN env var first}"
TOKEN="$VERCEL_TOKEN"
PROJECT_ID="prj_nJ8foSlhhzzZ8pAzlAvBmoCgSuXI"
API="https://api.vercel.com/v10/projects/${PROJECT_ID}/env?upsert=true"

set_env() {
  local key="$1"
  local value="$2"
  local typ="${3:-encrypted}"
  echo "--- Setting ${key} (${typ}) ---"
  curl -s -X POST "$API" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"key\": \"${key}\",
      \"value\": \"${value}\",
      \"type\": \"${typ}\",
      \"target\": [\"production\", \"preview\", \"development\"]
    }" | python3 -c "
import json,sys
d=json.load(sys.stdin)
if d.get('created') or d.get('key'): print('  OK:', d.get('key','?'))
elif d.get('error'): print('  ERROR:', d['error'].get('message'))
else: print('  RESP:', json.dumps(d)[:200])
"
}

# Supabase (publishable/anon keys are public client keys by design)
set_env "NEXT_PUBLIC_SUPABASE_URL" "https://ntssdtdfifaiskddvpee.supabase.co" "plain"
set_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50c3NkdGRmaWZhaXNrZGR2cGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Njc5MDEsImV4cCI6MjEwNzU0MzkwMX0.nrFlGzyT5Hgh1oxnF4x9CVB4Iyu0EBNMofwfgylmVW0" "plain"
set_env "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" "sb_publishable_7xN02soEc_Yxfyo2MNVyyQ_slh_23uM" "plain"

# Placeholder DB URL (app runtime does not use prisma; keeps parity with previous deploy)
set_env "DATABASE_URL" "file:./db/custom.db" "encrypted"

echo ""
echo "=== Env vars now on project ==="
curl -s "https://api.vercel.com/v9/projects/${PROJECT_ID}/env" \
  -H "Authorization: Bearer ${TOKEN}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for e in d.get('envs',[]): print(' ', e.get('key'), '| target:', e.get('target'))
"
