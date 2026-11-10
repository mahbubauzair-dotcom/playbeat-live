/* VOD line status — used for monitoring & the home notice. */

import { vodLine, PANEL_USER, PANEL_BASE } from "@/lib/vod";
import { vodHomeRails } from "@/lib/vod-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const line = await vodLine();
  const rails = await vodHomeRails();
  return Response.json(
    {
      panel: PANEL_BASE,
      creds: PANEL_USER ? `set (${PANEL_USER})` : "MISSING",
      line: "reason" in line ? line.reason : line.status,
      railsOk: rails.ok ? rails.rails.length : rails.reason,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
