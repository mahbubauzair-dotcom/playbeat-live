/* Episode playback proxy — same-origin bytes, credentials stay server-side.
   GET /api/play/ep/<episode_id>?ext=mp4  (Range requests supported) */

import { episodeStreamUrl } from "@/lib/vod";
import { proxyStream } from "@/lib/vod-proxy";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) {
    return new Response("bad id", { status: 400 });
  }
  const extRaw = new URL(req.url).searchParams.get("ext") || "mp4";
  const ext = /^[a-z0-9]{2,4}$/i.test(extRaw) ? extRaw.toLowerCase() : "mp4";
  return proxyStream(episodeStreamUrl(id, ext), req);
}
