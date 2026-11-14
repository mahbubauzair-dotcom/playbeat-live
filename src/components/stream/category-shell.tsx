/* Server component: renders <AppShell> in category mode for a given id.
   Used by /movies /series /sports /news and /category/[id]. */
import type { Metadata } from "next";
import { AppShell } from "@/components/stream/app-shell";
import { shellStats } from "@/lib/shell-data";
import { catalog, categoryName } from "@/lib/stream.server";
import { categoryPageMeta } from "@/lib/category-pages";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/stream/json-ld";

/** Minimal channel shape the client needs for the SSR discovery sentence. */
export interface FeaturedChannel {
  name: string;
  q: number;
}

/** Extra per-category context for the SSR intro. */
export interface CategorySsrData {
  featured: FeaturedChannel[];
  /** most represented countries in this category (display names) */
  countries: string[];
  /** total channels in the category */
  count: number;
}

/**
 * Server-side category context rendered into the initial HTML so crawlers
 * see real channel names and coverage before the client-side catalog
 * fetch hydrates the interactive grid.
 */
export function categorySsrData(categoryId: string, count = 14): CategorySsrData {
  const channels = catalog.channels.filter((c) => c.cats.includes(categoryId));
  const countryCounts = new Map<string, number>();
  for (const c of channels) {
    const name =
      catalog.countries.find((k) => k.code === c.country)?.name ?? c.country;
    if (name) countryCounts.set(name, (countryCounts.get(name) ?? 0) + 1);
  }
  const countries = [...countryCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([name]) => name);
  const featured = [...channels]
    .sort(
      (a, b) =>
        (b.srcs[0]?.q ?? 0) * 10 + b.srcs.length -
        ((a.srcs[0]?.q ?? 0) * 10 + a.srcs.length)
    )
    .slice(0, count)
    .map((c) => ({ name: c.name, q: c.srcs[0]?.q ?? 0 }));
  return { featured, countries, count: channels.length };
}

export function CategoryShell({ categoryId }: { categoryId: string }) {
  const { title, description, path } = categorySeo(categoryId);
  return (
    <>
      <JsonLd
        data={webPageJsonLd({
          path: `https://playbeat.live${path}`,
          name: title,
          description,
          type: "CollectionPage",
        })}
      />
      <AppShell
        view="category"
        activeCategory={categoryId}
        categorySsr={categorySsrData(categoryId)}
        {...shellStats()}
      />
    </>
  );
}

/** Canonicalize the four category aliases to their dedicated routes. */
function categoryCanonicalPath(id: string): string {
  const dedicated: Record<string, string> = {
    movies: "/movies",
    series: "/series",
    sports: "/sports",
    news: "/news",
  };
  return dedicated[id] ?? `/category/${encodeURIComponent(id)}`;
}

/* Curated SEO titles: the four dedicated routes use the campaign spec,
   headline categories get hand-written titles, everything else follows a
   unique-by-construction pattern (`${name}` is unique per category). */
const SEO_TITLES: Record<string, string> = {
  movies: "Free Movie TV Channels & Cinema — Playbeat Live",
  series: "Live Drama & TV Series Channels — Playbeat Live",
  sports: "Live Sports TV Channels Worldwide — Playbeat Live",
  news: "Live International News TV Channels — Playbeat Live",
  music: "Music TV Channels & Live Entertainment — Playbeat Live",
  kids: "Kids TV Channels & Cartoons — Playbeat Live",
  documentary: "Documentary & Science TV Channels — Playbeat Live",
};

/* Meta descriptions for the headline categories (on-page blurbs stay
   separate and punchier); everything else falls back to its unique blurb. */
const SEO_DESCRIPTIONS: Record<string, string> = {
  music: "Discover free-to-air music television channels featuring music videos, concerts and entertainment programming from worldwide broadcasters.",
  kids: "Explore children's television channels offering cartoons, animation, educational shows and family entertainment.",
  documentary:
    "Discover television channels featuring nature, history, science, culture and documentary programming from public broadcasters.",
};

export function categoryMetadata(categoryId: string): Metadata {
  const { title, description, path } = categorySeo(categoryId);
  return pageMetadata({ title, description, path });
}

function categorySeo(categoryId: string): {
  title: string;
  description: string;
  path: string;
} {
  const name = categoryName(categoryId);
  const meta = categoryPageMeta(categoryId);
  const title =
    SEO_TITLES[categoryId] ?? `${name} TV Channels — Live & Free — Playbeat Live`;
  const description =
    SEO_DESCRIPTIONS[categoryId] ??
    meta?.blurb ??
    `Watch ${name} channels live and free on Playbeat Live — no login, no tracking.`;
  return { title, description, path: categoryCanonicalPath(categoryId) };
}
