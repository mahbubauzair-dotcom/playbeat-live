"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
/* Note: the HLS player + #watch deep links live in AppShell (shared with Home). */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChannelCard } from "@/components/stream/channel-card";
import { cn } from "@/lib/utils";
import {
  filterChannels,
  getFavoritesServerSnapshot,
  getFavoritesSnapshot,
  getRecentsServerSnapshot,
  getRecentsSnapshot,
  getViewerCountryServerSnapshot,
  getViewerCountrySnapshot,
  regionBoost,
  subscribeFavorites,
  subscribeRecents,
  subscribeViewerCountry,
  toggleFavorite,
  type CategoryMeta,
  type CountryMeta,
  type StreamCatalog,
  type StreamChannel,
} from "@/lib/stream";
import {
  Check,
  ChevronsUpDown,
  Heart,
  History,
  Loader2,
  PlayCircle,
  Search,
  SearchX,
  Sparkles,
  Tv,
} from "lucide-react";

const PAGE_SIZE = 48;

export interface StreamAppProps {
  featured: StreamChannel[];
  categories: CategoryMeta[];
  countries: CountryMeta[];
  catCounts: Record<string, number>;
  total: number;
  generatedAt: string;
  onPlay: (channel: StreamChannel) => void;
  initialCategory?: string;
  initialCountry?: string;
  initialMyList?: boolean;
  initialRecents?: boolean;
  searchFocusKey?: number;
}

export function StreamApp({
  featured,
  categories,
  countries,
  catCounts,
  total,
  generatedAt,
  onPlay,
  initialCategory = "all",
  initialCountry = "all",
  initialMyList = false,
  initialRecents = false,
  searchFocusKey = 0,
}: StreamAppProps) {
  /* ---------- data ---------- */
  const [catalog, setCatalog] = useState<StreamCatalog | null>(null);
  const [catalogError, setCatalogError] = useState(false);
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
  /* viewer country from timezone (hydration-safe) — local channels first */
  const viewerCountry = useSyncExternalStore(
    subscribeViewerCountry,
    getViewerCountrySnapshot,
    getViewerCountryServerSnapshot
  );

  /* ---------- filters (initialized from AppShell presets) ---------- */
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [country, setCountry] = useState(initialCountry);
  const [myListOnly, setMyListOnly] = useState(initialMyList);
  const [recentsOnly, setRecentsOnly] = useState(initialRecents);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const gridRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /* load full catalog lazily (2MB, gzipped ~400KB) */
  useEffect(() => {
    let cancelled = false;
    fetch("/api/catalog")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: StreamCatalog) => {
        if (!cancelled) setCatalog(data);
      })
      .catch(() => {
        if (!cancelled) setCatalogError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* header search button focuses this input (signal from AppShell) */
  useEffect(() => {
    if (searchFocusKey > 0) searchRef.current?.focus();
  }, [searchFocusKey]);

  const onToggleFavorite = useCallback((id: string) => {
    toggleFavorite(id);
  }, []);
  // playback is handled by the shared player in AppShell via the onPlay prop

  const isFavorite = useCallback((id: string) => favs.includes(id), [favs]);

  /* ---------- derived ---------- */
  const filtersActive =
    query.trim() !== "" ||
    category !== "all" ||
    country !== "all" ||
    myListOnly ||
    recentsOnly;

  const allChannels = catalog?.channels ?? null;

  const recentIds = useMemo(() => recents.map((r) => r.id), [recents]);

  const filtered = useMemo(() => {
    if (!allChannels) return [];
    const ids = myListOnly
      ? favs
      : recentsOnly
        ? recentIds
        : undefined;
    return regionBoost(
      filterChannels(allChannels, {
        q: query,
        category,
        country,
        ids,
      }),
      viewerCountry
    );
  }, [allChannels, query, category, country, myListOnly, recentsOnly, favs, recentIds, viewerCountry]);

  const orderedAll = useMemo(
    () => regionBoost(allChannels ?? [], viewerCountry),
    [allChannels, viewerCountry]
  );

  const shown = filtersActive ? filtered : orderedAll;

  const favChannels = useMemo(() => {
    if (!allChannels || favs.length === 0) return [];
    const set = new Set(favs);
    return allChannels.filter((c) => set.has(c.id));
  }, [allChannels, favs]);

  const recentChannels = useMemo(() => {
    if (!allChannels || recents.length === 0) return [];
    const map = new Map(allChannels.map((c) => [c.id, c]));
    return recents.map((r) => map.get(r.id)).filter((c): c is StreamChannel => !!c);
  }, [allChannels, recents]);

  const selectedCountry = countries.find((c) => c.code === country);

  const categoryNames = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  function resetFilters() {
    setQuery("");
    setCategory("all");
    setCountry("all");
    setMyListOnly(false);
    setRecentsOnly(false);
    setVisible(PAGE_SIZE);
  }

  function applyFilter(fn: () => void) {
    fn();
    setVisible(PAGE_SIZE);
  }

  /* ---------- render ---------- */
  return (
    <section aria-label="Live TV streaming" className="flex-1">
      {/* hero stats */}
      <div className="rounded-xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/80 to-zinc-950 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-100">
              <PlayCircle className="size-5 text-theme" />
              {recentsOnly
                ? "Recently watched on Playbeat"
                : myListOnly
                  ? "Your My List — channels you saved"
                  : "Free live TV, straight in your browser"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {total.toLocaleString()} public free-to-air channels ·{" "}
              {countries.length} countries · no sign-up, no tracking, no ads from
              us
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant="outline"
              className="border-theme/30 bg-theme/10 font-mono text-[11px] text-theme"
            >
              Playbeat TV · free live television
            </Badge>
            <Badge
              variant="outline"
              className="border-zinc-800 bg-zinc-900/60 font-mono text-[11px] text-zinc-400"
            >
              Catalog {generatedAt}
            </Badge>
          </div>
        </div>
      </div>

      {/* recents rail */}
      {recentChannels.length > 0 && (
        <Rail
          title="Continue watching"
          icon={<History />}
          channels={recentChannels}
          onPlay={onPlay}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
        />
      )}

      {/* toolbar */}
      <div className="mt-5 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => applyFilter(() => setQuery(e.target.value))}
              placeholder={`Search ${total.toLocaleString()} channels…`}
              className="border-zinc-800 bg-zinc-900/60 pl-9 text-zinc-100 placeholder:text-zinc-600"
              aria-label="Search channels"
            />
          </div>

          {/* country picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-label="Filter by country"
                className="w-full justify-between border-zinc-800 bg-zinc-900/60 font-normal text-zinc-300 hover:bg-zinc-900 hover:text-zinc-200 sm:w-56"
              >
                <span className="truncate">
                  {selectedCountry
                    ? `${selectedCountry.flag} ${selectedCountry.name}`
                    : "All countries"}
                </span>
                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 border-zinc-800 bg-zinc-950 p-0" align="end">
              <Command className="bg-zinc-950">
                <CommandInput placeholder="Search country…" className="text-zinc-200" />
                <CommandList className="max-h-72">
                  <CommandEmpty className="py-4 text-center text-sm text-zinc-500">
                    No country found.
                  </CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="All countries"
                      onSelect={() => applyFilter(() => setCountry("all"))}
                      className="text-zinc-200 aria-selected:bg-zinc-800"
                    >
                      <Check
                        className={cn(
                          "mr-2 size-4",
                          country === "all" ? "opacity-100" : "opacity-0"
                        )}
                      />
                      🌐 All countries
                    </CommandItem>
                    {countries.map((c) => (
                      <CommandItem
                        key={c.code}
                        value={`${c.name} ${c.code}`}
                        onSelect={() => applyFilter(() => setCountry(c.code))}
                        className="text-zinc-200 aria-selected:bg-zinc-800"
                      >
                        <Check
                          className={cn(
                            "mr-2 size-4",
                            country === c.code ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {c.flag} {c.name}
                        <span className="ml-auto font-mono text-[10px] text-zinc-600">
                          {c.code}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* My List toggle */}
          <Button
            variant="outline"
            aria-pressed={myListOnly}
            onClick={() => applyFilter(() => setMyListOnly((v) => !v))}
            className={cn(
              "w-full border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 sm:w-36",
              myListOnly ? "text-theme" : "text-zinc-300 hover:text-zinc-200"
            )}
          >
            <Heart className={cn("size-4", (myListOnly || favs.length > 0) && "fill-theme/80 text-theme")} />
            My List{favs.length > 0 ? ` (${favs.length})` : ""}
          </Button>
        </div>

        {/* category chips */}
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filter by category"
        >
          <Chip
            active={category === "all"}
            onClick={() => applyFilter(() => setCategory("all"))}
            label="All"
            count={total}
            icon={<Tv className="size-3.5" />}
          />
          {categories.map((cat) => (
            <Chip
              key={cat.id}
              active={category === cat.id}
              onClick={() => applyFilter(() => setCategory(cat.id))}
              label={cat.name}
              count={catCounts[cat.id] ?? 0}
            />
          ))}
        </div>

        {/* result row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-zinc-500" aria-live="polite">
            {filtersActive ? (
              <>
                Showing{" "}
                <span className="font-mono text-zinc-300">{shown.length}</span>{" "}
                channels
              </>
            ) : (
              <>
                Browsing{" "}
                <span className="font-mono text-zinc-300">
                  {Math.min(visible, shown.length)}
                </span>{" "}
                of{" "}
                <span className="font-mono text-zinc-300">{shown.length}</span>{" "}
                channels
              </>
            )}
          </p>
          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* catalog loading indicator */}
      {!catalog && !catalogError && (
        <p className="mt-2 inline-flex items-center gap-2 text-xs text-zinc-600">
          <Loader2 className="size-3.5 animate-spin" />
          Loading full channel index…
        </p>
      )}
      {catalogError && (
        <p className="mt-2 text-xs text-rose-400">
          Failed to load the full channel index. Featured channels below still
          work — try refreshing the page.
        </p>
      )}

      {/* featured rail (only when unfiltered) */}
      {!filtersActive && (
        <Rail
          title="Featured"
          icon={<Sparkles />}
          channels={featured}
          onPlay={onPlay}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
        />
      )}

      {/* favorites rail (only when unfiltered + has favorites) */}
      {!filtersActive && favChannels.length > 0 && (
        <Rail
          title="My List"
          icon={<Heart />}
          channels={favChannels}
          onPlay={onPlay}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
        />
      )}

      {/* main grid */}
      <div ref={gridRef} className="mt-4">
        {allChannels ? (
          shown.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {shown.slice(0, visible).map((ch) => (
                  <ChannelCard
                    key={ch.id}
                    channel={ch}
                    onPlay={onPlay}
                    isFavorite={isFavorite}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
              {shown.length > visible && (
                <div className="mt-6 flex justify-center pb-6">
                  <Button
                    variant="outline"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                  >
                    Load {Math.min(PAGE_SIZE, shown.length - visible)} more
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-800 py-14 text-center">
              <SearchX className="size-10 text-zinc-700" />
              <p className="text-sm text-zinc-500">
                No channels match the current filters.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Clear all filters
              </Button>
            </div>
          )
        ) : (
          /* skeletons while catalog loads */
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                <Skeleton className="h-24 w-full rounded-lg bg-zinc-800/70" />
                <Skeleton className="mt-2.5 h-4 w-3/4 bg-zinc-800/70" />
                <Skeleton className="mt-1.5 h-3 w-1/2 bg-zinc-800/70" />
              </div>
            ))}
          </div>
        )}
      </div>

    </section>
  );
}

/* ---------- sub components ---------- */

function Chip({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-theme/60 bg-theme/15 text-theme"
          : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-200"
      )}
    >
      {icon}
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-px font-mono text-[10px]",
          active ? "bg-theme/20 text-theme" : "bg-zinc-800 text-zinc-500"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function Rail({
  title,
  icon,
  channels,
  onPlay,
  isFavorite,
  onToggleFavorite,
}: {
  title: string;
  icon: React.ReactNode;
  channels: StreamChannel[];
  onPlay: (ch: StreamChannel) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}) {
  return (
    <div className="mt-5" aria-label={title}>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-300">
        <span className="[&>svg]:size-4 [&>svg]:text-theme">{icon}</span>
        {title}
        <span className="font-mono text-xs text-zinc-600">{channels.length}</span>
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {channels.map((ch) => (
          <div key={ch.id} className="w-36 shrink-0 sm:w-40">
            <ChannelCard
              channel={ch}
              onPlay={onPlay}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
