/* Server-only: curated homepage content (hero spotlight + rails).
   Imports the bundled catalog via lib/stream.server — never import from client code. */
import type { StreamChannel } from "@/lib/stream";
import { catalog, channelById } from "@/lib/stream.server";

export interface HeroItem {
  channel: StreamChannel;
  backdrop: string;
  tagline: string;
  description: string;
  /** Small uppercase label above the headline, e.g. "GLOBAL NEWS SPOTLIGHT" */
  eyebrow: string;
  /** Category the primary CTA browses to ("all" = the whole catalog) */
  focusCategory: string;
  /** Label of the primary CTA button */
  primaryLabel: string;
  /** Promo slide (e.g. a TV drama): no channel is claimed; links to `href` */
  promo?: { title: string; badge: string; href: string };
}

export interface HomeRow {
  id: string;
  title: string;
  subtitle: string;
  variant: "poster" | "wide";
  hue: string; // tailwind gradient stops for the poster tile
  category?: string; // category preset for the "Explore" link
  channels: StreamChannel[];
}

export interface CountryChip {
  code: string;
  name: string;
  flag: string;
  count: number;
}

/* ---------- hero spotlight: six cinematic, catalog-backed slides ----------
   Every slide features a REAL channel from the bundled catalog and a REAL
   category destination. Discovery-themed slides (cinema / cricket / football)
   browse their category instead of claiming a specific event or fixture. */

interface HeroDef {
  id: string;
  fallbacks?: string[];
  backdrop: string;
  tagline: string;
  description: string;
  eyebrow: string;
  focusCategory: string;
  primaryLabel: string;
  promo?: { title: string; badge: string; href: string };
}

const HERO_DEFS: HeroDef[] = [
  {
    id: "BloombergTV.us",
    fallbacks: ["France24.fr", "AlJazeera.qa"],
    backdrop: "/hero/hero-city.png",
    tagline: "Stream the extraordinary.",
    description:
      "News, culture, sports and entertainment from around the world — one beautifully curated home for public free-to-air channels, free in your browser.",
    eyebrow: "The world is on",
    focusCategory: "all",
    primaryLabel: "Explore channels",
  },
  {
    id: "ARTFLIXMovieClassics.us",
    fallbacks: ["AndTV.in", "B4UBhojpuri.in"],
    backdrop: "/hero/redesign/hero-cinema.webp",
    tagline: "Your next movie night.",
    description:
      "Free-to-air cinema running around the clock — classics, cult favourites and premieres on dedicated movie channels. Availability varies by region.",
    eyebrow: "Trending movie discovery",
    focusCategory: "movies",
    primaryLabel: "Browse movie channels",
  },
  {
    id: "France24.fr",
    fallbacks: ["AlJazeera.qa", "TRTWorld.tr"],
    backdrop: "/hero/redesign/hero-news.webp",
    tagline: "The world, right now.",
    description:
      "Stay close to breaking stories with international and regional news broadcasters — live where available, straight from the open free-to-air index.",
    eyebrow: "Global news spotlight",
    focusCategory: "news",
    primaryLabel: "Browse live news",
  },
  {
    id: "NickelodeonLatinAmerica.us",
    fallbacks: ["BabySharkTV.us", "BabyFirst.us"],
    backdrop: "/hero/redesign/hero-kids.webp",
    tagline: "Big imaginations.",
    description:
      "A joyful world of cartoons, animation and family programming — colourful, age-appropriate channels streaming free, every hour of the day.",
    eyebrow: "Cartoons & family TV",
    focusCategory: "kids",
    primaryLabel: "Explore kids TV",
  },
  {
    id: "RedBullTV.at",
    fallbacks: ["beINSPORTSXTRA.us", "NBCSportsNOW.us"],
    backdrop: "/hero/redesign/hero-football.webp",
    tagline: "Every match. Every moment.",
    description:
      "Stadium energy from around the globe — football, cricket and action sports on the live sports broadcasters available in your region.",
    eyebrow: "Sports under the lights",
    focusCategory: "sports",
    primaryLabel: "Browse sports",
  },
  {
    id: "CricketGold.au",
    fallbacks: ["Willow.us", "MSports.pk"],
    backdrop: "/hero/redesign/hero-cricket.webp",
    tagline: "Where legends play.",
    description:
      "Floodlights, roaring crowds and cricket programming from publicly indexed broadcasters worldwide — catch live coverage where it is available.",
    eyebrow: "The cricket stage",
    focusCategory: "sports",
    primaryLabel: "Browse cricket TV",
  },
];

export function heroItems(): HeroItem[] {
  return HERO_DEFS.flatMap((def) => {
    const channel =
      channelById(def.id) ??
      (def.fallbacks ?? []).map((id) => channelById(id)).find(Boolean);
    if (!channel) return [];
    const { fallbacks: _fallbacks, ...rest } = def;
    return [{ channel, ...rest }];
  });
}

/* ---------- trending rail: curated brand channels, verified multi-source ---------- */

const TRENDING_IDS = [
  "BloombergTV.us",
  "RedBullTV.at",
  "France24.fr",
  "AlJazeera.qa",
  "ABCNewsLive.us",
  "NBCNewsNOW.us",
  "TRTWorld.tr",
  "CBSNews247.us",
  "HistoryHit.uk",
  "B4UMusic.in",
  "NBCSportsNOW.us",
  "Tastemade.us",
  "NickelodeonLatinAmerica.us",
  "EuronewsEnglish.fr",
  "BloombergOriginals.us",
  "CNAOriginals.sg",
];

function byIds(ids: string[]): StreamChannel[] {
  return ids
    .map((id) => channelById(id))
    .filter((c): c is StreamChannel => !!c);
}

/* ---------- opening channel: the first stream a new visitor lands on ----------
   Ordered flagship news channels — verified multi-source, global CDNs, 24/7.
   On first site open the client probes these in priority order (manifest
   liveness, ~4.5s budget) and auto-plays the first healthy one, muted, so a
   visitor always lands on a working live channel. */
const OPENING_IDS = [
  "BloombergTV.us",
  "France24.fr",
  "AlJazeera.qa",
  "ABCNewsLive.us",
  "NBCNewsNOW.us",
  "TRTWorld.tr",
];

export function openingChannels(): StreamChannel[] {
  return byIds(OPENING_IDS);
}

/* ---------- quality rails from the full catalog ---------- */

function rank(c: StreamChannel): number {
  return (c.srcs[0]?.q ?? 0) * 10 + c.srcs.length;
}

function topByCategory(cat: string, n: number, boost?: RegExp): StreamChannel[] {
  const boosted = (c: StreamChannel) => (boost ? Number(boost.test(c.name)) : 0);
  return catalog.channels
    .filter((c) => c.cats.includes(cat) && c.logo && (c.srcs[0]?.q ?? 0) >= 720)
    .sort(
      (a, b) =>
        boosted(b) - boosted(a) ||
        rank(b) - rank(a) ||
        a.name.localeCompare(b.name)
    )
    .slice(0, n);
}

function topOverall(n: number): StreamChannel[] {
  return catalog.channels
    .filter((c) => c.logo && (c.srcs[0]?.q ?? 0) >= 1080 && c.srcs.length >= 2)
    .sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name))
    .slice(0, n);
}

export function homeRows(): HomeRow[] {
  const rows: HomeRow[] = [
    {
      id: "trending",
      title: "Trending Across the Globe",
      subtitle: "The most-watched live channels this week.",
      variant: "poster",
      hue: "from-surface-1 via-surface-1 to-canvas",
      channels: byIds(TRENDING_IDS),
    },
    {
      id: "sports",
      title: "Live Sports Arena",
      subtitle: "Live games, adrenaline and outdoor action.",
      variant: "wide",
      hue: "from-surface-2 via-surface-1 to-canvas",
      category: "sports",
      channels: topByCategory("sports", 14),
    },
    {
      id: "news",
      title: "International News Channels",
      subtitle: "Breaking stories and world events, live.",
      variant: "poster",
      hue: "from-surface-1 via-surface-1 to-canvas",
      category: "news",
      channels: topByCategory("news", 14),
    },
    {
      id: "movies",
      title: "Trending Movies & Cinema",
      subtitle: "Free-to-air cinema running around the clock.",
      variant: "wide",
      hue: "from-surface-2 via-surface-1 to-canvas",
      category: "movies",
      channels: topByCategory("movies", 14),
    },
    {
      id: "anime",
      title: "Anime & Animation",
      subtitle: "Naruto, Animax, RetroCrush — drawn worlds on air 24/7.",
      variant: "poster",
      hue: "from-surface-2 via-surface-1 to-canvas",
      category: "animation",
      channels: topByCategory("animation", 18, /anime|animax|retrocrush|hidive/i),
    },
    {
      id: "series",
      title: "Series & Dramas",
      subtitle: "Serialized stories, episode after episode — no subscription.",
      variant: "poster",
      hue: "from-surface-2 via-surface-1 to-canvas",
      category: "series",
      channels: topByCategory("series", 18),
    },
    {
      id: "kids",
      title: "Kids & Family",
      subtitle: "Cartoons and family-friendly fun, all day.",
      variant: "wide",
      hue: "from-surface-1 via-surface-1 to-canvas",
      category: "kids",
      channels: topByCategory("kids", 14),
    },
    {
      id: "music",
      title: "Music & Concerts",
      subtitle: "Non-stop music videos and live sessions.",
      variant: "poster",
      hue: "from-surface-2 via-surface-1 to-canvas",
      category: "music",
      channels: topByCategory("music", 14),
    },
    {
      id: "docs",
      title: "Documentary & Science",
      subtitle: "Explore the planet, one story at a time.",
      variant: "wide",
      hue: "from-surface-2 via-surface-1 to-canvas",
      category: "documentary",
      channels: topByCategory("documentary", 14),
    },
  ];

  const picks = topOverall(14);
  if (picks.length >= 6) {
    rows.push({
      id: "masterpieces",
      title: "Top Quality · HD Channels",
      subtitle: "Hand-picked channels streaming in the highest quality.",
      variant: "wide",
      hue: "from-surface-1 via-surface-1 to-canvas",
      channels: picks,
    });
  }
  return rows.filter((r) => r.channels.length >= 4);
}

/* ---------- countries with dynamic channel counts (source of truth: catalog) ---------- */

export function allCountriesWithCounts(): CountryChip[] {
  const counts = new Map<string, number>();
  for (const c of catalog.channels) {
    if (c.country) counts.set(c.country, (counts.get(c.country) ?? 0) + 1);
  }
  return catalog.countries
    .map(({ code, name, flag }) => ({
      code,
      name,
      flag,
      count: counts.get(code) ?? 0,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function topCountries(n: number): CountryChip[] {
  return allCountriesWithCounts().slice(0, n);
}

/* ---------- popular channels: storefront chips (All / Sports / …) ---------- */

const POPULAR_N = 10;

const POPULAR_CATS = [
  "sports",
  "news",
  "movies",
  "kids",
  "music",
  "entertainment",
] as const;

const WARM_HUE = "from-surface-1 via-surface-1 to-canvas";

export function popularPicks(): HomeRow[] {
  const rows: HomeRow[] = [
    {
      id: "pop-all",
      title: "All",
      subtitle: "Top picks across every category.",
      variant: "poster",
      hue: WARM_HUE,
      channels: topOverall(POPULAR_N),
    },
    ...POPULAR_CATS.map((cat) => ({
      id: `pop-${cat}`,
      title: cat.charAt(0).toUpperCase() + cat.slice(1),
      subtitle: `Most-watched ${cat} channels.`,
      variant: "poster" as const,
      hue: WARM_HUE,
      category: cat,
      channels: topByCategory(cat, POPULAR_N),
    })),
  ];
  return rows.filter((r) => r.channels.length >= 4);
}
