"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  ArrowUpRight,
  Baby,
  Bookmark,
  Clapperboard,
  Compass,
  Film,
  Globe,
  Heart,
  History,
  Info,
  Mail,
  Menu,
  Music2,
  Newspaper,
  PanelRight,
  Radio,
  ScrollText,
  Search,
  Trophy,
  Tv,
  X,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AccentPicker } from "@/components/stream/accent-picker";
import { PlayerDialog } from "@/components/stream/player-dialog";
import { HomeView } from "@/components/stream/home-view";
import { VodHub, type VodHubData } from "@/components/stream/vod-hub";
import { StreamApp, type StreamAppProps } from "@/components/stream/stream-app";
import { CategoryView } from "@/components/stream/category-view";
import { ChannelsPanel } from "@/components/stream/channels-panel";
import { PwaInstaller, InstallAppButton } from "@/components/stream/pwa-install";
import { cn } from "@/lib/utils";
import {
  AUTOPLAY_SESSION_KEY,
  resolveStarterChannels,
} from "@/lib/starter-channels";
import {
  getFavoritesServerSnapshot,
  getFavoritesSnapshot,
  pushRecent,
  subscribeFavorites,
  toggleFavorite,
  type CategoryMeta,
  type CountryMeta,
  type StreamCatalog,
  type StreamChannel,
} from "@/lib/stream";
import type { CountryChip, HeroItem, HomeRow } from "@/lib/spotlight";
import { SITE_URL } from "@/lib/seo";

type View = "home" | "tv" | "category" | "vod" | "about" | "legal";

const VIEW_HREF: Record<Exclude<View, "category">, string> = {
  home: "/",
  tv: "/live-tv",
  vod: "/movies",
  about: "/about",
  legal: "/about",
};

export interface TvPreset {
  category: string;
  country: string;
  myList: boolean;
  recents: boolean;
  focusSearch: boolean;
  navKey: number;
}

const DEFAULT_PRESET: TvPreset = {
  category: "all",
  country: "all",
  myList: false,
  recents: false,
  focusSearch: false,
  navKey: 0,
};

/* the editorial categories promoted into the top nav, à la reference */
const TOP_NAV_CATS = ["movies", "series", "sports", "news"];
/* additional real categories revealed at ≥xl widths (all have /category pages) */
const EXTRA_NAV_CATS = ["kids", "music", "documentary"];

const EXTRA_CAT_ICONS: Record<string, React.ReactNode> = {
  kids: <Baby className="size-4" />,
  music: <Music2 className="size-4" />,
  documentary: <ScrollText className="size-4" />,
};

/**
 * Playbeat Live storefront chrome: sticky navbar, left browse rail,
 * right "All channels" rail, shared HLS player and the site footer.
 * Route-driven: each URL (/ , /live-tv , /movies … /category/[id] ,
 * /about , legal pages) renders this shell with the
 * matching `view` prop and its own content. No login.
 */
/* Playbeat Regional Network — cross-links between the five regional hubs.
   Self-hub (hub.url === SITE_URL) is highlighted, all hubs are real
   followed links so users and search engines can navigate the network. */
const REGIONAL_NETWORK_HUBS = [
  {
    name: "Playbeat TV Global",
    region: "Worldwide · 4,819 Channels",
    flag: "🌍",
    url: "https://www.playbeattv.buzz",
    title: "Playbeat TV — Watch 4,819+ Free Global Live TV Channels",
  },
  {
    name: "Playbeat Live",
    region: "USA & North America · 868 Channels",
    flag: "🇺🇸",
    url: "https://www.playbeat.live",
    title: "Playbeat Live — Watch Free USA & North America 24/7 Live TV & News",
  },
  {
    name: "Playbeat Arena Europe",
    region: "Europe & Football · 1,473 Channels",
    flag: "🇪🇺",
    url: "https://www.playbeatarena.online",
    title: "Playbeat Arena Europe — Live European Sports, Football & Cinema TV",
  },
  {
    name: "Playbeat Arena Asia",
    region: "Cricket & Desi TV · 852 Channels",
    flag: "🌏",
    url: "https://www.playbeatarena.asia",
    title: "Playbeat Arena Asia — Live Cricket, Pakistani & Indian Dramas & Asian TV",
  },
  {
    name: "Playbeat Digital World",
    region: "Middle East & Arabic · 263 Channels",
    flag: "🌙",
    url: "https://www.playbeatdigital.world",
    title: "Playbeat Digital World — Free Live Arabic, Gulf & Islamic TV Channels",
  },
] as const;

function RegionalNetworkBar() {
  return (
    <section
      aria-label="Playbeat Regional Network"
      className="relative mx-auto w-full max-w-[1600px] px-5 pb-2 pt-8 sm:px-7"
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">
        Playbeat Regional Network
      </h3>
      <p className="mt-2 max-w-xl text-xs leading-relaxed text-zinc-500">
        One free streaming network, five regional hubs — jump between our
        worldwide, American, European, Asian and Middle Eastern portals.
      </p>
      <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {REGIONAL_NETWORK_HUBS.map((hub) => {
          const isCurrent = hub.url === SITE_URL;
          return (
            <li key={hub.url}>
              <a
                href={hub.url}
                title={hub.title}
                aria-current={isCurrent ? "page" : undefined}
                className={
                  "flex h-full flex-col gap-1 rounded-2xl border px-4 py-3 transition-colors " +
                  (isCurrent
                    ? "border-amber-400/50 bg-amber-400/10"
                    : "border-white/10 bg-white/[0.03] hover:border-amber-300/40 hover:bg-amber-300/10")
                }
              >
                <span className="flex items-center gap-2 text-xs font-bold text-zinc-100">
                  <span aria-hidden>{hub.flag}</span>
                  {hub.name}
                  {isCurrent && (
                    <span className="ml-auto rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-950">
                      You are here
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-zinc-500">{hub.region}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function AppShell({
  view,
  activeCategory = null,
  initialPreset,
  hero,
  rows,
  popular,
  categories,
  countries,
  catCounts,
  total,
  countriesCount,
  countryChips = [],
  categorySsr,
  tvIntro,
  activeNav,
  vod = null,
  vodHub = null,
  generatedAt,
  about,
  children,
}: {
  view: View;
  activeCategory?: string | null;
  initialPreset?: Partial<TvPreset>;
  hero?: HeroItem[];
  rows?: HomeRow[];
  popular?: HomeRow[];
  categories: CategoryMeta[];
  countries: CountryMeta[];
  catCounts: Record<string, number>;
  total: number;
  countriesCount: number;
  countryChips?: CountryChip[];
  /** server-computed category context (top channels + countries) — SSR'd
      into the initial HTML so crawlers see real channel content before
      the client-side catalog hydrates */
  categorySsr?: {
    featured: { name: string; q: number }[];
    countries: string[];
    count: number;
  };
  /** optional server-rendered intro block shown above the Live TV browser */
  tvIntro?: React.ReactNode;
  /** optional key marking the active chrome item for non-view pages (e.g. "countries") */
  activeNav?: string;
  /** VOD rails for the home view (server-fetched from the panel) */
  vod?: import("@/lib/vod-catalog").VodHomeData | null;
  /** full VOD hub payload for the /movies and /series views */
  vodHub?: VodHubData | null;
  generatedAt: string;
  about?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [tvPreset, setTvPreset] = useState<TvPreset>(
    initialPreset
      ? { ...DEFAULT_PRESET, ...initialPreset, navKey: 1 }
      : DEFAULT_PRESET
  );

  /* ---------- favorites ---------- */
  const favs = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getFavoritesServerSnapshot
  );
  const isFavorite = useCallback((id: string) => favs.includes(id), [favs]);
  const onToggleFavorite = useCallback((id: string) => {
    toggleFavorite(id);
  }, []);

  /* ---------- shared player ---------- */
  const [playerChannel, setPlayerChannel] = useState<StreamChannel | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);

  /* healthy-channel chain: instant autoplay target + automatic fallback
     whenever the channel being watched dies on every source */
  const [starterChannels, setStarterChannels] = useState<StreamChannel[]>([]);

  const play = useCallback((channel: StreamChannel) => {
    setPlayerChannel(channel);
    setPlayerOpen(true);
    pushRecent(channel.id);
    window.history.replaceState(null, "", `#watch=${channel.id}`);
  }, []);

  const closePlayer = useCallback((open: boolean) => {
    setPlayerOpen(open);
    if (!open) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
    }
  }, []);

  /* ---------- deep links (#watch=<id> / #category=<id>) from any view ---------- */
  const catalogRef = useRef<StreamCatalog | null>(null);
  const ensureCatalog = useCallback(async (): Promise<StreamCatalog | null> => {
    if (catalogRef.current) return catalogRef.current;
    try {
      const r = await fetch("/api/catalog");
      if (!r.ok) return null;
      const data = (await r.json()) as StreamCatalog;
      catalogRef.current = data;
      return data;
    } catch {
      return null;
    }
  }, []);

  const validCategories = useMemo(
    () => new Set(categories.map((c) => c.id)),
    [categories]
  );

  const categoryNames = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  /* ---------- navigation helpers (real routes) ---------- */
  const goView = useCallback(
    (v: View) => {
      setNavOpen(false);
      setChannelsOpen(false);
      router.push(VIEW_HREF[v]);
      window.scrollTo(0, 0);
    },
    [router]
  );

  const categoryHref = useCallback(
    (catId: string) =>
      TOP_NAV_CATS.includes(catId) ? `/${catId}` : `/category/${catId}`,
    []
  );

  const openCategory = useCallback(
    (catId: string) => {
      setNavOpen(false);
      setChannelsOpen(false);
      router.push(categoryHref(catId));
      window.scrollTo(0, 0);
    },
    [router, categoryHref]
  );

  /* legacy #category=<id> hash -> real route; #watch=<id> opens the player */
  useEffect(() => {
    const handleHash = async () => {
      const cat = /^#category=([\w-]+)$/.exec(window.location.hash);
      if (cat) {
        if (validCategories.has(cat[1])) {
          const target = categoryHref(cat[1]);
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search
          );
          router.replace(target);
        }
        return;
      }
      const m = /^#watch=(.+)$/.exec(window.location.hash);
      if (!m) return;
      const catalog = await ensureCatalog();
      const ch = catalog?.channels.find((c) => c.id === m[1]);
      if (ch) play(ch);
    };
    void handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [play, ensureCatalog, router, validCategories, categoryHref]);

  /* ---------- healthy-channel autoplay + fallback chain ----------
     Resolves the curated always-healthy chain from the catalog once.
     On the home view (fresh open, no deep link, once per browser session)
     it silently starts the first healthy channel so the client lands
     straight into live TV. The chain also feeds the player's automatic
     "next healthy channel" fallback on any page. */
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    void (async () => {
      const catalog = await ensureCatalog();
      if (!catalog || cancelled) return;
      const chain = resolveStarterChannels(catalog.channels);
      if (cancelled) return;
      setStarterChannels(chain);
      if (view !== "home") return;
      if (window.location.hash) return; // deep links keep priority
      try {
        if (sessionStorage.getItem(AUTOPLAY_SESSION_KEY)) return;
      } catch {
        /* storage unavailable — still autoplay, worst case twice */
      }
      const first = chain[0];
      if (!first) return;
      timer = window.setTimeout(() => {
        if (cancelled) return;
        try {
          sessionStorage.setItem(AUTOPLAY_SESSION_KEY, "1");
        } catch {}
        /* silent open: no recents entry, no #watch hash — the visitor
           didn't choose this channel, so we leave no navigation trace */
        setPlayerChannel(first);
        setPlayerOpen(true);
      }, 800);
    })();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [view, ensureCatalog]);

  const browseTv = useCallback(
    (preset: Partial<TvPreset>) => {
      setNavOpen(false);
      setChannelsOpen(false);
      if (/^#category=/.test(window.location.hash)) {
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search
        );
      }
      if (view === "tv") {
        /* same route: swap preset in place (snappy, no reload) */
        setTvPreset((prev) => ({
          category: preset.category ?? "all",
          country: preset.country ?? "all",
          myList: preset.myList ?? false,
          recents: preset.recents ?? false,
          focusSearch: preset.focusSearch ?? false,
          navKey: prev.navKey + 1,
        }));
        window.scrollTo(0, 0);
      } else {
        const q = new URLSearchParams();
        if (preset.category && preset.category !== "all")
          q.set("category", preset.category);
        if (preset.country && preset.country !== "all")
          q.set("country", preset.country);
        if (preset.myList) q.set("list", "my");
        if (preset.recents) q.set("list", "recent");
        if (preset.focusSearch) q.set("focus", "1");
        const qs = q.toString();
        router.push("/live-tv" + (qs ? `?${qs}` : ""));
        window.scrollTo(0, 0);
      }
    },
    [router, view]
  );

  /* presets arrive via /live-tv searchParams (initialPreset prop) or the
     same-route swap in browseTv — no URL parsing effect needed */
  const streamProps: Omit<StreamAppProps, "key"> = {
    featured: (hero ?? []).map((h) => h.channel),
    categories,
    countries,
    catCounts,
    total,
    generatedAt,
    onPlay: play,
    initialCategory: tvPreset.category,
    initialCountry: tvPreset.country,
    initialMyList: tvPreset.myList,
    initialRecents: tvPreset.recents,
    searchFocusKey: tvPreset.focusSearch ? tvPreset.navKey : 0,
  };

  const catActive = (id: string) =>
    (view === "category" && activeCategory === id) ||
    (view === "vod" &&
      ((vodHub?.kind === "movie" && id === "movies") ||
        (vodHub?.kind === "series" && id === "series")));

  /* ---------- sidebar model (shared by desktop rail + mobile sheet) ---------- */
  const mainNav: {
    key: string;
    label: string;
    icon: React.ReactNode;
    active: boolean;
    onSelect: () => void;
  }[] = [
    {
      key: "browse",
      label: "Browse",
      icon: <Compass className="size-4" />,
      active: view === "home",
      onSelect: () => goView("home"),
    },
    {
      key: "tv",
      label: "Live TV",
      icon: <Tv className="size-4" />,
      active: view === "tv",
      onSelect: () => browseTv({}),
    },
    ...TOP_NAV_CATS.map((cat) => ({
      key: `cat-${cat}`,
      label: categoryNames[cat] ?? cat,
      icon:
        cat === "movies" ? (
          <Clapperboard className="size-4" />
        ) : cat === "series" ? (
          <Film className="size-4" />
        ) : cat === "sports" ? (
          <Trophy className="size-4" />
        ) : (
          <Newspaper className="size-4" />
        ),
      active: catActive(cat),
      onSelect: () => openCategory(cat),
    })),
    ...EXTRA_NAV_CATS.map((cat) => ({
      key: `cat-${cat}`,
      label: categoryNames[cat] ?? cat,
      icon: EXTRA_CAT_ICONS[cat] ?? <Radio className="size-4" />,
      active: catActive(cat),
      onSelect: () => openCategory(cat),
    })),
    {
      key: "countries",
      label: "Countries",
      icon: <Globe className="size-4" />,
      active: activeNav === "countries",
      onSelect: () => {
        setNavOpen(false);
        setChannelsOpen(false);
        router.push("/countries");
        window.scrollTo(0, 0);
      },
    },
  ];

  const secondNav: {
    key: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    active: boolean;
    onSelect: () => void;
  }[] = [
    {
      key: "mylist",
      label: "My List",
      icon: <Heart className="size-4" />,
      badge: favs.length,
      active: false,
      onSelect: () => browseTv({ myList: true }),
    },
    {
      key: "recents",
      label: "Recently watched",
      icon: <History className="size-4" />,
      active: false,
      onSelect: () => browseTv({ recents: true }),
    },
    {
      key: "about",
      label: "About & policy",
      icon: <Info className="size-4" />,
      active: view === "about",
      onSelect: () => goView("about"),
    },
  ];

  const sidebarBrandCard = (
    <div className="rounded-2xl border border-theme/20 bg-gradient-to-b from-theme/10 to-transparent p-4">
      <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
        Your front-row seat
      </p>
      <p className="mt-1.5 text-xl font-extrabold tracking-tight">
        <span className="bg-theme bg-clip-text text-transparent">
          PLAYBEAT
        </span>
      </p>
      <p className="text-[11px] font-medium text-zinc-400">Free experience</p>
      <ul className="mt-3 space-y-1.5 text-[11px] text-zinc-400">
        <li className="flex items-center gap-1.5">
          <ArrowUpRight className="size-3 text-theme" />
          <span className="font-semibold text-zinc-200">{total.toLocaleString()}</span>
          live channels
        </li>
        <li className="flex items-center gap-1.5">
          <ArrowUpRight className="size-3 text-theme" />
          <span className="font-semibold text-zinc-200">{countriesCount}</span>
          countries
        </li>
        <li className="flex items-center gap-1.5">
          <ArrowUpRight className="size-3 text-theme" />
          <span className="font-semibold text-zinc-200">{categories.length}</span>
          categories
        </li>
        <li className="flex items-center gap-1.5">
          <ArrowUpRight className="size-3 text-theme" />
          Free-to-air worldwide
        </li>
      </ul>
      <button
        onClick={() => browseTv({})}
        className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-theme text-[13px] font-bold text-white shadow-lg shadow-theme/25 transition-all hover:brightness-110"
      >
        Explore the lineup
        <ArrowUpRight className="size-3.5" />
      </button>
    </div>
  );

  const sidebarNav = (
    <nav aria-label="Storefront" className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto px-3 py-5 scrollbar-slim">
      <div className="space-y-1">
        {mainNav.map((item) => (
          <button
            key={item.key}
            onClick={item.onSelect}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium transition-colors",
              item.active
                ? "border-theme/30 bg-theme/10 text-theme"
                : "border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        {secondNav.map((item) => (
          <button
            key={item.key}
            onClick={item.onSelect}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-colors",
              item.active
                ? "bg-white/10 text-white"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            )}
          >
            {item.icon}
            {item.label}
            {typeof item.badge === "number" && item.badge > 0 && (
              <span className="ml-auto rounded-full bg-theme/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-theme">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-auto pt-2">{sidebarBrandCard}</div>
    </nav>
  );

  return (
    <div className="pb-shell flex min-h-screen flex-col bg-[#09152b] text-slate-100">
      {/* ============================ NAVBAR ============================ */}
      <header className="pb-header sticky top-0 z-50 border-b border-blue-300/20 bg-[#0b1b39]/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-[1600px] items-center gap-3 px-3 py-1 sm:gap-4 sm:px-5">
          {/* logo */}
          <button
            onClick={() => goView("home")}
            className="pb-header-logo flex shrink-0 items-center gap-2.5 rounded-xl px-1.5 py-1"
            aria-label="Playbeat Live home"
          >
            <img
              src="/brand/logo-mark.png"
              alt="Playbeat Live logo"
              className="size-9 rounded-xl object-cover shadow-lg shadow-theme/25 ring-1 ring-theme/30"
            />
            <span className="hidden flex-col leading-none sm:flex">
              <span className="text-[15px] font-extrabold tracking-tight text-white">
                PLAYBEAT{" "}
                <span className="bg-theme bg-clip-text text-transparent">
                  LIVE
                </span>
              </span>
              <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.22em] text-zinc-500">
                USA & North America
              </span>
            </span>
          </button>

          {/* search pill */}
          <button
            onClick={() => browseTv({ focusSearch: true })}
            className="pb-header-search ml-1 hidden h-11 min-w-0 flex-1 items-center gap-2.5 overflow-hidden rounded-2xl border border-blue-200/20 bg-white/[0.07] px-4 text-left text-sm text-slate-300 transition-all hover:border-theme/50 hover:bg-white/10 md:flex lg:max-w-md"
            aria-label="Search channels, movies, series"
          >
            <Search className="size-4 shrink-0" />
            <span className="truncate">
              Search channels, movies, series…
            </span>
          </button>

          <div className="flex-1 md:hidden" />

          {/* top nav pills */}
          <nav className="pb-header-nav hidden items-center gap-1 lg:flex" aria-label="Primary">
            <button
              onClick={() => goView("home")}
              aria-current={view === "home" ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors",
                view === "home"
                  ? "bg-theme text-white"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Home
            </button>
            <button
              onClick={() => browseTv({})}
              aria-current={view === "tv" ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors",
                view === "tv"
                  ? "bg-theme text-white"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Live TV
            </button>
            {TOP_NAV_CATS.map((cat) => (
              <Link
                key={cat}
                href={categoryHref(cat)}
                aria-current={catActive(cat) ? "page" : undefined}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors",
                  catActive(cat)
                    ? "bg-theme text-white"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                {categoryNames[cat] ?? cat}
              </Link>
            ))}
            {EXTRA_NAV_CATS.map((cat) => (
              <button
                key={cat}
                onClick={() => openCategory(cat)}
                aria-current={catActive(cat) ? "page" : undefined}
                className={cn(
                  "hidden rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors xl:block",
                  catActive(cat)
                    ? "bg-theme text-white"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                {categoryNames[cat] ?? cat}
              </button>
            ))}
            <Link
              href="/countries"
              aria-current={activeNav === "countries" ? "page" : undefined}
              className={cn(
                "hidden rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors xl:block",
                activeNav === "countries"
                  ? "bg-theme text-white"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Countries
            </Link>
          </nav>

          <div className="hidden flex-1 lg:block" />

          {/* right actions */}
          <div className="pb-header-actions flex items-center gap-1">
            <AccentPicker />
            <InstallAppButton variant="header" />
            <button
              onClick={() => setChannelsOpen(true)}
              aria-label="Open all channels panel"
              title="Browse all channels drawer"
              className="grid size-9 place-items-center rounded-full text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <PanelRight className="size-4.5" />
            </button>
            <button
              onClick={() => browseTv({ myList: true })}
              aria-label={`My List, ${favs.length} channels`}
              className="flex size-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <span className="relative">
                <Bookmark className="size-4.5" />
                {favs.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-theme px-1 text-[9px] font-bold text-white">
                    {favs.length}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setNavOpen(true)}
              aria-label={navOpen ? "Close menu" : "Open menu"}
              aria-expanded={navOpen}
              className="grid size-9 place-items-center rounded-full text-zinc-300 transition-colors hover:bg-white/5 lg:hidden"
            >
              {navOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ============================ BODY ============================ */}
      <div className="mx-auto flex w-full max-w-[1600px] flex-1">
        {/* left rail — hidden on homepage for full-width cinema layout */}
        {view !== "home" && (
          <aside
            className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 border-r border-white/5 lg:block"
            aria-label="Browse navigation"
          >
            {sidebarNav}
          </aside>
        )}

        {/* main column */}
        <main className="min-w-0 flex-1">
          {view === "home" && hero && rows && popular && (
            <HomeView
              hero={hero}
              rows={rows}
              popular={popular}
              categories={categories}
              catCounts={catCounts}
              countryChips={countryChips}
              total={total}
              countriesCount={countriesCount}
              vod={vod}
              onPlay={play}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
              onBrowseCategory={openCategory}
              onBrowseAll={() => browseTv({})}
              onAbout={() => goView("about")}
            />
          )}
          {view === "vod" && vodHub && <VodHub {...vodHub} />}
          {view === "category" && activeCategory && (
            <CategoryView
              key={activeCategory}
              categoryId={activeCategory}
              categories={categories}
              catCounts={catCounts}
              featured={categorySsr}
              getCatalog={ensureCatalog}
              onPlay={play}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
              onOpenCategory={openCategory}
              onBack={() => {
                if (window.history.length > 1) router.back();
                else router.push("/");
              }}
              onOpenInLiveTv={(cat) => browseTv({ category: cat })}
            />
          )}
          {view === "tv" && tvIntro && (
            <div className="px-3 pt-5 sm:px-5">{tvIntro}</div>
          )}
          {view === "tv" && (
            <div className="px-3 py-5 sm:px-5">
              <StreamApp key={tvPreset.navKey} {...streamProps} />
            </div>
          )}
          {view === "about" && about && (
            <div className="px-3 py-6 sm:px-5">{about}</div>
          )}
          {view === "legal" && children}
        </main>

        {/* right rail — hidden on homepage for full-width cinema layout (opened via drawer) */}
        {view !== "home" && (
          <aside
            className="sticky top-16 hidden h-[calc(100vh-4rem)] w-80 shrink-0 border-l border-white/5 xl:block"
            aria-label="All channels"
          >
            <ChannelsPanel
              categories={categories}
              catCounts={catCounts}
              total={total}
              getCatalog={ensureCatalog}
              onPlay={play}
              className="h-full"
            />
          </aside>
        )}
      </div>

      {/* Cinematic brand marquee above the footer */}
      <section className="pb-brand-stage relative isolate overflow-hidden px-4 py-11 text-center sm:py-16" aria-label="Playbeat Live">
        <div className="pb-brand-halo pointer-events-none absolute inset-0" aria-hidden="true" />
        <p className="relative z-10 text-[10px] font-bold uppercase tracking-[0.45em] text-theme sm:text-xs">Your world of entertainment</p>
        <p className="pb-brand-3d relative z-10 mx-auto mt-4 w-fit max-w-full text-[clamp(2.7rem,10vw,9rem)] font-black leading-none tracking-[-0.065em]">
          PLAYBEAT <span>LIVE</span>
        </p>
        <p className="relative z-10 mt-3 text-xs tracking-[0.13em] text-slate-300 sm:text-sm">Live TV. No Cable. 100% Free.</p>
      </section>

      {/* ============================ FOOTER ============================ */}
      <footer className="relative mt-auto overflow-hidden border-t border-theme/20 bg-gradient-to-b from-[#0c1c35] via-[#0a1023] to-[#070817] pb-[env(safe-area-inset-bottom)]">
        {/* ambient accents */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-theme/70 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-48 left-1/2 h-80 w-[54rem] max-w-[90vw] -translate-x-1/2 rounded-full bg-theme/10 blur-[130px]"
        />

        {/* CTA band */}
        <div className="relative mx-auto w-full max-w-[1600px] px-4 pt-12 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-theme/15 via-white/[0.02] to-transparent p-6 sm:p-9">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-theme/20 blur-[100px]"
            />
            <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-theme/80">
                  Playbeat Live · Free forever
                </p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {total.toLocaleString()}+ live channels from {countriesCount} countries.{" "}
                  <span className="text-zinc-500">No account needed.</span>
                </h2>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-400">
                  Breaking news and live sports, Hollywood to Bollywood movies, binge-worthy
                  dramas — streaming free in your browser or as an installable app.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <Link
                  href="/live-tv"
                  className="inline-flex items-center gap-2 rounded-xl bg-theme px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-theme/25 transition hover:brightness-110 active:scale-[0.98]"
                >
                  <Tv className="size-4" />
                  Watch Live TV
                </Link>
                <Link
                  href="/movies"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-theme/50 hover:text-theme active:scale-[0.98]"
                >
                  <Film className="size-4" />
                  Browse Movies
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Live, continuously scrolling category announcements */}
        <div className="pb-ticker relative border-y border-theme/25 bg-gradient-to-r from-indigo-950 via-[#132446] to-fuchsia-950" aria-label="Browse channel categories">
          <div className="mx-auto flex max-w-[1600px] items-center">
            <span className="z-10 shrink-0 border-r border-theme/30 bg-theme px-3 py-3 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-950 sm:px-5">Explore now</span>
            <div className="pb-ticker-viewport min-w-0 flex-1 overflow-hidden py-2.5">
              <div className="pb-ticker-track flex w-max items-center gap-2 px-2">
                {[0, 1].map((copy) => (
                  <div key={copy} className="flex shrink-0 items-center gap-2" aria-hidden={copy === 1 ? true : undefined}>
                    {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((cat) => (
                      <Link key={cat.id} href={categoryHref(cat.id)} tabIndex={copy === 1 ? -1 : undefined} className="pb-ticker-pill whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:border-theme hover:bg-theme/20">
                        <span className="mr-1.5 text-theme">✦</span>{categoryNames[cat.id] ?? cat.name}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* link columns */}
        <div className="relative mx-auto grid w-full max-w-[1600px] grid-cols-1 items-start gap-x-9 gap-y-7 px-5 py-10 sm:grid-cols-2 sm:px-7 lg:grid-cols-[1.35fr_0.9fr_1fr_0.85fr] lg:gap-x-12 lg:py-12">
          {/* brand */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2">
              <img
                src="/brand/logo-mark.png"
                alt="Playbeat Live logo"
                className="size-8 rounded-lg object-cover ring-1 ring-theme/30"
              />
              <span className="text-lg font-extrabold tracking-tight">
                PLAYBEAT <span className="bg-theme bg-clip-text text-transparent">LIVE</span>
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-zinc-500">
              Turn up the moment. Free live television, movies and dramas — no
              account, no cost, no catch.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {["No login", "No tracking", "Installable app"].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-zinc-400"
                >
                  {t}
                </span>
              ))}
            </div>
            <a
              href="mailto:playbeattv_admin@proton.me"
              className="mt-5 inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-theme"
            >
              <Mail className="size-3.5" />
              playbeattv_admin@proton.me
            </a>
          </div>

          {/* watch */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Watch
            </h3>
            <ul className="mt-4 space-y-2.5">
              {[
                { href: "/live-tv", label: "Live TV" },
                { href: "/movies", label: "Movies" },
                { href: "/series", label: "Series & Dramas" },
                { href: "/sports", label: "Sports" },
                { href: "/news", label: "News" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-xs text-zinc-400 transition-colors hover:text-theme"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/live-tv"
                  className="inline-flex items-center gap-1 text-xs font-medium text-theme transition-colors"
                >
                  All channels →
                </Link>
              </li>
            </ul>
          </div>

          {/* compact category discovery: all category routes remain available in the ticker below */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-theme">
              Discover
            </h3>
            <p className="mt-4 max-w-[220px] text-xs leading-6 text-slate-300">
              Explore live channels by genre, country and interest.
            </p>
            <Link href="/live-tv" className="mt-3 inline-flex items-center rounded-full border border-theme/40 bg-theme/10 px-3 py-1.5 text-xs font-semibold text-theme transition-colors hover:bg-theme/20">
              Browse all categories →
            </Link>
          </div>

          {/* explore */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Explore
            </h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/" className="text-xs text-zinc-400 transition-colors hover:text-theme">
                  Browse
                </Link>
              </li>
              <li>
                <Link href="/countries" className="text-xs text-zinc-400 transition-colors hover:text-theme">
                  Countries
                </Link>
              </li>
              <li>
                <Link href="/collection" className="text-xs text-zinc-400 transition-colors hover:text-theme">
                  Collection
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-xs text-zinc-400 transition-colors hover:text-theme">
                  About
                </Link>
              </li>
              <InstallAppButton variant="footer" />
            </ul>
          </div>

        </div>

        {/* Legal: full-width, accessible compact bar, not an extra footer column */}
        <div className="relative mx-auto w-full max-w-[1600px] border-t border-blue-200/15 px-5 py-5 sm:px-7">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <span className="text-xs font-bold uppercase tracking-[0.17em] text-theme">Legal</span>
            {[{href:"/privacy-policy", label:"Privacy Policy"},{href:"/terms",label:"Terms of Service"},{href:"/dmca",label:"DMCA & Copyright"},{href:"/content-policy",label:"Content Policy"},{href:"/about",label:"About & credits"}].map(l=> (
              <Link key={l.href} href={l.href} className="text-sm text-slate-300 transition-colors hover:text-theme">{l.label}</Link>
            ))}
          </div>
        </div>

        {/* Playbeat Regional Network cross-links */}
        <RegionalNetworkBar />

        {/* bottom bar */}
        <div className="relative border-t border-white/5">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-5 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <Link href="/privacy-policy" className="text-[11px] text-zinc-500 transition-colors hover:text-theme">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-[11px] text-zinc-500 transition-colors hover:text-theme">
                  Terms of Service
                </Link>
                <Link href="/dmca" className="text-[11px] text-zinc-500 transition-colors hover:text-theme">
                  DMCA &amp; Copyright
                </Link>
                <Link href="/content-policy" className="text-[11px] text-zinc-500 transition-colors hover:text-theme">
                  Content Policy
                </Link>
                <Link href="/about" className="text-[11px] text-zinc-500 transition-colors hover:text-theme">
                  About
                </Link>
              </nav>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] font-medium text-zinc-400 transition-colors hover:border-theme/50 hover:text-theme"
              >
                <ArrowUp className="size-3.5" />
                Back to top
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] leading-relaxed text-zinc-600">
                © 2026 Playbeat Live · Hosts no media — a player &amp; directory for publicly
                available free-to-air streams. Not affiliated with broadcasters.
              </p>
              <p className="text-[11px] text-zinc-600">
                Catalog generated {generatedAt} · {total.toLocaleString()} channels ·{" "}
                {countriesCount} countries
              </p>
            </div>
          </div>
        </div>

      </footer>

      {/* ============================ MOBILE SHEETS ============================ */}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent
          side="left"
          className="w-72 border-white/10 bg-[#101013] p-0 text-zinc-100"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex items-center gap-2.5 border-b border-white/5 px-4 py-4">
            <img
              src="/brand/logo-mark.png"
              alt="Playbeat Live logo"
              className="size-8 rounded-lg object-cover ring-1 ring-theme/30"
            />
            <span className="text-sm font-extrabold tracking-tight">
              PLAYBEAT{" "}
              <span className="bg-theme bg-clip-text text-transparent">
                TV
              </span>
            </span>
          </div>
          {sidebarNav}
        </SheetContent>
      </Sheet>

      <Sheet open={channelsOpen} onOpenChange={setChannelsOpen}>
        <SheetContent
          side="right"
          className="w-[340px] border-white/10 bg-[#101013] p-0 text-zinc-100 sm:w-[380px]"
        >
          <SheetTitle className="sr-only">All channels</SheetTitle>
          <ChannelsPanel
            categories={categories}
            catCounts={catCounts}
            total={total}
            getCatalog={ensureCatalog}
            onPlay={play}
            className="h-full border-l-0"
          />
        </SheetContent>
      </Sheet>

      {/* ============================ SHARED PLAYER ============================ */}
      <PwaInstaller />
      <PlayerDialog
        channel={playerChannel}
        open={playerOpen}
        onOpenChange={closePlayer}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        categoryNames={categoryNames}
        fallbackChannels={starterChannels}
      />
    </div>
  );
}
