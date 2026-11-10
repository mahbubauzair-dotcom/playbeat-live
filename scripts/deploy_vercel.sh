#!/bin/bash
# PlayBeat TV — Vercel production deploy (run after providing a VALID token)
# Usage: bash scripts/deploy_vercel.sh <VERCEL_TOKEN>
set -euo pipefail

TOKEN="${1:?usage: deploy_vercel.sh <vercel_token>}"
PROJECT="playbeat-tv"
cd /home/z/my-project

echo "== 1. identity =="
vercel whoami --token "$TOKEN"

echo "== 2. link project ($PROJECT) =="
vercel link --yes --project "$PROJECT" --token "$TOKEN"

echo "== 3. env variables =="
# The app needs no secrets at runtime; DATABASE_URL is a placeholder so the
# (unused) prisma datasource never blocks builds or cold starts.
printf 'file:./db/custom.db' | vercel env add DATABASE_URL production --yes --token "$TOKEN" 2>/dev/null || true

echo "== 4. production deploy =="
vercel deploy --prod --yes --name "$PROJECT" --token "$TOKEN"

echo "== 5. deployment url =="
vercel ls "$PROJECT" --token "$TOKEN" | head -8
