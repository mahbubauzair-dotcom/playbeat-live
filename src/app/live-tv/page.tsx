import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/stream/app-shell";
import type { TvPreset } from "@/components/stream/app-shell";
import { shellStats, homeData } from "@/lib/shell-data";
import { catalog } from "@/lib/stream.server";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/stream/json-ld";

export const metadata: Metadata = pageMetadata({
  title: "Free Live TV Channels by Country & Category — Playbeat TV",
  description:
    "Explore live television channels by country, language and category. Find available free-to-air streams and watch on supported devices.",
  path: "/live-tv",
});

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function presetFromParams(
  sp: Record<string, string | string[] | undefined>
): TvPreset | undefined {
  const get = (k: string) =>
    typeof sp[k] === "string" ? (sp[k] as string) : undefined;
  const category = get("category");
  const country = get("country");
  const list = get("list");
  const focus = get("focus");
  if (!category && !country && !list && !focus) return undefined;
  return {
    category: category ?? "all",
    country: country ?? "all",
    myList: list === "my",
    recents: list === "recent",
    focusSearch: focus === "1",
    navKey: 1,
  };
}

/* Server-rendered intro for the Live TV directory: meaningful HTML for
   crawlers and no-JS visitors above the interactive channel browser. */
function LiveTvIntro({ total, countriesCount }: { total: number; countriesCount: number }) {
  const quickLinks = [
    { href: "/movies", label: "Movies" },
    { href: "/series", label: "Series" },
    { href: "/sports", label: "Sports" },
    { href: "/news", label: "News" },
    { href: "/category/kids", label: "Kids" },
    { href: "/category/music", label: "Music" },
    { href: "/category/documentary", label: "Documentary" },
  ];
  return (
    <section
      aria-label="About Live TV on Playbeat"
      className="mx-auto max-w-3xl"
    >
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
        Free Live TV Channels by Country &amp; Category
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300/85">
        Browse {total.toLocaleString("en-US")} public free-to-air channels from{" "}
        {countriesCount} countries. Filter by country and category, search by
        name, and start watching instantly in your browser — no account
        needed. Playbeat TV is a discovery guide for third-party public
        streams; individual channel availability varies by region and time of
        day.
      </p>
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-400">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-theme/90">
          Browse
        </span>
        {quickLinks.map((l, i) => (
          <span key={l.href} className="inline-flex items-center gap-2">
            {i > 0 && <span className="text-zinc-600" aria-hidden="true">·</span>}
            <Link
              href={l.href}
              className="text-zinc-300 transition-colors hover:text-theme hover:underline"
            >
              {l.label}
            </Link>
          </span>
        ))}
        <span className="inline-flex items-center gap-2">
          <span className="text-zinc-600" aria-hidden="true">·</span>
          <Link
            href="/countries"
            className="text-zinc-300 transition-colors hover:text-theme hover:underline"
          >
            All countries
          </Link>
        </span>
      </p>
    </section>
  );
}

export default async function LiveTvPage({ searchParams }: Props) {
  const sp = await searchParams;
  const preset = presetFromParams(sp);
  const stats = shellStats();
  return (
    <>
      <JsonLd data={webPageJsonLd({
        path: "https://playbeattv.buzz/live-tv",
        name: "Free Live TV Channels by Country & Category — Playbeat TV",
        description:
          "Explore live television channels by country, language and category. Find available free-to-air streams and watch on supported devices.",
      })} />
      <AppShell
        view="tv"
        initialPreset={preset}
        hero={homeData().hero}
        tvIntro={
          <LiveTvIntro
            total={stats.total}
            countriesCount={stats.countriesCount}
          />
        }
        {...stats}
      />
    </>
  );
}
