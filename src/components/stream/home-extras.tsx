"use client";

/* Home page additions inspired by streaming-app layouts (original code):
 *  - HeroThumbs: clickable thumbnail strip under the hero headline (desktop)
 *  - SpotlightBand: featured lineup with a channel list on the left and a large feature panel on the right */
import { useState } from "react";
import Link from "next/link";
import { Heart, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryMeta, StreamChannel } from "@/lib/stream";
import type { HeroItem } from "@/lib/spotlight";

const bestQ = (ch: StreamChannel) => Math.max(0, ...ch.srcs.map((s) => s.q));
const qLabel = (q: number) => (q >= 2160 ? "4K" : q >= 1080 ? "1080p" : q >= 720 ? "HD" : q > 0 ? `${q}p` : "");

/* ------------------------------------------------------------------ */
export function HeroThumbs({ hero, active, go }: { hero: HeroItem[]; active: number; go: (i: number) => void }) {
  if (hero.length < 2) return null;
  return (
    <div
      className="absolute bottom-[5.5rem] right-6 z-10 hidden gap-2 xl:flex sm:right-10"
      role="group"
      aria-label="Spotlight thumbnails"
    >
      {hero.slice(0, 5).map((h, i) => (
        <button
          key={h.channel.id}
          type="button"
          onClick={() => go(i)}
          aria-label={`Show slide ${i + 1}: ${h.promo?.title ?? h.channel.name}`}
          aria-current={i === active}
          className={cn(
            "group relative h-14 w-24 overflow-hidden rounded-lg border bg-black/40 text-left transition-all duration-300",
            i === active
              ? "-translate-y-1 border-theme opacity-100 ring-2 ring-theme/60"
              : "border-white/15 opacity-70 hover:border-white/40 hover:opacity-100",
          )}
        >
          <img src={h.backdrop} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <span className="absolute inset-x-1.5 bottom-1 truncate font-mono text-[8.5px] font-semibold uppercase tracking-wider text-white">
            {h.promo?.title ?? h.channel.name}
          </span>
        </button>
      ))}
    </div>
  );
}

/* Promo slides (e.g. a TV drama) do not claim a channel: a badge links to a page instead. */
export function PromoPill({ promo }: { promo: NonNullable<HeroItem["promo"]> }) {
  return (
    <Link
      href={promo.href}
      className="group/ch mt-4 inline-flex max-w-fit items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3.5 py-1.5 text-left backdrop-blur transition-colors hover:border-theme/50"
    >
      <span className="grid size-5 place-items-center rounded-full bg-theme text-white transition-transform group-hover/ch:scale-110">
        <Play className="size-2.5 fill-current" />
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-300">{promo.badge}</span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
export function SpotlightBand({
  channels,
  backdrops,
  categories,
  onPlay,
  isFavorite,
  onToggleFavorite,
}: {
  channels: StreamChannel[];
  backdrops: string[];
  categories: CategoryMeta[];
  onPlay: (ch: StreamChannel) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const list = channels.filter((c) => c.srcs.length > 0).slice(0, 4);
  const [idx, setIdx] = useState(0);
  if (list.length < 3) return null;

  const i = Math.min(idx, list.length - 1);
  const ch = list[i];
  const bg = backdrops.length ? backdrops[i % backdrops.length] : null;
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;
  const q = qLabel(bestQ(ch));
  const fav = isFavorite(ch.id);
  const cats = ch.cats.slice(0, 2).map(catName);

  return (
    <section aria-label="Featured lineup" className="mt-12">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-theme">Featured lineup</p>
      <h2 className="font-display mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Featured live channels</h2>

      <div className="mt-4 grid overflow-hidden rounded-3xl border border-white/10 bg-surface-1 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* channel list */}
        <ul
          role="tablist"
          aria-label="Featured channels"
          className="flex gap-1 overflow-x-auto bg-black/25 p-2 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:p-3"
        >
          {list.map((c, n) => (
            <li key={c.id} className="shrink-0 lg:shrink">
              <button
                type="button"
                role="tab"
                aria-selected={n === i}
                onClick={() => setIdx(n)}
                onMouseEnter={() => setIdx(n)}
                className={cn(
                  "flex w-52 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors lg:w-full",
                  n === i ? "border-theme/60 bg-theme/10" : "border-transparent hover:bg-white/5",
                )}
              >
                <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-white p-1.5">
                  {c.logo ? (
                    <img src={c.logo} alt="" loading="lazy" referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-xs font-bold text-slate-800">TV</span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className={cn("block truncate text-sm font-bold", n === i ? "text-white" : "text-zinc-200")}>{c.name}</span>
                  <span className="block truncate font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    {c.flag} {c.country}
                    {c.cats[0] ? ` · ${catName(c.cats[0])}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {/* feature panel */}
        <div role="tabpanel" className="relative min-h-[300px] overflow-hidden">
          {bg && (
            <img
              key={bg + i}
              src={bg}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 size-full object-cover opacity-70 animate-in fade-in duration-500"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-surface-1 via-surface-1/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-1 via-transparent to-transparent" />

          <div className="relative flex min-h-[300px] flex-col justify-end gap-3 p-6 sm:p-9">
            <span className="grid size-16 place-items-center rounded-2xl bg-white p-2.5 shadow-xl">
              {ch.logo ? (
                <img src={ch.logo} alt={`${ch.name} logo`} referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="font-bold text-slate-800">TV</span>
              )}
            </span>
            <h3 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{ch.name}</h3>
            <p className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-zinc-300">
              <span>{ch.flag} {ch.country}</span>
              {cats.map((c) => (
                <span key={c} className="rounded-md border border-white/15 bg-black/30 px-2 py-0.5">{c}</span>
              ))}
              {q && <span className="rounded-md border border-theme/40 bg-theme/10 px-2 py-0.5 text-theme">{q}</span>}
              <span className="text-zinc-400">{ch.srcs.length} source{ch.srcs.length === 1 ? "" : "s"}</span>
            </p>
            <p className="max-w-xl text-sm leading-relaxed text-zinc-300">
              Live free-to-air stream{q ? `, up to ${q}` : ""}. Opens instantly in your browser, with automatic fallback if a source is busy.
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onPlay(ch)}
                className="inline-flex items-center gap-2 rounded-full bg-theme px-6 py-2.5 text-sm font-bold text-[var(--site-on-accent,#fff)] shadow-lg shadow-theme/30 transition hover:brightness-110"
              >
                <Play className="size-4 fill-current" /> Watch live
              </button>
              <button
                type="button"
                onClick={() => onToggleFavorite(ch.id)}
                aria-pressed={fav}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:border-theme/60"
              >
                <Heart className={cn("size-4", fav && "fill-theme text-theme")} /> {fav ? "Saved" : "Add to My List"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
