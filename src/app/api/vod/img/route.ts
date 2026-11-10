/* Image proxy for VOD posters — panel images are http:// (mixed content) and
   sometimes hotlink-guarded. Streams back only image/* responses. */

const TMDBISH_RE = /(^|\.)(image\.tmdb\.org|media\.amazon\.images|m\.media-amazon\.com)$/i;

export async function GET(req: Request) {
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
  // allow-list: TMDB/IMDb CDNs + the panel host itself
  const panelHost = (() => {
    try { return new URL(process.env.XTREAM_BASE || "http://stream.playbeat.live:8880").hostname; }
    catch { return "stream.playbeat.live"; }
  })();
  if (!TMDBISH_RE.test(target.hostname) && target.hostname !== panelHost) {
    return new Response("host not allowed", { status: 403 });
  }

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 15000);
  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (SMART-TV; LINUX) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        Referer: target.origin,
      },
      signal: ac.signal,
      cache: "no-store",
    });
    const type = upstream.headers.get("content-type") || "";
    if (!upstream.ok || !type.startsWith("image/")) {
      return new Response("not an image", { status: 415 });
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=604800, stale-while-revalidate=2592000",
      },
    });
  } catch {
    return new Response("upstream failed", { status: 504 });
  } finally {
    clearTimeout(t);
  }
}
