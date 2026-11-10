// PlayBeat TV — same-origin VOD streaming proxy. Server-only.
//
// The panel's media servers are http-only and every request 302-chains
// through single-use tokens (stream.playbeat.live -> IP:2086 -> *.space/auth).
// A browser on our https site cannot follow that chain (mixed content), so
// /api/play/* pipes the bytes through our own origin instead of redirecting.
//
// - Client Range header is forwarded verbatim -> seeking works (206 passthrough).
// - Tokens are single-use: EVERY proxy request re-resolves the chain fresh.
// - The upstream body is streamed straight through (no buffering) so memory
//   stays flat on Workers + Node.

const STREAM_UA =
  "Mozilla/5.0 (SMART-TV; LINUX) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const PASSTHROUGH = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "last-modified",
  "etag",
] as const;

export async function proxyStream(
  upstreamUrl: string,
  req: Request
): Promise<Response> {
  const range = req.headers.get("range");
  const headers: Record<string, string> = {
    "User-Agent": STREAM_UA,
    Accept: "*/*",
  };
  if (range) headers.Range = range;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers,
      redirect: "follow", // resolves the single-use token chain server-side
      cache: "no-store",
    });
  } catch {
    return new Response("upstream unreachable", { status: 502 });
  }

  // Auth/availability failures surface as 403 text — pass the status through
  // so the player UI shows its error state instead of hanging.
  const out = new Headers();
  for (const h of PASSTHROUGH) {
    const v = upstream.headers.get(h);
    if (v) out.set(h, v);
  }
  out.set("Cache-Control", "private, no-store");
  out.set("Access-Control-Allow-Origin", "*");
  if (!out.has("Accept-Ranges")) out.set("Accept-Ranges", "bytes");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: out,
  });
}
