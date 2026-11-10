import type { MetadataRoute } from "next";
import { catalog } from "@/lib/stream.server";
import { getPool } from "@/lib/vod-catalog";

// Per-request generation at the edge (build env has no panel creds, so ISR
// prerender would bake an empty VOD list). getPool() caches 4.5 min per
// isolate, so repeat bot hits stay fast without hammering the panel.
export const dynamic = "force-dynamic";

// Keep the public sitemap scoped to the streaming host. The parent
// playbeattv.buzz domain is a different site / Search Console property.
const ORIGIN = "https://playbeattv.buzz";

const YEAR_2026_TS = 1767225600; // 2026-01-01T00:00:00Z

// Quality bar: curated movies/series only, 2026 + recently added first.
// Per-kind caps so dramas aren't crowded out by the bigger movie pool.
const MAX_MOVIE_URLS = 400;
const MAX_SERIES_URLS = 200;

const pages: {
  path: string;
  frequency: "daily" | "weekly" | "monthly";
  priority: number;
}[] = [
  { path: "/", frequency: "daily", priority: 1 },
  { path: "/live-tv", frequency: "daily", priority: 0.9 },
  { path: "/movies", frequency: "weekly", priority: 0.8 },
  { path: "/series", frequency: "weekly", priority: 0.8 },
  { path: "/sports", frequency: "daily", priority: 0.8 },
  { path: "/news", frequency: "daily", priority: 0.8 },
  { path: "/countries", frequency: "weekly", priority: 0.7 },
  { path: "/about", frequency: "monthly", priority: 0.5 },
  { path: "/content-policy", frequency: "monthly", priority: 0.4 },
  { path: "/dmca", frequency: "monthly", priority: 0.4 },
  { path: "/privacy-policy", frequency: "monthly", priority: 0.4 },
  { path: "/terms", frequency: "monthly", priority: 0.4 },
];

// These categories already have dedicated pages. Avoid duplicate listings.
const dedicatedCategories = new Set(["movies", "series", "sports", "news"]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalogDate = new Date(catalog.meta.generatedAt);
  const lastModified = Number.isNaN(catalogDate.getTime())
    ? undefined
    : catalogDate;

  const staticEntries: MetadataRoute.Sitemap = pages.map(
    ({ path, frequency, priority }) => ({
      url: new URL(path, ORIGIN).toString(),
      lastModified,
      changeFrequency: frequency,
      priority,
    }),
  );

  const categoryEntries: MetadataRoute.Sitemap = catalog.categories
    .filter((category) => !dedicatedCategories.has(category.id))
    .map((category) => ({
      url: `${ORIGIN}/category/${encodeURIComponent(category.id)}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

  // Long-tail SEO: movie/series detail pages, newest first, per-kind caps.
  // Panel failure must NEVER break the sitemap -> fall back to static set.
  const vodEntries: MetadataRoute.Sitemap = [];
  try {
    const pool = await getPool();
    const all = pool?.all ?? [];
    const ranked = [...all].sort((a, b) => {
      const aNew = a.year >= 2026 || a.added >= YEAR_2026_TS ? 0 : 1;
      const bNew = b.year >= 2026 || b.added >= YEAR_2026_TS ? 0 : 1;
      if (aNew !== bNew) return aNew - bNew;
      return b.added - a.added;
    });
    const seen = new Set<string>();
    let movies = 0;
    let series = 0;
    for (const it of ranked) {
      const isMovie = it.kind === "movie";
      if (isMovie && movies >= MAX_MOVIE_URLS) continue;
      if (!isMovie && series >= MAX_SERIES_URLS) continue;
      const seg = isMovie ? "movie" : "series";
      const url = `${ORIGIN}/${seg}/${encodeURIComponent(it.id)}`;
      if (seen.has(url)) continue;
      seen.add(url);
      if (isMovie) movies++;
      else series++;
      const fresh = it.added >= YEAR_2026_TS;
      vodEntries.push({
        url,
        lastModified: it.added ? new Date(it.added * 1000) : lastModified,
        changeFrequency: fresh ? "daily" : "weekly",
        priority: fresh ? 0.7 : 0.6,
      });
    }
  } catch {
    // keep static entries only
  }

  // Crawlable country and channel detail pages, bounded to avoid huge sitemap payloads.
  const countryEntries: MetadataRoute.Sitemap = catalog.countries
    .filter(c => catalog.channels.some(ch => ch.country === c.code))
    .map(c => ({url: `${ORIGIN}/country/${c.code.toLowerCase()}`, lastModified, changeFrequency: "weekly", priority: 0.6}));
  const channelEntries: MetadataRoute.Sitemap = catalog.channels
    .filter(ch => ch.logo && ch.srcs.length > 0)
    .slice(0, 800)
    .map(ch => ({url: `${ORIGIN}/channel/${encodeURIComponent(ch.id)}`, lastModified, changeFrequency: "weekly", priority: 0.5}));
  return [...staticEntries, ...categoryEntries, ...countryEntries, ...channelEntries, ...vodEntries];
}
