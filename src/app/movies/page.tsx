/* VOD Movies hub — panel movies in the NEXA skin. Server-rendered. */

import type { Metadata } from "next";
import { AppShell } from "@/components/stream/app-shell";
import { shellStats } from "@/lib/shell-data";
import {
  vodBrowseCats,
  vodBrowsePage,
  vodSearch,
} from "@/lib/vod-catalog";
import { vodLine } from "@/lib/vod";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/stream/json-ld";

export const metadata: Metadata = pageMetadata({
  robots: { index: false, follow: false },
  title: "Movies — PlayBeat TV",
  description:
    "Browse thousands of movies on PlayBeat TV — 2026 new releases, Hollywood, Netflix originals and more, free in your browser.",
  path: "https://playbeattv.buzz/movies",
});

export const revalidate = 600;

const PER_PAGE = 60;

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const page = Math.max(1, Math.min(500, Number(sp.page) || 1));

  // Let AppShell handle chrome; hub data loads in parallel.
  const [cats, line] = await Promise.all([vodBrowseCats("vod"), vodLine()]);
  const browse = q
    ? null
    : await vodBrowsePage("vod", sp.cat || null, page, PER_PAGE);
  const searchItems = q ? await vodSearch(q, 60) : [];

  const notice =
    line.ok || line.reason === "network"
      ? null
      : line.reason === "expired"
        ? "Your IPTV subscription has expired — renew your Star IPTV line to unlock the full movie library. New titles appear here automatically a few minutes after renewal."
        : "The movie library is temporarily unavailable — the panel did not respond. It will fill in automatically.";

  return (
    <>
      <JsonLd
        data={webPageJsonLd({
          path: "https://playbeattv.buzz/movies",
          name: "Movies — PlayBeat TV",
          description:
            "Browse thousands of movies on PlayBeat TV — 2026 new releases, Hollywood, Netflix originals and more.",
          type: "CollectionPage",
        })}
      />
      <AppShell
        view="vod"
        activeNav="movies"
        vodHub={{
          kind: "movie",
          title: "Movies",
          tagline: "2026 new releases first — Hollywood, Netflix, Prime & more",
          cats,
          activeCat: sp.cat || null,
          page,
          perPage: PER_PAGE,
          items: q ? searchItems : (browse?.items ?? []),
          total: q ? searchItems.length : (browse?.total ?? 0),
          catName: browse?.catName ?? (q ? `Search: ${q}` : "All Movies"),
          query: q,
          notice,
        }}
        {...shellStats()}
      />
    </>
  );
}
