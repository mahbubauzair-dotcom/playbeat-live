# PlayBeat Live TV catalog

Public snapshot of the existing src/data/stream-catalog.json, deployed to playbeat.live without replacing the existing homepage.

Endpoints:
- GET /api/catalog or /api/tv/catalog: complete catalog
- GET /api/tv/channels?q=BBC&country=GB&category=news&page=1&limit=24
- GET /api/tv/channels?id=AndTV.in
- GET /api/tv/countries
- GET /api/tv/categories
- GET /api/tv/health

Includes 4,819 channels, 166 countries, 28 categories and 5,492 HTTPS sources from the repository snapshot generated 2026-10-14. This is catalog availability, not a guarantee of current upstream playback. No provider passwords or private credentials are included.

The Google AI Studio app link returned Page not found on 2026-10-16, so the frontend was not imported or replaced. Connect the app to https://playbeat.live/api/tv/catalog once app access is restored.

Deploy: npx wrangler deploy --config cloudflare/wrangler.jsonc

Refresh: regenerate src/data/stream-catalog.json using scripts/build_stream_catalog.py, inspect changed sources, then redeploy. No automatic GitHub credentials are embedded in the Worker.
