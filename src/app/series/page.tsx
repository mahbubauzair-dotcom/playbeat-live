/* VOD Series hub — web series, Pakistani & Indian dramas. Server-rendered. */

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
  title: "Web Series & Dramas — PlayBeat TV",
  description:
    "Binge web series from Netflix, Prime, ULLU & Hoichoi, plus Pakistani and Indian dramas — new episodes daily on PlayBeat TV.",
  path: "https://playbeattv.buzz/series",
});

export const revalidate = 600;

const PER_PAGE = 60;

export default async function SeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; page?: string; q?: string; zone?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const page = Math.max(1, Math.min(500, Number(sp.page) || 1));

  const [cats, line] = await Promise.all([vodBrowseCats("series"), vodLine()]);
  const browse = q
    ? null
    : await vodBrowsePage("series", sp.cat || null, page, PER_PAGE);
  const searchItems = q ? await vodSearch(q, 60) : [];

  const notice =
    line.ok || line.reason === "network"
      ? null
      : line.reason === "expired"
        ? "Your IPTV subscription has expired — renew your Star IPTV line to unlock the full series library. New episodes appear here automatically a few minutes after renewal."
        : "The series library is temporarily unavailable — the panel did not respond. It will fill in automatically.";

  return (
    <>
      <JsonLd
        data={webPageJsonLd({
          path: "https://playbeattv.buzz/series",
          name: "Web Series & Dramas — PlayBeat TV",
          description:
            "Binge web series from Netflix, Prime, ULLU & Hoichoi, plus Pakistani and Indian dramas.",
          type: "CollectionPage",
        })}
      />
      <AppShell
        view="vod"
        activeNav="series"
        vodHub={{
          kind: "series",
          title: "Web Series & Dramas",
          tagline: "Netflix, Prime, ULLU, Hoichoi · Pakistani & Indian dramas",
          cats,
          activeCat: sp.cat || null,
          page,
          perPage: PER_PAGE,
          items: q ? searchItems : (browse?.items ?? []),
          total: q ? searchItems.length : (browse?.total ?? 0),
          catName: browse?.catName ?? (q ? `Search: ${q}` : "All Series"),
          query: q,
          notice,
        }}
        {...shellStats()}
      />
    </>
  );
}
