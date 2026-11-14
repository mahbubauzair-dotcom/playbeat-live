"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Globe2,
  MonitorPlay,
  Radio,
  RefreshCw,
  SearchX,
  Shuffle,
  Tv,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PosterCard } from "@/components/stream/home-view";
import { cn } from "@/lib/utils";
import { qualityLabel, type CategoryMeta, type StreamChannel, type StreamCatalog } from "@/lib/stream";
import { categoryPageMeta } from "@/lib/category-pages";

/* ================================================================== */
/*  CategoryView — dedicated discovery page for one category  */
/* ================================================================== */

const PAGE_SIZE = 48;

type SortKey = "top" | "name" | "quality" | "sources";

function rank(c: StreamChannel): number {
  return (c.srcs[0]?.q ?? 0) * 10 + c.srcs.length;
}

export function CategoryView({
  categoryId,
  categories,
  catCounts,
  featured,
  getCatalog,
  onPlay,
  isFavorite,
  onToggleFavorite,
  onOpenCategory,
  onBack,
  onOpenInLiveTv,
}: {
  categoryId: string;
  categories: CategoryMeta[];
  catCounts: Record<string, number>;
  /** server-computed category context — rendered into the initial HTML so
      the page carries meaningful channel content before the catalog hydrates */
  featured?: {
    featured: { name: string; q: number }[];
    countries: string[];
    count: number;
  };
  getCatalog: () => Promise<StreamCatalog | null>;
  onPlay: (ch: StreamChannel) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onOpenCategory: (catId: string) => void;
  onBack: () => void;
  onOpenInLiveTv: (catId: string) => void;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [channels, setChannels] = useState<StreamChannel[]>([]);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [sort, setSort] = useState<SortKey>("top");

  /* load the shared catalog and slice this category (key-remounted per category) */
  useEffect(() => {
    let alive = true;
    getCatalog()
      .then((data) => {
        if (!alive) return;
        if (!data) {
          setStatus("error");
          return;
        }
        setChannels(data.channels.filter((c) => c.cats.includes(categoryId)));
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [categoryId, getCatalog, attempt]);

  const meta = useMemo(() => categoryPageMeta(categoryId), [categoryId]);
  const catName = useMemo(
    () => categories.find((c) => c.id === categoryId)?.name ?? categoryId,
    [categories, categoryId]
  );

  const stats = useMemo(() => {
    const countries = new Set(channels.map((c) => c.country).filter(Boolean));
    const hd = channels.filter((c) => (c.srcs[0]?.q ?? 0) >= 720).length;
    const sources = channels.reduce((n, c) => n + c.srcs.length, 0);
    return { countries: countries.size, hd, sources };
  }, [channels]);

  /* related categories via co-occurrence inside this category's channels */
  const related = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of channels) {
      for (const k of c.cats) {
        if (k === categoryId || k === "general") continue;
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([id, n]) => ({
        id,
        n,
        name: categories.find((x) => x.id === id)?.name ?? id,
      }));
  }, [channels, categoryId, categories]);

  const sorted = useMemo(() => {
    const arr = [...channels];
    switch (sort) {
      case "name":
        arr.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "quality":
        arr.sort((a, b) => (b.srcs[0]?.q ?? 0) - (a.srcs[0]?.q ?? 0) || a.name.localeCompare(b.name));
        break;
      case "sources":
        arr.sort((a, b) => b.srcs.length - a.srcs.length || a.name.localeCompare(b.name));
        break;
      default:
        arr.sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name));
    }
    return arr;
  }, [channels, sort]);

  const playRandom = useCallback(() => {
    if (sorted.length === 0) return;
    onPlay(sorted[Math.floor(Math.random() * sorted.length)]);
  }, [sorted, onPlay]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return (
    <div className="flex flex-col pb-4">
      {/* ============================ BANNER ============================ */}
      <section
        aria-label={`${catName} category`}
        className="relative overflow-hidden border-b border-white/5"
      >
        <div className={cn("absolute inset-0 bg-gradient-to-br", meta.hue)} aria-hidden="true" />
        {meta.art && (
          <img
            src={meta.art}
            alt=""
            loading="eager"
            aria-hidden="true"
            className="absolute inset-y-0 right-0 hidden h-full w-1/2 object-cover opacity-30 [mask-image:linear-gradient(to_left,black_30%,transparent)] md:block"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05050d] via-transparent to-[#05050d]/40" aria-hidden="true" />

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-8 pt-6 sm:px-6">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-theme"
            aria-label="Go back"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </button>

          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-theme">
            Category
          </p>
          <h1 className="font-display mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {catName}
          </h1>
          <p className="mt-2 text-base font-medium text-theme/90">{meta.tagline}</p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300/85">{meta.blurb}</p>

          {/* server-rendered channel discovery lines — real catalog names,
              visible in the initial HTML for crawlers and no-JS visitors */}
          {featured && featured.featured.length > 0 && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300/85">
              Popular {catName} channels on Playbeat Live include{" "}
              <span className="text-zinc-100">
                {featured.featured.slice(0, 10).map((f) => f.name).join(", ")}
              </span>
              {`${
                featured.featured.length > 10
                  ? ` and ${(featured.count - 10).toLocaleString()} more`
                  : ""
              }${
                featured.countries.length > 0
                  ? `. The category is especially strong in ${featured.countries.join(", ")}.`
                  : "."
              }`}
            </p>
          )}

          {/* stat chips */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1 font-mono text-[11px] text-zinc-300 backdrop-blur">
              <Radio className="size-3 text-rose-400" />
              {(catCounts[categoryId] ?? channels.length).toLocaleString()} channels
            </span>
            {status === "ready" && (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1 font-mono text-[11px] text-zinc-300 backdrop-blur">
                  <Globe2 className="size-3 text-teal-300" />
                  {stats.countries} countries
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1 font-mono text-[11px] text-zinc-300 backdrop-blur">
                  <MonitorPlay className="size-3 text-theme" />
                  {stats.hd} in HD+
                </span>
                <span className="hidden rounded-full border border-white/10 bg-black/30 px-3 py-1 font-mono text-[11px] text-zinc-300 backdrop-blur sm:inline-flex">
                  {stats.sources.toLocaleString()} stream sources
                </span>
              </>
            )}
          </div>

          {/* actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={playRandom}
              disabled={status !== "ready" || sorted.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-theme px-5 text-sm font-bold text-white shadow-lg shadow-theme/25 transition-all hover:brightness-110 focus-visible:outline-2 focus-visible:outline-theme disabled:pointer-events-none disabled:opacity-40"
            >
              <Shuffle className="size-4" />
              Play random
            </button>
            <button
              onClick={() => onOpenInLiveTv(categoryId)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 text-sm font-medium text-zinc-100 backdrop-blur transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-theme"
            >
              <Tv className="size-4" />
              Open in Live TV
            </button>

            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="cat-sort" className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                Sort
              </label>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger
                  id="cat-sort"
                  size="sm"
                  className="w-44 border-white/10 bg-black/40 text-zinc-200 backdrop-blur"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#0a0a18]/95 text-zinc-200 backdrop-blur-xl">
                  <SelectItem value="top">Discover mix</SelectItem>
                  <SelectItem value="name">Name A–Z</SelectItem>
                  <SelectItem value="quality">Highest quality</SelectItem>
                  <SelectItem value="sources">Most sources</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* ======================= RELATED CATEGORIES ====================== */}
      {related.length > 0 && (
        <section
          aria-label="Related categories"
          className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              You may also like
            </span>
            {related.map((r) => (
              <button
                key={r.id}
                onClick={() => onOpenCategory(r.id)}
                className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-theme/40 hover:bg-theme/10 hover:text-white focus-visible:outline-2 focus-visible:outline-theme"
              >
                {r.name}
                <span className="ml-1.5 font-mono text-[10px] text-zinc-600">{r.n}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ============================ CHANNELS =========================== */}
      <section aria-label={`${catName} channels`} className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        {status === "loading" && (
          <div className="flex flex-wrap gap-x-4 gap-y-7 pt-8" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="w-[148px] sm:w-[168px]">
                <Skeleton className="aspect-[2/3] w-full rounded-xl bg-zinc-800/60" />
                <Skeleton className="mt-2.5 h-3.5 w-3/4 bg-zinc-800/60" />
                <Skeleton className="mt-1.5 h-3 w-1/2 bg-zinc-800/60" />
              </div>
            ))}
            <span className="sr-only">Loading channels…</span>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <SearchX className="size-10 text-zinc-700" />
            <p className="max-w-sm text-sm text-zinc-500">
              The channel catalog could not be loaded. Check your connection and try
              again — every other view of the site keeps working offline of this
              bundle.
            </p>
            <button
              onClick={retry}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-theme"
            >
              <RefreshCw className="size-4" />
              Retry
            </button>
          </div>
        )}

        {status === "ready" && sorted.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <SearchX className="size-10 text-zinc-700" />
            <p className="text-sm text-zinc-500">
              No channels in this category yet — try another one from the related
              list above.
            </p>
          </div>
        )}

        {status === "ready" && sorted.length > 0 && (
          <>
            <div className="mt-8 flex flex-wrap gap-x-4 gap-y-7">
              {sorted.slice(0, visible).map((ch) => (
                <div key={ch.id} className="w-[148px] sm:w-[168px]">
                  <PosterCard
                    channel={ch}
                    hue={meta.hue}
                    categories={categories}
                    onPlay={onPlay}
                    isFavorite={isFavorite}
                    onToggleFavorite={onToggleFavorite}
                  />
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center gap-3 pb-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600">
                Showing {Math.min(visible, sorted.length).toLocaleString()} of{" "}
                {sorted.length.toLocaleString()} channels
              </p>
              {visible < sorted.length && (
                <button
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-theme"
                >
                  Load more
                  <ArrowRight className="size-4" />
                </button>
              )}
              <p className="text-[11px] text-zinc-600">
                Top pick: <span className="text-zinc-400">{qualityLabel(sorted[0])}</span> ·
                all streams publicly available free-to-air
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
