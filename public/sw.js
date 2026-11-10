/*
 * Playbeat TV service worker — production-ready, deliberately conservative.
 * (Monetag SW push removed 2026-11-09 — zones 12222276-79 deactivated by Monetag;
 *  active monetization = MultiTag zone 307756 via layout.tsx, which does NOT use the SW.)
 *
 * Caching policy (safety first):
 *  - SAME-ORIGIN GET requests only. Cross-origin traffic (IPTV/HLS streams,
 *    .m3u8 playlists, media segments, third-party CDNs) is NEVER intercepted
 *    — it passes straight through untouched.
 *  - /api/* is NEVER cached — always the network (requirement: no caching of
 *    API responses).
 *  - Immutable, content-hashed build assets (/_next/static/) and static
 *    branding images are cache-first.
 *  - Page navigations are network-first with an offline fallback page.
 *  - Old caches are versioned and cleaned up on activate.
 */

const VERSION = "pb-pwa-v3";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [OFFLINE_URL, "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGE_CACHE);
      await Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(u)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

/** Immutable assets: serve from cache, else fetch once and cache. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    return new Response("", {
      status: 504,
      statusText: "Offline",
      headers: { "Content-Type": "text/plain" },
    });
  }
}

/** Navigations: always try network first, fall back to cache/offline page. */
async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === "basic") {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return (
      (await cache.match(request)) ||
      (await cache.match(OFFLINE_URL)) ||
      new Response("You are offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      })
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only same-origin GETs are ever handled.
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return; // streams, HLS, CDNs: untouched
  if (url.pathname.startsWith("/api/")) return; // APIs: network-only, never cached
  if (url.pathname.startsWith("/sw.js")) return;

  // Immutable, content-hashed Next.js build output -> cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Static branding / icons / hero art -> cache-first.
  if (
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/hero/") ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Document navigations -> network-first with offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  // Everything else (RSC payloads, /api excluded above): passthrough.
});
