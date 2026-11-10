/* Movie playback proxy — keeps panel credentials server-side and pipes bytes
   through our origin (panel media servers are http-only + single-use tokens,
   so a browser 302 would be mixed-content blocked on the https site).
   GET /api/play/vod/<stream_id>?ext=mp4  (Range requests supported) */

import { vodStreamUrl } from "@/lib/vod";
import { proxyStream } from "@/lib/vod-proxy";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const streamId = Number(id);
  if (!Number.isInteger(streamId) || streamId <= 0) {
    return new Response("bad id", { status: 400 });
  }
  const extRaw = new URL(req.url).searchParams.get("ext") || "mp4";
  const ext = /^[a-z0-9]{2,4}$/i.test(extRaw) ? extRaw.toLowerCase() : "mp4";
  return proxyStream(vodStreamUrl(streamId, ext), req);
}
