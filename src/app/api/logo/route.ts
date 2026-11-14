/* Channel-logo proxy.
 *
 * imgur rate-limits hotlinked images (HTTP 429), which left broken channel
 * logos across the directory. Catalog logo URLs for aggressive hosts are
 * rewritten to /api/logo?u=<encoded>, this route fetches them server-side
 * (one subrequest per cold miss), caches the bytes at the edge with the
 * Cache API and serves a neutral placeholder tile when the upstream fails —
 * so viewers never see a broken image. */

const ALLOWED_HOSTS = new Set([
  "i.imgur.com",
  "imgur.com",
  "i.ibb.co",
  "upload.wikimedia.org",
  "static.wikia.nocookie.net",
  "ltsk-cdn.s3.eu-west-1.amazonaws.com",
  "dtil.tmsimg.com",
  "jiotvimages.cdn.jio.com",
  "provider-static.plex.tv",
  "xstreamcp-assets-msp.streamready.in",
  "cdn.m3u.cl",
  "www.vivalivetv.com",
  "raw.githubusercontent.com",
  "pbs.twimg.com",
  "assets.antenaplay.ro",
]);

const MAX_BYTES = 4 * 1024 * 1024;
const OK_TTL = 86400;
const MISS_TTL = 300;

function placeholderResponse(): Response {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120">' +
    '<rect width="160" height="120" rx="12" fill="#18181b"/>' +
    '<rect x="52" y="36" width="56" height="42" rx="7" fill="none" stroke="#52525b" stroke-width="3"/>' +
    '<path d="M66 28l14 9 14-9" stroke="#52525b" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="80" cy="57" r="7" fill="#52525b"/>' +
    "</svg>";
  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": `public, max-age=${MISS_TTL}`,
      "X-Logo-Proxy": "placeholder",
    },
  });
}

export async function GET(req: Request) {
  const cache = caches.default;
  try {
    const hit = await cache.match(req);
    if (hit) return hit;
  } catch {
    /* Cache API unavailable — fall through to upstream fetch. */
  }

  const raw = new URL(req.url).searchParams.get("u");
  if (!raw) return new Response("missing u", { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return new Response("bad scheme", { status: 400 });
  }
  // block private ranges
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.)/i.test(target.hostname)) {
    return new Response("blocked host", { status: 403 });
  }
  if (!ALLOWED_HOSTS.has(target.hostname.toLowerCase())) {
    return new Response("host not allowed", { status: 403 });
  }

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 12000);
  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/png,image/*,*/*;q=0.8",
        Referer: target.origin + "/",
      },
      signal: ac.signal,
      redirect: "follow",
    });
    const type = upstream.headers.get("content-type") || "";
    if (!upstream.ok || !type.startsWith("image/")) {
      return placeholderResponse();
    }
    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return placeholderResponse();
    }
    const res = new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Cache-Control": `public, max-age=${OK_TTL}, stale-while-revalidate=604800`,
        "X-Logo-Proxy": "upstream",
      },
    });
    try {
      await cache.put(req, res.clone());
    } catch {
      /* cache write failures are non-fatal */
    }
    return res;
  } catch {
    return placeholderResponse();
  } finally {
    clearTimeout(t);
  }
}
