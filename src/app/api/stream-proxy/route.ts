/* Same-origin live-stream proxy.
 *
 * Why: the catalog includes channels a browser cannot fetch directly from
 * an HTTPS page — plain-http HLS (mixed content is blocked), DASH manifests
 * (.mpd) and redirect short-links. Once fetched same-origin, hls.js and
 * dash.js can play them, so this route fetches upstream and:
 *   - streams media/segments through untouched (Range header included),
 *   - rewrites HLS playlists (all URI="..." attributes + plain segment
 *     lines) so every child request also goes through this proxy,
 *   - rewrites DASH MPDs (BaseURL text + sourceURL attributes) likewise.
 * Abuse/SSRF guards: same-site gate (Origin / Referer host match or a
 * browser Sec-Fetch-Site header), public http(s) targets only, private /
 * loopback / metadata IP literals blocked, 20s upstream timeout.
 */
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

const UPSTREAM_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function proxied(abs: string): string {
  return `/api/stream-proxy?u=${encodeURIComponent(abs)}`;
}

function rewriteM3U8(text: string, base: string): string {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      out.push("");
      continue;
    }
    if (line.startsWith("#")) {
      out.push(
        line.replace(/URI="([^"]+)"/g, (_m, u: string) => {
          try {
            return `URI="${proxied(new URL(u, base).toString())}"`;
          } catch {
            return _m;
          }
        }),
      );
    } else {
      try {
        out.push(proxied(new URL(line, base).toString()));
      } catch {
        out.push(line);
      }
    }
  }
  return out.join("\n");
}

function rewriteMPD(text: string, base: string): string {
  return text
    .replace(
      /(<BaseURL[^>]*>)([^<]+)(<\/BaseURL>)/gi,
      (_m, a: string, u: string, b: string) => {
        try {
          return a + proxied(new URL(u, base).toString()) + b;
        } catch {
          return _m;
        }
      },
    )
    .replace(/\s(sourceURL|initialization)="([^"]+)"/gi, (m, attr: string, u: string) => {
      if (u.includes("$")) return m; // SegmentTemplate placeholders are not URLs
      try {
        return ` ${attr}="${proxied(new URL(u, base).toString())}"`;
      } catch {
        return m;
      }
    });
}

function isPrivateHost(hostname: string): boolean {
  const h = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (/^(localhost|.*\.localhost|.*\.local|.*\.internal|.*\.home\.arpa)$/.test(h)) return true;
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && (b === 168 || b === 0)) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 198 && b === 18) return true;
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  if (h.includes(":")) {
    if (h === "::1" || h === "::") return true;
    if (/^f[cd]/.test(h)) return true; // fc00::/7 unique-local
    if (/^fe[89ab]/.test(h)) return true; // fe80::/10 link-local
    const v4mapped = h.match(/::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (v4mapped) return isPrivateHost(v4mapped[1]);
  }
  return false;
}

function sameSiteOK(req: Request): boolean {
  const host = new URL(SITE_URL).host;
  try {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host === host) return true;
    const referer = req.headers.get("referer");
    if (referer && new URL(referer).host === host) return true;
  } catch {
    /* fall through */
  }
  const sfs = req.headers.get("sec-fetch-site");
  return sfs === "same-origin" || sfs === "none";
}

export async function GET(req: Request): Promise<Response> {
  if (!sameSiteOK(req)) {
    return new Response("Forbidden", { status: 403 });
  }
  const target = new URL(req.url).searchParams.get("u");
  if (!target) return new Response("Missing u", { status: 400 });

  let u: URL;
  try {
    u = new URL(target);
  } catch {
    return new Response("Bad u", { status: 400 });
  }
  if ((u.protocol !== "https:" && u.protocol !== "http:") || isPrivateHost(u.hostname)) {
    return new Response("Blocked target", { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(u.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: {
        "User-Agent": UPSTREAM_UA,
        Accept: "*/*",
        ...(req.headers.get("range") ? { Range: req.headers.get("range") as string } : {}),
      },
    });
  } catch {
    return new Response("Upstream unreachable", { status: 504 });
  }

  const ct = (upstream.headers.get("content-type") || "").toLowerCase();
  const base = upstream.url || u.toString();
  const looksHls = /\.m3u8(\?|$)/i.test(target) || ct.includes("mpegurl");
  const looksDash = /\.mpd(\?|$)/i.test(target) || ct.includes("dash+xml");

  if (looksHls || looksDash) {
    const text = await upstream.text();
    const body = looksHls ? rewriteM3U8(text, base) : rewriteMPD(text, base);
    return new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type": looksHls
          ? "application/vnd.apple.mpegurl"
          : "application/dash+xml",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const headers = new Headers();
  for (const h of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
  ]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set("Cache-Control", "no-store");
  headers.set("Access-Control-Allow-Origin", "*");
  return new Response(upstream.body, { status: upstream.status, headers });
}
