import { NextResponse } from "next/server";
import { catalog } from "@/lib/stream.server";

/**
 * Serves the bundled stream catalog to the client.
 * Data is generated offline by scripts/build_stream_catalog.py and changes
 * only on rebuild, so aggressive client caching is safe.
 */
export async function GET() {
  return NextResponse.json(catalog, {
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
