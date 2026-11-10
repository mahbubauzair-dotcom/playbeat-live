/* VOD search JSON — used by the hub search forms' client fallback. */

import { vodSearch } from "@/lib/vod-catalog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") || "";
  const items = await vodSearch(q, 40);
  return Response.json(
    { q, count: items.length, items },
    { headers: { "Cache-Control": "no-store" } }
  );
}
