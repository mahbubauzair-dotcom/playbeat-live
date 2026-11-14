"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Baby,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Globe,
  Heart,
  Info,
  Music2,
  Newspaper,
  Play,
  Radio,
  SearchX,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  getFavoritesSnapshot,
  getFavoritesServerSnapshot,
  getRecentsSnapshot,
  getRecentsServerSnapshot,
  getViewerCountryServerSnapshot,
  getViewerCountrySnapshot,
  qualityLabel,
  regionBoost,
  subscribeFavorites,
  subscribeRecents,
  subscribeViewerCountry,
  type CategoryMeta,
  type StreamCatalog,
  type StreamChannel,
} from "@/lib/stream";
import type { CountryChip, HeroItem, HomeRow } from "@/lib/spotlight";
import { HeroThumbs, PromoPill, SpotlightBand } from "./home-extras";
import type { VodHomeData } from "@/lib/vod-catalog";
import { VodRails } from "./vod-rails";
import { AdSlot } from "./ad-slot";

/* ================================================================== */
/*  HomeView — premium storefront: cinematic hero slider, stats band,  */
/*  genre tiles, country browser, discovery rails, popular grid.       */
/* ================================================================== */

const AUTOPLAY_MS = 8500;

export function HomeView({
  hero,
  rows,
  popular,
  categories,
  catCounts,
  total,
  countriesCount,
  countryChips,
  vod = null,
  onPlay,
  isFavorite,
  onToggleFavorite,
  onBrowseCategory,
  onBrowseAll,
  onAbout,
}: {
  hero: HeroItem[];
  rows: HomeRow[];
  popular: HomeRow[];
  categories: CategoryMeta[];
  catCounts: Record<string, number>;
  total: number;
  countriesCount: number;
  countryChips: CountryChip[];
  /** VOD rails + line status (server-fetched) */
  vod?: VodHomeData | null;
  onPlay: (ch: StreamChannel) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onBrowseCategory: (cat: string) => void;
  onBrowseAll: () => void;
  onAbout: () => void;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = hero.length;
  const sliderRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  /* gentle scroll-reveal for sections — classes are added via JS only, so
     content is never hidden without IntersectionObserver support */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-revealed");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.06 }
    );
    root.querySelectorAll("section").forEach((el) => {
      if (el.closest("[data-no-reveal]")) return;
      el.classList.add("reveal");
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const go = useCallback(
    (i: number) => setActive((i + count) % count),
    [count]
  );

  /* auto-advance every ~8.5s — pauses on hover, interaction and reduced-motion */
  useEffect(() => {
    if (count <= 1 || paused || prefersReducedMotion) return;
    const t = setInterval(() => {
      if (!document.hidden) setActive((i) => (i + 1) % count);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [active, count, paused, prefersReducedMotion]);

  /* keyboard navigation while the slider has focus */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(active - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(active + 1);
      }
    },
    [active, go]
  );

  /* touch / pointer swipe */
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    touchX.current = e.clientX;
  }, []);
  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (touchX.current === null) return;
      const dx = e.clientX - touchX.current;
      touchX.current = null;
      if (Math.abs(dx) > 40) go(active + (dx < 0 ? 1 : -1));
    },
    [active, go]
  );

  const scrollToCountries = useCallback(() => {
    document
      .getElementById("countries")
      ?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
  }, [prefersReducedMotion]);

  const current = hero[active];
  const heroReal = hero.some((h) => !h.promo) ? hero.filter((h) => !h.promo) : hero;
  const fav = current ? isFavorite(current.channel.id) : false;

  const chipCategories = useMemo(() => {
    const featured = [
      "news",
      "entertainment",
      "music",
      "movies",
      "series",
      "sports",
      "kids",
      "documentary",
    ];
    const picked = featured
      .map((id) => categories.find((c) => c.id === id))
      .filter((c): c is CategoryMeta => !!c);
    const rest = [...categories]
      .filter((c) => !featured.includes(c.id))
      .sort((a, b) => (catCounts[b.id] ?? 0) - (catCounts[a.id] ?? 0));
    return { picked, rest };
  }, [categories, catCounts]);

  if (!current) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-32 text-center">
        <SearchX className="size-10 text-zinc-700" />
        <p className="text-sm text-zinc-500">
          The channel catalog is empty — rebuild the data bundle and refresh.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" ref={rootRef}>
      {/* ====================== CINEMATIC HERO SLIDER ====================== */}
      <section
        aria-label="Featured highlights"
        aria-roledescription="carousel"
        className="px-3 pt-3 sm:px-5 sm:pt-4"
        onKeyDown={onKeyDown}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <div
          ref={sliderRef}
          className="relative min-h-[440px] overflow-hidden rounded-3xl border border-white/5 lg:min-h-[520px]"
        >
          {/* backdrops (crossfade + gentle zoom) */}
          <div className="absolute inset-0" aria-hidden="true">
            {hero.map((h, i) => (
              <img
                key={h.channel.id}
                src={h.backdrop}
                alt=""
                loading={i === 0 ? "eager" : "lazy"}
                className={cn(
                  "absolute inset-0 size-full object-cover transition-opacity duration-[1200ms] ease-out motion-safe:data-[active=true]:scale-105 motion-reduce:data-[active=true]:scale-100",
                  i === active ? "opacity-100" : "opacity-0"
                )}
                data-active={i === active}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c0e] via-[#0c0c0e]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-transparent to-[#0c0c0e]/40" />
          </div>

          {/* top-right tag */}
          <span className="absolute right-5 top-5 z-10 hidden rounded-md border border-white/10 bg-black/40 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.24em] text-zinc-300 backdrop-blur sm:block">
            Free live TV
          </span>

          {/* content */}
          <div className="relative z-10 flex min-h-[440px] flex-col justify-end p-6 sm:min-h-[520px] sm:p-10">
            <p className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-theme">
              <span className="size-1.5 animate-pulse rounded-full bg-theme" />
              {current.eyebrow}
            </p>

            <h1 className="font-display mt-4 max-w-3xl text-4xl font-extrabold leading-[1.04] text-white drop-shadow-[0_6px_30px_rgba(0,0,0,0.8)] sm:text-6xl lg:text-7xl">
              {splitHeadline(current.tagline)[0]}{" "}
              <span className="bg-theme bg-clip-text text-transparent">
                {splitHeadline(current.tagline)[1]}
              </span>
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-300/85 sm:text-[15px]">
              {current.description}
            </p>

            {current.promo ? (
              <PromoPill promo={current.promo} />
            ) : (
            <button
              onClick={() => onPlay(current.channel)}
              className="group/ch mt-4 inline-flex max-w-fit items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3.5 py-1.5 text-left backdrop-blur transition-colors hover:border-theme/50"
              aria-label={`Watch ${current.channel.name} live now`}
            >
              <span className="grid size-5 place-items-center rounded-full bg-theme text-white transition-transform group-hover/ch:scale-110">
                <Play className="size-2.5 fill-current" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-300">
                Now streaming · {current.channel.flag} {current.channel.name}{" "}
                · {current.channel.srcs.length} source
                {current.channel.srcs.length === 1 ? "" : "s"}
              </span>
            </button>)}

            {/* actions */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() =>
                  current.promo
                    ? window.location.assign(current.promo.href)
                    : current.focusCategory === "all"
                    ? onBrowseAll()
                    : onBrowseCategory(current.focusCategory)
                }
                className="inline-flex h-11 items-center gap-2 rounded-full bg-theme px-6 text-sm font-bold text-white shadow-xl shadow-theme/25 transition-all hover:brightness-110 focus-visible:outline-2 focus-visible:outline-theme"
              >
                {current.primaryLabel}
                <ArrowUpRight className="size-4" />
              </button>

              <button
                onClick={scrollToCountries}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 text-sm font-medium text-zinc-100 backdrop-blur transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-theme"
              >
                <Globe className="size-4" />
                Browse by country
              </button>

              {!current.promo && (
              <>
<Popover>
                <PopoverTrigger asChild>
                  <button
                    aria-label="View channel details"
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 text-sm font-medium text-zinc-100 backdrop-blur transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-theme"
                  >
                    <Info className="size-4" />
                    View Details
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  sideOffset={12}
                  className="w-80 border-white/10 bg-[#141416]/95 p-0 text-zinc-100 backdrop-blur-xl"
                >
                  <ChannelDetails
                    channel={current.channel}
                    categories={categories}
                    onBrowseCategory={onBrowseCategory}
                  />
                </PopoverContent>
              </Popover>

              <button
                onClick={() => onToggleFavorite(current.channel.id)}
                aria-pressed={fav}
                aria-label={
                  fav
                    ? `Remove ${current.channel.name} from My List`
                    : `Add ${current.channel.name} to My List`
                }
                className={cn(
                  "grid size-11 place-items-center rounded-full border backdrop-blur transition-colors",
                  fav
                    ? "border-theme/50 bg-theme/15 text-theme"
                    : "border-white/15 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <Heart className={cn("size-4.5", fav && "fill-theme")} />
              </button>
              </>
            )}
            </div>

            <HeroThumbs hero={hero} active={active} go={go} />

            {/* bottom bar: dots left, counter + arrows right */}
            <div className="mt-9 flex items-center justify-between gap-4">
              <div
                className="flex items-center gap-1.5"
                role="tablist"
                aria-label="Spotlight selection"
              >
                {hero.map((h, i) => (
                  <button
                    key={h.channel.id}
                    role="tab"
                    aria-selected={i === active}
                    aria-label={`Show slide ${i + 1}: ${h.eyebrow}`}
                    onClick={() => go(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i === active
                        ? "w-7 bg-theme"
                        : "w-1.5 bg-white/25 hover:bg-white/50"
                    )}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="mr-1 font-mono text-xs text-zinc-400">
                  {String(active + 1).padStart(2, "0")} /{" "}
                  {String(count).padStart(2, "0")}
                </span>
                <button
                  onClick={() => go(active - 1)}
                  aria-label="Previous slide"
                  className="grid size-9 place-items-center rounded-full border border-white/15 bg-black/30 text-zinc-300 backdrop-blur transition-colors hover:border-theme/60 hover:text-theme"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={() => go(active + 1)}
                  aria-label="Next slide"
                  className="grid size-9 place-items-center rounded-full border border-white/15 bg-black/30 text-zinc-300 backdrop-blur transition-colors hover:border-theme/60 hover:text-theme"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ STATS BAND ============================ */}
      <StatsBand
        total={total}
        countriesCount={countriesCount}
        categoriesCount={categories.length}
        onExplore={onBrowseAll}
      />

      {/* ====================== SSR INTRO (crawlable) ====================== */}
      <section
        aria-label="About Playbeat Live"
        className="mx-auto mt-8 w-full max-w-[1400px] px-3 sm:px-5"
      >
        <p className="max-w-3xl text-sm leading-relaxed text-zinc-400">
          Playbeat Live is a free streaming guide to {total.toLocaleString("en-US")}+ public
          free-to-air television channels from {countriesCount} countries — live
          news, sports, movies, series, music, kids and documentary channels,
          organised by country and category. No account, no fees: pick a
          channel and watch instantly in your browser, on mobile, or install
          the app for full-screen living-room viewing.
        </p>
      </section>

      {/* ============================ GENRE TILES ============================ */}
      <GenreTiles onBrowseCategory={onBrowseCategory} />

      {/* ========================= COUNTRY BROWSER ========================= */}
      <CountryBrowser
        chips={countryChips}
        countriesCount={countriesCount}
        total={total}
      />

      {/* ============================== ROWS ============================== */}
      <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-5">
        {/* ======================= NOW PLAYING HEADER ======================= */}
        <section
          aria-label="Now playing"
          className="mt-10 flex flex-wrap items-end justify-between gap-3"
        >
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-theme">
              Playbeat Live · Live &amp; 24/7
            </p>
            <h2 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Your world.{" "}
              <span className="bg-theme bg-clip-text text-transparent">
                Now playing.
              </span>
            </h2>
            <p className="mt-1.5 text-sm text-zinc-500">
              Discover your next favourite channel with Playbeat.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-theme/25 bg-theme/10 px-3.5 py-1.5 font-mono text-[11px] font-semibold text-theme">
            <Radio className="size-3.5" />
            {total.toLocaleString()} channels
          </span>
        </section>

        {/* ============================ SPOTLIGHT DUO ============================ */}
        <section aria-label="Channel spotlight" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <SpotlightCard
              channel={heroReal[0].channel}
              categories={categories}
              onPlay={onPlay}
            />
            <ChannelSpotlightCard
              channel={heroReal[1] ? heroReal[1].channel : heroReal[0].channel}
              categories={categories}
              onPlay={onPlay}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
              onBrowseCategory={onBrowseCategory}
            />
          </div>
        </section>

        {/* ========================= CATEGORY CHIPS ========================= */}
        <section
          aria-label="Explore categories"
          className="mt-10 flex flex-wrap items-center gap-2"
        >
          <span className="mr-1 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Explore categories
          </span>
          {chipCategories.picked.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onBrowseCategory(cat.id)}
              className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-theme/40 hover:bg-theme/10 hover:text-white"
            >
              {cat.name}
              <span className="ml-1.5 font-mono text-[10px] text-zinc-600">
                {catCounts[cat.id] ?? 0}
              </span>
            </button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1 rounded-full border border-theme/30 bg-theme/10 px-3.5 py-1.5 text-xs font-medium text-theme transition-colors hover:bg-theme/20">
                All categories
                <ChevronDown className="size-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={10}
              className="w-80 border-white/10 bg-[#141416]/95 p-3 backdrop-blur-xl"
            >
              <div className="grid max-h-72 grid-cols-2 gap-1 overflow-y-auto">
                {chipCategories.rest.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => onBrowseCategory(cat.id)}
                    className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs text-zinc-300 transition-colors hover:bg-theme/15 hover:text-white"
                  >
                    {cat.name}
                    <span className="font-mono text-[10px] text-zinc-600">
                      {catCounts[cat.id] ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <span className="ml-auto hidden font-mono text-[11px] text-zinc-600 sm:block">
            {total.toLocaleString()} channels · {countriesCount} countries · free-to-air
          </span>
        </section>

        <PersonalRails
          onPlay={onPlay}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
        />

        {/* VOD movies & series — transferred from the panel, NEXA rails */}
        {vod && !vod.ok && (vod.reason === "expired" || vod.reason === "banned") && (
          <section className="mt-10 flex flex-wrap items-center gap-3 rounded-2xl border border-theme/25 bg-theme/[0.06] px-5 py-4">
            <Clapperboard className="size-5 shrink-0 text-theme" />
            <p className="min-w-0 flex-1 text-sm text-zinc-300">
              <span className="font-bold text-white">Movie library locked.</span>{" "}
              Your IPTV subscription {vod.reason === "expired" ? "has expired" : "is suspended"} — renew your Star IPTV line and every
              movie &amp; series fills in here automatically.
            </p>
            <a
              href="/movies"
              className="shrink-0 rounded-full bg-theme px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-theme/25 hover:brightness-110"
            >
              Check library
            </a>
          </section>
        )}
        {vod?.ok && vod.rails.length > 0 && (
          <div className="mt-12">
            <VodRails rails={vod.rails} />
          </div>
        )}

        {rows.slice(0, 3).map((row) => (
          <ContentRow
            key={row.id}
            row={row}
            categories={categories}
            onPlay={onPlay}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
            onExplore={() =>
              row.category ? onBrowseCategory(row.category) : onBrowseAll()
            }
          />
        ))}

        <SpotlightBand
          channels={popular[0]?.channels ?? rows[0]?.channels ?? []}
          backdrops={hero.map((h) => h.backdrop)}
          categories={categories}
          onPlay={onPlay}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
        />

        {/* ==================== CINEMA DISCOVERY TILES ==================== */}
        <CinemaTiles onBrowseCategory={onBrowseCategory} />

        {/* ================= POPULAR CHANNELS ================= */}
        <PopularSection
          popular={popular}
          categories={categories}
          total={total}
          onPlay={onPlay}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
          onBrowseCategory={onBrowseCategory}
          onBrowseAll={onBrowseAll}
        />

        {rows.slice(3, 6).map((row) => (
          <ContentRow
            key={row.id}
            row={row}
            categories={categories}
            onPlay={onPlay}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
            onExplore={() =>
              row.category ? onBrowseCategory(row.category) : onBrowseAll()
            }
          />
        ))}

        {/* ====================== SPORTS FEATURE BANNER ====================== */}
        <SportsBanner onBrowseAll={onBrowseAll} onAbout={onAbout} />

        {rows.slice(6).map((row) => (
          <ContentRow
            key={row.id}
            row={row}
            categories={categories}
            onPlay={onPlay}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
            onExplore={() =>
              row.category ? onBrowseCategory(row.category) : onBrowseAll()
            }
          />
        ))}

        <AdSlot slot="footer" className="mt-10" />
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Hero headline splitter — amber-gradients the final word            */
/* ================================================================== */

function splitHeadline(tagline: string): [string, string] {
  const idx = tagline.lastIndexOf(" ");
  if (idx <= 0) return [tagline, ""];
  return [tagline.slice(0, idx), tagline.slice(idx + 1)];
}

/* ================================================================== */
/*  Stats band — indexed channels · countries · categories             */
/* ================================================================== */

function StatsBand({
  total,
  countriesCount,
  categoriesCount,
  onExplore,
}: {
  total: number;
  countriesCount: number;
  categoriesCount: number;
  onExplore: () => void;
}) {
  return (
    <section
      aria-label="Catalog statistics"
      className="mx-auto mt-6 w-full max-w-[1400px] px-3 sm:px-5"
    >
      <div className="flex flex-wrap items-center gap-x-10 gap-y-3 rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4">
        <span className="flex items-center gap-2.5">
          <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
          <strong className="font-display text-2xl font-extrabold tracking-tight text-white">
            {total.toLocaleString()}
          </strong>
          <span className="text-xs text-zinc-500">indexed channels</span>
        </span>
        <span className="flex items-center gap-2.5">
          <strong className="font-display text-2xl font-extrabold tracking-tight text-white">
            {countriesCount}
          </strong>
          <span className="text-xs text-zinc-500">countries</span>
        </span>
        <span className="flex items-center gap-2.5">
          <strong className="font-display text-2xl font-extrabold tracking-tight text-white">
            {categoriesCount}
          </strong>
          <span className="text-xs text-zinc-500">content categories</span>
        </span>
        <button
          onClick={onExplore}
          className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-theme transition-colors hover:text-theme"
        >
          Explore the catalog
          <ArrowUpRight className="size-3.5" />
        </button>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  Genre tiles — four colored doors into the catalog                  */
/* ================================================================== */

const GENRE_TILES = [
  {
    cat: "news",
    small: "Breaking & beyond",
    title: "World News",
    icon: Newspaper,
    tile: "border-theme/20 bg-gradient-to-br from-[#242428] via-[#1b1b1e] to-[#101013]",
    glyph: "text-theme",
    hover: "hover:border-theme/50",
  },
  {
    cat: "sports",
    small: "Game on",
    title: "Live Sports",
    icon: Trophy,
    tile: "border-theme/20 bg-gradient-to-br from-[#242428] via-[#1b1b1e] to-[#101013]",
    glyph: "text-theme",
    hover: "hover:border-theme/50",
  },
  {
    cat: "music",
    small: "Feel the rhythm",
    title: "Music & Live",
    icon: Music2,
    tile: "border-theme/25 bg-gradient-to-br from-[#242428] via-[#1b1b1e] to-[#101013]",
    glyph: "text-theme",
    hover: "hover:border-theme/60",
  },
  {
    cat: "kids",
    small: "Fun for all",
    title: "Kids & Anime",
    icon: Baby,
    tile: "border-theme/25 bg-gradient-to-br from-[#242428] via-[#1b1b1e] to-[#101013]",
    glyph: "text-theme",
    hover: "hover:border-theme/60",
  },
] as const;

function GenreTiles({
  onBrowseCategory,
}: {
  onBrowseCategory: (cat: string) => void;
}) {
  /* crawlable hrefs: dedicated routes for the four headline categories */
  const genreHref = (cat: string) =>
    ["movies", "series", "sports", "news"].includes(cat)
      ? `/${cat}`
      : `/category/${cat}`;
  return (
    <section
      aria-label="Explore genres"
      className="mx-auto mt-6 grid w-full max-w-[1400px] grid-cols-1 gap-3 px-3 sm:grid-cols-2 sm:px-5 2xl:grid-cols-4"
    >
      {GENRE_TILES.map((g) => (
        <Link
          key={g.cat}
          href={genreHref(g.cat)}
          onClick={(e) => {
            e.preventDefault();
            onBrowseCategory(g.cat);
          }}
          className={cn(
            "group flex items-center gap-4 rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-theme",
            g.tile,
            g.hover
          )}
        >
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-lg bg-white/5 transition-transform duration-300 group-hover:scale-110",
              g.glyph
            )}
          >
            <g.icon className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {g.small}
            </span>
            <span className="mt-0.5 block truncate text-[13px] font-extrabold tracking-tight text-white">
              {g.title}
            </span>
          </span>
          <ArrowUpRight className="size-3.5 shrink-0 text-zinc-500 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-theme" />
        </Link>
      ))}
    </section>
  );
}

/* ================================================================== */
/*  Country browser — searchable chips with dynamic channel counts     */
/* ================================================================== */

function CountryBrowser({
  chips,
  countriesCount,
  total,
}: {
  chips: CountryChip[];
  countriesCount: number;
  total: number;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      (q
        ? chips.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.code.toLowerCase().includes(q)
          )
        : chips
      ).slice(0, q ? 24 : 12),
    [chips, q]
  );

  return (
    <section
      id="countries"
      aria-label="Browse by country"
      className="mx-auto mt-12 w-full max-w-[1400px] scroll-mt-20 px-3 sm:px-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-theme">
            One world · every screen
          </p>
          <h2 className="font-display mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Where would you like to{" "}
            <span className="bg-theme bg-clip-text text-transparent">
              watch?
            </span>
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Find channels from your country, or discover broadcasts across
            borders — {total.toLocaleString()} channels from {countriesCount}{" "}
            countries.
          </p>
        </div>
        <Link
          href="/countries"
          className="inline-flex items-center gap-1 text-xs font-semibold text-theme transition-colors hover:text-theme"
        >
          View all countries
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <div className="relative max-w-md">
          <Globe className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search countries…"
            aria-label="Search countries"
            className="h-10 w-full rounded-full border border-white/10 bg-white/[0.04] pl-9 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-theme/40 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2.5">
          {visible.map((c) => (
            <Link
              key={c.code}
              href={`/live-tv?country=${encodeURIComponent(c.code)}`}
              className="group inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-theme/40 hover:bg-theme/[0.06] focus-visible:outline-2 focus-visible:outline-theme"
            >
              <span className="text-lg leading-none">{c.flag}</span>
              <span className="text-[13px] font-semibold text-zinc-200 group-hover:text-white">
                {c.name}
              </span>
              <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[10px] text-zinc-500 group-hover:text-theme">
                {c.count.toLocaleString()}
              </span>
            </Link>
          ))}
          {visible.length === 0 && (
            <p className="text-sm text-zinc-500">
              No country matches “{query}” — try another name or{" "}
              <Link href="/countries" className="text-theme hover:underline">
                browse the full list
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  Cinema discovery tiles                                             */
/* ================================================================== */

const CINEMA_TILES = [
  {
    cat: "movies",
    img: "/hero/redesign/hero-cinema.webp",
    alt: "Golden cinema marquee at night",
    small: "Featured genre",
    title: "Cinema after dark",
    cta: "Explore films & stories",
  },
  {
    cat: "documentary",
    img: "/hero/redesign/hero-news.webp",
    alt: "Television studio with a glowing world map",
    small: "World stories",
    title: "Stories worth watching",
    cta: "Discover documentaries",
  },
] as const;

function CinemaTiles({
  onBrowseCategory,
}: {
  onBrowseCategory: (cat: string) => void;
}) {
  return (
    <section
      aria-label="Cinema and documentary discovery"
      className="mt-12 grid gap-4 md:grid-cols-2"
    >
      {CINEMA_TILES.map((t) => (
        <button
          key={t.cat}
          onClick={() => onBrowseCategory(t.cat)}
          className="group relative min-h-[180px] overflow-hidden rounded-2xl border border-white/10 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-theme/40 focus-visible:outline-2 focus-visible:outline-theme"
        >
          <img
            src={t.img}
            alt={t.alt}
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute inset-0 bg-gradient-to-r from-[#0c0c0e] via-[#0c0c0e]/55 to-transparent" />
          <span className="relative z-10 flex h-full min-h-[180px] max-w-xs flex-col justify-center p-6">
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-theme">
              {t.small}
            </span>
            <span className="font-display mt-1.5 text-xl font-extrabold tracking-tight text-white">
              {t.title}
            </span>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-theme/90">
              {t.cta}
              <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </span>
        </button>
      ))}
    </section>
  );
}

/* ================================================================== */
/*  Sports feature banner                                              */
/* ================================================================== */

function SportsBanner({
  onBrowseAll,
  onAbout,
}: {
  onBrowseAll: () => void;
  onAbout: () => void;
}) {
  return (
    <section
      aria-label="Sports arena spotlight"
      className="relative mb-2 mt-14 overflow-hidden rounded-2xl border border-theme/10 bg-gradient-to-br from-[#141416] via-[#141416] to-[#0c0c0e]"
    >
      <img
        src="/hero/redesign/hero-football.webp"
        alt="Footballers competing under stadium floodlights"
        loading="lazy"
        className="absolute inset-0 size-full object-cover opacity-40 lg:left-1/4 lg:w-3/4 lg:opacity-90 lg:[mask-image:linear-gradient(to_right,transparent,black_45%)]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c0e] via-[#0c0c0e]/70 to-transparent lg:via-[#0c0c0e]/30" />

      <div className="relative z-10 max-w-xl p-6 sm:p-9 lg:p-11">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
          Game day energy
        </p>
        <h3 className="font-display mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Every moment.
          <br />
          <span className="bg-theme bg-clip-text text-transparent">
            Every game.
          </span>
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-zinc-300/85">
          From football and cricket to action sports — explore the live sports
          broadcasters available in your region, free and in your browser.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={onBrowseAll}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-theme px-5 text-sm font-bold text-white shadow-lg shadow-theme/25 transition-all hover:brightness-110"
          >
            <Play className="size-4 fill-current" />
            Browse all channels
          </button>
          <button
            onClick={onAbout}
            className="inline-flex h-10 items-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-medium text-zinc-100 backdrop-blur transition-colors hover:bg-white/10"
          >
            <Info className="mr-2 size-4" />
            Content policy
          </button>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 z-10 hidden w-60 items-center gap-3 rounded-xl border border-white/10 bg-black/55 p-3 backdrop-blur-xl xl:flex">
        <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-emerald-400/50 to-yellow-600/30">
          <img
            src="/hero/redesign/hero-cricket.webp"
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-zinc-100">
            Sports Arena
          </span>
          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-zinc-400">
            Live TV · 100% free
          </span>
        </span>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  Personal rails — My Favorites + Continue watching (home)           */
/* ================================================================== */

function PersonalRails({
  onPlay,
  isFavorite,
  onToggleFavorite,
}: {
  onPlay: (ch: StreamChannel) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const favs = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getFavoritesServerSnapshot
  );
  const recents = useSyncExternalStore(
    subscribeRecents,
    getRecentsSnapshot,
    getRecentsServerSnapshot
  );
  const [catalog, setCatalog] = useState<StreamCatalog | null>(null);

  const wanted = favs.length > 0 || recents.length > 0;

  useEffect(() => {
    if (!wanted || catalog) return;
    let cancelled = false;
    fetch("/api/catalog")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: StreamCatalog) => {
        if (!cancelled) setCatalog(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [wanted, catalog]);

  const byId = useMemo(
    () => new Map((catalog?.channels ?? []).map((c) => [c.id, c])),
    [catalog]
  );

  const favChannels = useMemo(
    () => favs.map((id) => byId.get(id)).filter((c): c is StreamChannel => !!c),
    [favs, byId]
  );
  const recentChannels = useMemo(
    () =>
      recents
        .slice()
        .reverse()
        .map((r) => byId.get(r.id))
        .filter((c): c is StreamChannel => !!c),
    [recents, byId]
  );

  if (favChannels.length === 0 && recentChannels.length === 0) return null;

  return (
    <>
      {favChannels.length > 0 && (
        <ContentRow
          row={{
            id: "home-favs",
            title: "My Favorites",
            subtitle: "Channels you saved — stored only in this browser.",
            variant: "poster",
            hue: "from-surface-2 via-surface-1 to-canvas",
            channels: favChannels,
          }}
          categories={[]}
          onPlay={onPlay}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
          onExplore={() => {}}
          hideExplore
        />
      )}
      {recentChannels.length > 0 && (
        <ContentRow
          row={{
            id: "home-recents",
            title: "Continue Watching",
            subtitle: "Pick up where you left off.",
            variant: "poster",
            hue: "from-surface-2 via-surface-1 to-canvas",
            channels: recentChannels,
          }}
          categories={[]}
          onPlay={onPlay}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
          onExplore={() => {}}
          hideExplore
        />
      )}
    </>
  );
}

/* ================================================================== */
/*  Spotlight duo cards                                                */
/* ================================================================== */

function SpotlightCard({
  channel,
  categories,
  onPlay,
}: {
  channel: StreamChannel;
  categories: CategoryMeta[];
  onPlay: (ch: StreamChannel) => void;
}) {
  return (
    <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-theme/10 via-[#141416] to-[#101013]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.06),transparent_62%)]" />

      {/* top badges */}
      <span className="absolute left-4 top-4 rounded-md border border-theme/30 bg-theme/10 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-theme">
        On air
      </span>
      <span className="absolute right-4 top-4 rounded-md bg-white/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-200 backdrop-blur">
        {channel.cats[0]
          ? categoryNameOf(channel.cats[0], categories)
          : "General"}
      </span>

      {/* centered logo on white tile */}
      <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
        <span className="grid size-24 place-items-center rounded-2xl bg-white p-3 shadow-2xl shadow-black/40">
          {channel.logo ? (
            <img
              src={channel.logo}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Radio className="size-8 text-zinc-500" />
          )}
        </span>
      </div>

      {/* bottom info */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
            In the spotlight
          </p>
          <h3 className="font-display mt-1 truncate text-xl font-extrabold tracking-tight text-white sm:text-2xl"><Link href={`/channel/${encodeURIComponent(channel.id)}`} className="hover:text-theme">{channel.name}</Link></h3>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            {channel.country || "INT"} ·{" "}
            {channel.cats[0]
              ? categoryNameOf(channel.cats[0], categories)
              : "General"}{" "}
            · {qualityLabel(channel)}
          </p>
          <button
            onClick={() => onPlay(channel)}
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-full bg-theme px-4 text-[13px] font-bold text-white transition-all hover:brightness-110"
          >
            <Play className="size-3.5 fill-current" />
            Watch live
          </button>
        </div>
        <button
          onClick={() => onPlay(channel)}
          aria-label={`Play ${channel.name}`}
          className="grid size-14 shrink-0 place-items-center rounded-full bg-theme text-white shadow-xl shadow-theme/25 transition-transform hover:scale-105"
        >
          <Play className="size-6 fill-current" />
        </button>
      </div>
    </div>
  );
}

function ChannelSpotlightCard({
  channel,
  categories,
  onPlay,
  isFavorite,
  onToggleFavorite,
  onBrowseCategory,
}: {
  channel: StreamChannel;
  categories: CategoryMeta[];
  onPlay: (ch: StreamChannel) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onBrowseCategory: (cat: string) => void;
}) {
  const fav = isFavorite(channel.id);
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white">Channel spotlight</h3>
        <Sparkles className="size-4 text-theme" />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-2">
          {channel.logo ? (
            <img
              src={channel.logo}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Radio className="size-5 text-zinc-500" />
          )}
        </span>
        <div className="min-w-0">
          <button
            onClick={() => onPlay(channel)}
            className="block max-w-full truncate text-left text-[15px] font-bold text-white hover:text-theme"
          >
            {channel.name}
          </button>
          <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            {channel.cats[0]
              ? categoryNameOf(channel.cats[0], categories)
              : "General"}{" "}
            · Live broadcast
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-zinc-400">
        Open the player to watch live and explore the full lineup — free,
        no account, straight in your browser.
      </p>

      <div className="mt-5 space-y-2.5">
        <button
          onClick={() => onToggleFavorite(channel.id)}
          aria-pressed={fav}
          className={cn(
            "flex h-10 w-full items-center justify-center gap-2 rounded-full border text-[13px] font-medium transition-colors",
            fav
              ? "border-theme/50 bg-theme/10 text-theme"
              : "border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10"
          )}
        >
          <Heart className={cn("size-4", fav && "fill-theme")} />
          {fav ? "In My List" : "Add to Favorites"}
        </button>
        <button
          onClick={() =>
            onBrowseCategory(channel.cats[0] ?? "general")
          }
          className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 text-[13px] font-medium text-zinc-200 transition-colors hover:bg-white/10"
        >
          <CalendarClock className="size-4" />
          Browse{" "}
          {channel.cats[0]
            ? categoryNameOf(channel.cats[0], categories)
            : "General"}
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Popular channels — chips + poster grid                             */
/* ================================================================== */

const POPULAR_VISIBLE = 10;

function PopularSection({
  popular,
  categories,
  total,
  onPlay,
  isFavorite,
  onToggleFavorite,
  onBrowseCategory,
  onBrowseAll,
}: {
  popular: HomeRow[];
  categories: CategoryMeta[];
  total: number;
  onPlay: (ch: StreamChannel) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onBrowseCategory: (cat: string) => void;
  onBrowseAll: () => void;
}) {
  const [chipIdx, setChipIdx] = useState(0);
  const viewerCountry = useSyncExternalStore(
    subscribeViewerCountry,
    getViewerCountrySnapshot,
    getViewerCountryServerSnapshot
  );
  const row = popular?.[chipIdx];
  const rowChannels = useMemo(
    () => (row ? regionBoost(row.channels, viewerCountry) : []),
    [row, viewerCountry]
  );

  if (!row || rowChannels.length === 0) return null;

  return (
    <section className="mt-12" aria-label="Top 10 Today">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white sm:text-xl">
          <span className="grid size-8 place-items-center rounded-lg bg-theme/15">
            <Trophy className="size-4 text-theme" />
          </span>
          Top 10 Today
        </h3>
        <button
          onClick={onBrowseAll}
          className="inline-flex items-center gap-1 text-xs font-semibold text-theme transition-colors hover:brightness-125"
        >
          View all {total.toLocaleString()}
          <ChevronRight className="size-3.5" />
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-1.5" role="group" aria-label="Popular category">
        {popular.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setChipIdx(i)}
            aria-pressed={i === chipIdx}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              i === chipIdx
                ? "bg-theme text-white"
                : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
            )}
          >
            {p.title}
          </button>
        ))}
        <span className="ml-1 hidden font-mono text-[10px] text-zinc-600 sm:inline">
          {row.category
            ? `${row.channels.length} top picks`
            : "highest quality + multi-source"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-3.5 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        {rowChannels.slice(0, POPULAR_VISIBLE).map((ch, i) => (
          <PosterCard
            key={ch.id}
            channel={ch}
            hue={row.hue}
            categories={categories}
            onPlay={onPlay}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
            rank={i + 1}
          />
        ))}
      </div>

      {row.category && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => onBrowseCategory(row.category as string)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 text-xs font-medium text-zinc-200 transition-colors hover:border-theme/40 hover:text-theme"
          >
            Explore all {row.title.toLowerCase()}
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      )}
      {/* keeps the layout honest: chips + grid only */}
    </section>
  );
}

/* ================================================================== */
/*  Content row (horizontal carousel with arrows)                      */
/* ================================================================== */

function ContentRow({
  row,
  categories,
  onPlay,
  isFavorite,
  onToggleFavorite,
  onExplore,
  hideExplore = false,
}: {
  row: HomeRow;
  categories: CategoryMeta[];
  onPlay: (ch: StreamChannel) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onExplore: () => void;
  hideExplore?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  const scroll = useCallback((dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }, []);

  return (
    <section className="mt-12" aria-label={row.title}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold tracking-tight text-white sm:text-xl">
            {row.title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-zinc-500">{row.subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!hideExplore && (
            <button
              onClick={onExplore}
              className="inline-flex items-center gap-1 text-xs font-semibold text-theme transition-colors hover:text-theme"
            >
              Explore
              <ArrowRight className="size-3.5" />
            </button>
          )}
          <button
            onClick={() => scroll(-1)}
            aria-label={`Scroll ${row.title} left`}
            className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            aria-label={`Scroll ${row.title} right`}
            className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        className="scrollbar-hide -mx-1 flex snap-x gap-3.5 overflow-x-auto px-1 pb-1 sm:gap-4"
      >
        {row.variant === "poster"
          ? row.channels.map((ch) => (
              <div
                key={ch.id}
                className="w-[164px] shrink-0 snap-start sm:w-[186px]"
              >
                <PosterCard
                  channel={ch}
                  hue={row.hue}
                  categories={categories}
                  onPlay={onPlay}
                  isFavorite={isFavorite}
                  onToggleFavorite={onToggleFavorite}
                />
              </div>
            ))
          : row.channels.map((ch) => (
              <WideCard
                key={ch.id}
                channel={ch}
                hue={row.hue}
                categories={categories}
                onPlay={onPlay}
                isFavorite={isFavorite}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
      </div>
    </section>
  );
}

/* ================================================================== */
/*  Cards — premium poster + wide variants                             */
/* ================================================================== */

interface CardProps {
  channel: StreamChannel;
  hue: string;
  categories: CategoryMeta[];
  onPlay: (ch: StreamChannel) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  /** NEXA-style big rank numeral ("Top 10 Today" row) */
  rank?: number;
}

function cardMeta(channel: StreamChannel, categories: CategoryMeta[]) {
  const first = channel.cats[0]
    ? categoryNameOf(channel.cats[0], categories)
    : "General";
  const rest = channel.cats
    .slice(0, 3)
    .map((c) => categoryNameOf(c, categories))
    .join(" · ");
  return { first, rest };
}

/* Exported for reuse by the dedicated category discovery pages. */
export const PosterCard = memo(function PosterCard({
  channel,
  hue,
  categories,
  onPlay,
  isFavorite,
  onToggleFavorite,
  rank,
}: CardProps) {
  const fav = isFavorite(channel.id);
  const meta = cardMeta(channel, categories);
  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        aria-label={`Watch ${channel.name}`}
        onClick={() => onPlay(channel)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPlay(channel);
          }
        }}
        className={cn(
          "group relative aspect-[2/3] cursor-pointer overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br shadow-lg shadow-black/30 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-theme/40 hover:shadow-2xl hover:shadow-theme/25 focus-visible:outline-2 focus-visible:outline-theme",
          hue
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(255,255,255,0.07),transparent_68%)]" />
        {channel.logo ? (
          <img
            src={channel.logo}
            alt={`${channel.name} logo`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="absolute inset-0 m-auto max-h-[42%] max-w-[70%] rounded-lg object-contain drop-shadow-[0_6px_24px_rgba(0,0,0,0.7)] transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.opacity = "0";
            }}
          />
        ) : (
          <Radio className="absolute inset-0 m-auto size-8 text-zinc-700" />
        )}

        {/* rank numeral — Top 10 Today */}
        {typeof rank === "number" && (
          <span className="rank-numeral pointer-events-none absolute -left-1 bottom-1 z-10 text-[56px] sm:text-[64px]">
            {rank}
          </span>
        )}

        {/* badges */}
        <span className="absolute left-2 top-2 rounded-md border border-white/10 bg-black/60 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-300 backdrop-blur-sm">
          FTA
        </span>
        <span className="absolute right-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-theme backdrop-blur-sm">
          {qualityLabel(channel)}
        </span>
        {channel.srcs.length > 1 && (
          <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 font-mono text-[9px] text-zinc-400 backdrop-blur-sm">
            {channel.srcs.length} SRC
          </span>
        )}

        {/* hover overlay */}
        <div className="absolute inset-0 bg-black/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <span className="absolute inset-0 m-auto grid size-12 place-items-center rounded-full bg-theme text-white opacity-0 shadow-xl shadow-theme/25 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100">
          <Play className="size-5 fill-current" />
        </span>

        {/* favorite */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(channel.id);
          }}
          aria-label={fav ? `Remove ${channel.name} from My List` : `Add ${channel.name} to My List`}
          aria-pressed={fav}
          className={cn(
            "absolute bottom-2 right-2 grid size-7 place-items-center rounded-full bg-black/60 backdrop-blur-sm transition-all hover:bg-black",
            fav
              ? "text-theme opacity-100"
              : "text-zinc-400 opacity-0 hover:text-white group-hover:opacity-100"
          )}
        >
          <Heart className={cn("size-3.5", fav && "fill-theme")} />
        </button>
      </div>

      <div className="mt-2.5 px-0.5">
        <Link href={`/channel/${encodeURIComponent(channel.id)}`} className="block truncate text-[14px] font-semibold text-slate-100 hover:text-theme" title={channel.name}>
          {channel.flag ? `${channel.flag} ` : ""}
          {channel.name}
        </Link>
        <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          {meta.first} · {qualityLabel(channel)}
        </p>
        {meta.rest && meta.rest !== meta.first && (
          <p className="truncate text-[11px] text-zinc-600">{meta.rest}</p>
        )}
      </div>
    </div>
  );
});

const WideCard = memo(function WideCard({
  channel,
  hue,
  categories,
  onPlay,
  isFavorite,
  onToggleFavorite,
}: CardProps) {
  const fav = isFavorite(channel.id);
  const meta = cardMeta(channel, categories);
  return (
    <div className="w-[248px] shrink-0 snap-start sm:w-[272px]">
      <div
        role="button"
        tabIndex={0}
        aria-label={`Watch ${channel.name}`}
        onClick={() => onPlay(channel)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPlay(channel);
          }
        }}
        className={cn(
          "group relative aspect-video cursor-pointer overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br shadow-lg shadow-black/30 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-theme/40 hover:shadow-2xl hover:shadow-theme/25 focus-visible:outline-2 focus-visible:outline-theme",
          hue
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.07),transparent_70%)]" />
        {channel.logo ? (
          <img
            src={channel.logo}
            alt={`${channel.name} logo`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="absolute inset-0 m-auto max-h-[46%] max-w-[54%] rounded-lg object-contain drop-shadow-[0_6px_24px_rgba(0,0,0,0.7)] transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.opacity = "0";
            }}
          />
        ) : (
          <Radio className="absolute inset-0 m-auto size-7 text-zinc-700" />
        )}

        <span className="absolute left-2 top-2 rounded-md border border-white/10 bg-black/60 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-300 backdrop-blur-sm">
          FTA
        </span>
        <span className="absolute right-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-theme backdrop-blur-sm">
          {qualityLabel(channel)}
        </span>

        <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <span className="absolute inset-0 m-auto grid size-11 place-items-center rounded-full bg-theme text-white opacity-0 shadow-xl shadow-theme/25 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100">
          <Play className="size-4.5 fill-current" />
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(channel.id);
          }}
          aria-label={fav ? `Remove ${channel.name} from My List` : `Add ${channel.name} to My List`}
          aria-pressed={fav}
          className={cn(
            "absolute bottom-2 right-2 grid size-7 place-items-center rounded-full bg-black/60 backdrop-blur-sm transition-all hover:bg-black",
            fav
              ? "text-theme opacity-100"
              : "text-zinc-400 opacity-0 hover:text-white group-hover:opacity-100"
          )}
        >
          <Heart className={cn("size-3.5", fav && "fill-theme")} />
        </button>
      </div>

      <div className="mt-2.5 px-0.5">
        <Link href={`/channel/${encodeURIComponent(channel.id)}`} className="block truncate text-[14px] font-semibold text-slate-100 hover:text-theme" title={channel.name}>
          {channel.flag ? `${channel.flag} ` : ""}
          {channel.name}
        </Link>
        <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          {meta.first} · {qualityLabel(channel)}
          {channel.srcs.length > 1 ? ` · ${channel.srcs.length} sources` : ""}
        </p>
      </div>
    </div>
  );
});

/* ================================================================== */
/*  Channel details popover (hero "View Details")                      */
/* ================================================================== */

function ChannelDetails({
  channel,
  categories,
  onBrowseCategory,
}: {
  channel: StreamChannel;
  categories: CategoryMeta[];
  onBrowseCategory: (cat: string) => void;
}) {
  return (
    <div className="p-4">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-theme">
        Channel details
      </p>
      <dl className="mt-3 space-y-2 text-xs">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Status</dt>
          <dd className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Public free-to-air channel
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Origin</dt>
          <dd className="font-medium text-zinc-200">
            {channel.flag} {channel.country || "International"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Quality</dt>
          <dd className="font-medium text-theme">{qualityLabel(channel)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Stream sources</dt>
          <dd className="font-medium text-zinc-200">{channel.srcs.length}</dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {channel.cats.slice(0, 4).map((cat) => (
          <button
            key={cat}
            onClick={() => onBrowseCategory(cat)}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300 transition-colors hover:border-theme/40 hover:text-white"
          >
            {categoryNameOf(cat, categories)}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
        Public free-to-air stream. Availability can vary by region.
      </p>
    </div>
  );
}

/* ---------- category label helpers ---------- */

function categoryNameOf(catId: string, categories: CategoryMeta[]): string {
  return categories.find((c) => c.id === catId)?.name ?? catId;
}
