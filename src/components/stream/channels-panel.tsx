"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Loader2, Play, Radio, Search, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  filterChannels,
  getViewerCountryServerSnapshot,
  getViewerCountrySnapshot,
  qualityLabel,
  regionBoost,
  subscribeViewerCountry,
  type CategoryMeta,
  type StreamCatalog,
  type StreamChannel,
} from "@/lib/stream";

/* ================================================================== */
/*  ChannelsPanel — the "All channels" storefront rail (reference:     */
/*  numbered channel list with search, chips and per-row play).        */
/*  Catalog is lazy-loaded client-side via the shared getCatalog.      */
/* ================================================================== */

const PANEL_LIMIT = 80;

const CHIP_IDS = ["sports", "news", "movies", "music", "entertainment", "kids"];

export function ChannelsPanel({
  categories,
  catCounts,
  total,
  getCatalog,
  onPlay,
  className,
}: {
  categories: CategoryMeta[];
  catCounts: Record<string, number>;
  total: number;
  getCatalog: () => Promise<StreamCatalog | null>;
  onPlay: (channel: StreamChannel) => void;
  className?: string;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [channels, setChannels] = useState<StreamChannel[]>([]);
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState("all");
  const viewerCountry = useSyncExternalStore(
    subscribeViewerCountry,
    getViewerCountrySnapshot,
    getViewerCountryServerSnapshot
  );

  useEffect(() => {
    let alive = true;
    getCatalog()
      .then((data) => {
        if (!alive) return;
        if (!data) {
          setStatus("error");
          return;
        }
        setChannels(data.channels);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [getCatalog]);

  const chips = useMemo(
    () =>
      CHIP_IDS.map((id) => ({
        id,
        name: categories.find((c) => c.id === id)?.name ?? id,
        count: catCounts[id] ?? 0,
      })).filter((c) => c.count > 0),
    [categories, catCounts]
  );

  const filtered = useMemo(
    () => filterChannels(channels, { q: query, category: chip }),
    [channels, query, chip]
  );
  const shown = useMemo(
    () => regionBoost(filtered, viewerCountry).slice(0, PANEL_LIMIT),
    [filtered, viewerCountry]
  );

  const categoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? id;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col border-white/5 bg-[#101013]",
        className
      )}
      aria-label="All channels"
    >
      {/* header */}
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-4">
        <h2 className="text-[15px] font-bold tracking-tight text-white">
          All channels
        </h2>
        <span className="rounded-md bg-theme/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-theme">
          {total.toLocaleString()}
        </span>
      </div>

      {/* search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in channels…"
            aria-label="Search in channels"
            className="h-10 w-full rounded-full border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-theme/40 focus:outline-none"
          />
        </div>
      </div>

      {/* chips */}
      <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3" role="group" aria-label="Filter channels by category">
        <button
          onClick={() => setChip("all")}
          aria-pressed={chip === "all"}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
            chip === "all"
              ? "bg-theme text-white"
              : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
          )}
        >
          All
        </button>
        {chips.map((c) => (
          <button
            key={c.id}
            onClick={() => setChip(c.id)}
            aria-pressed={chip === c.id}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              chip === c.id
                ? "bg-theme text-white"
                : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      <p className="px-4 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600" aria-live="polite">
        {status === "ready"
          ? `${filtered.length.toLocaleString()} channels`
          : status === "loading"
            ? "Loading channels…"
            : "Channel index unavailable"}
      </p>

      {/* list */}
      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {status === "loading" && (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-zinc-500">
            <Loader2 className="size-4 animate-spin text-theme" />
            Loading the channel index…
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <SearchX className="size-7 text-zinc-700" />
            <p className="text-xs leading-relaxed text-zinc-500">
              The channel index could not be loaded. The rest of the site keeps
              working — try refreshing.
            </p>
          </div>
        )}

        {status === "ready" && shown.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <SearchX className="size-7 text-zinc-700" />
            <p className="text-xs text-zinc-500">No channels match “{query}”.</p>
          </div>
        )}

        {status === "ready" &&
          shown.map((ch, i) => (
            <div
              key={ch.id}
              className={cn(
                "group flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.05]",
                i % 2 === 1 && "bg-white/[0.015]"
              )}
            >
              <span className="w-4 shrink-0 text-right font-mono text-[10px] text-zinc-600">
                {i + 1}
              </span>

              <button
                onClick={() => onPlay(ch)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                aria-label={`Watch ${ch.name}`}
              >
                <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-white p-1">
                  {ch.logo ? (
                     
                    <img
                      src={ch.logo}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Radio className="size-4 text-zinc-400" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-zinc-100">
                    {ch.name}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-wide text-zinc-500">
                    {ch.country ? `${ch.country} · ` : ""}
                    {ch.cats[0] ? categoryName(ch.cats[0]) : "General"} ·{" "}
                    {qualityLabel(ch)}
                  </span>
                </span>
              </button>

              <button
                onClick={() => onPlay(ch)}
                aria-label={`Play ${ch.name}`}
                className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-400 transition-colors hover:border-theme/40 hover:bg-theme hover:text-white"
              >
                <Play className="size-3.5 fill-current" />
              </button>
            </div>
          ))}

        {status === "ready" && filtered.length > PANEL_LIMIT && (
          <p className="px-3 py-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            + {(filtered.length - PANEL_LIMIT).toLocaleString()} more — use Live
            TV for the full grid
          </p>
        )}
      </div>

      {/* footer hint */}
      <div className="flex items-center gap-2 border-t border-white/5 px-4 py-3">
        <Radio className="size-3.5 shrink-0 text-theme/70" />
        <p className="text-[11px] leading-snug text-zinc-600">
          Select a channel to open the player
        </p>
      </div>
    </div>
  );
}
