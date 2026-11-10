# Playbeat Live (playbeat.live)

Production-ready regional Next.js and Cloudflare Workers application for **playbeat.live**.

- **Production Domain:** `https://playbeat.live`
- **GitHub Repository:** [mahbubauzair-dotcom/playbeat-live](https://github.com/mahbubauzair-dotcom/playbeat-live)
- **Active Curated Channels:** 868 verified streams
- **Catalog Snapshot:** 4,819 channels · 166 countries · 28 categories · 5,492 HTTPS sources
- **Target Audience:** USA & North America live 24/7 TV, breaking news, sports, sitcoms & FAST channels

---

## ✨ What's inside

- **Live TV** — curated free-to-air channels with HLS playback, source failover (auto-switch), favorites & recents
- **Categories & Countries** — browse by 28 content categories or 166 countries
- **VOD** — movies, web series & dramas rails with search, watch pages and poster proxy
- **PWA** — installable app, offline fallback page, service worker
- **SEO** — per-page metadata, JSON-LD, sitemap, Google Search Console verified
- **Cloudflare stack** — OpenNext worker, KV `VOD_CACHE`, catalog edge worker, pool warmer

---

## 🚀 Deploy to Cloudflare (Workers + playbeat.live)

The repo is preconfigured for Cloudflare via [OpenNext](https://opennext.js.org/cloudflare):

| File | Purpose |
| --- | --- |
| `wrangler.jsonc` | Worker config — KV `VOD_CACHE`, custom domains `playbeat.live` / `www.playbeat.live` |
| `open-next.config.ts` | OpenNext Cloudflare adapter config |
| `cloudflare/wrangler.jsonc` | Standalone TV-catalog API worker (`/api/tv/*` endpoints) |
| `cloudflare/pool-warmer/` | Cron worker that pre-warms the KV pool |
| `scripts/deploy-cf.sh` | One-command deploy script (needs `CF_API_TOKEN`) |

### Option A — one command

```bash
export CF_API_TOKEN=<cloudflare api token>
bun install
bash scripts/deploy-cf.sh
```

### Option B — step by step

```bash
bun install
bun run build                 # next build (standalone output)
bunx opennextjs-cloudflare build   # bundle worker into .open-next/
bunx wrangler deploy          # deploy worker + assets + custom domains
```

### Option C — GitHub integration

1. Cloudflare Dashboard → **Workers & Pages** → *Create* → connect the `mahbubauzair-dotcom/playbeat-live` repo
2. Build command: `bun run build && bunx opennextjs-cloudflare build`
3. Deploy command: `bunx wrangler deploy`
4. Custom domains `playbeat.live` and `www.playbeat.live` are already declared in `wrangler.jsonc` — approve them in the domain settings once the zone is active

### Catalog edge worker (optional, separate)

```bash
npx wrangler deploy --config cloudflare/wrangler.jsonc
```

---

## 🧑‍💻 Local development

```bash
bun install
bun run dev        # http://localhost:3000
bun run db:push    # sync Prisma schema (SQLite)
bun run lint
```

The catalog lives in `src/data/stream-catalog.json` and `public/data/stream-catalog.json`;
regenerate with `scripts/build_stream_catalog.py`, inspect changed sources, then redeploy.
No provider passwords or private credentials are included.

---

## 📄 License

See [LICENSE](./LICENSE).
