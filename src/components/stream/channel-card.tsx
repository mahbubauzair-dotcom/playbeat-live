"use client";

import { memo } from "react";
import { logoFallback } from "@/lib/logo-fallback";
import Link from "next/link";
import { Heart, Play, TvMinimalPlay } from "lucide-react";
import { cn } from "@/lib/utils";
import { qualityLabel, type StreamChannel } from "@/lib/stream";

/* Premium channel card — larger logo tile with a category-tinted glow,
   honest availability badges (FTA + quality + source count), country flag,
   favorite toggle and a polished play affordance. Used by category pages. */

const CAT_ACCENTS: Record<string, string> = {
  news: "from-[#242428]",
  sports: "from-[#242428]",
  music: "from-[#242428]",
  movies: "from-[#242428]",
  kids: "from-[#242428]",
  animation: "from-[#242428]",
  documentary: "from-[#242428]",
  series: "from-[#242428]",
  entertainment: "from-[#242428]",
};

export const ChannelCard = memo(function ChannelCard({
  channel,
  onPlay,
  isFavorite,
  onToggleFavorite,
}: {
  channel: StreamChannel;
  onPlay: (channel: StreamChannel) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const fav = isFavorite(channel.id);
  const accent = CAT_ACCENTS[channel.cats[0] ?? ""] ?? "from-[#1b1b1e]";

  return (
    <div
      className={cn(
        "group flex h-full cursor-pointer flex-col gap-2.5 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3 shadow-lg shadow-black/20 transition-all duration-300",
        "hover:-translate-y-1 hover:border-theme/40 hover:bg-zinc-900 hover:shadow-2xl hover:shadow-theme/30 focus-visible:outline-2 focus-visible:outline-theme"
      )}
    >
      <div className="relative">
      {/* logo tile */}
      <Link
        href={`/channel/${encodeURIComponent(channel.id)}`}
        aria-label={`About ${channel.name} and watch options`}
        className={cn(
          "relative flex h-28 items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br to-zinc-950/90",
          accent
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.06),transparent_65%)]" />
        {channel.logo ? (
          <img
            src={channel.logo}
            alt={`${channel.name} logo`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="max-h-20 max-w-[80%] rounded-lg object-contain drop-shadow-[0_6px_20px_rgba(0,0,0,0.7)] transition-transform duration-300 group-hover:scale-105"
            onError={logoFallback}
          />
        ) : (
          <TvMinimalPlay className="size-8 text-zinc-700" />
        )}

        {/* availability + quality badges (honest: indexed free-to-air) */}
        <span className="absolute left-1.5 top-1.5 rounded-md border border-white/10 bg-black/70 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-300">
          FTA
        </span>
        <span className="absolute right-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-theme">
          {qualityLabel(channel)}
        </span>

        {/* hover play */}
        <div className="pointer-events-none absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <span className="pointer-events-none absolute inset-0 m-auto grid size-11 place-items-center rounded-full bg-theme text-white opacity-0 shadow-xl shadow-theme/25 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100">
          <Play className="size-4.5 fill-current" />
        </span>


      </Link>
        <button
          onClick={(e) => {
            onToggleFavorite(channel.id);
          }}
          aria-label={fav ? `Remove ${channel.name} from My List` : `Add ${channel.name} to My List`}
          aria-pressed={fav}
          className={cn(
            "absolute bottom-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-black/70 backdrop-blur transition-all hover:bg-black",
            fav ? "text-theme" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Heart className={cn("size-3.5", fav && "fill-theme")} />
        </button>
      </div>
      <div className="min-w-0 px-0.5">
        <Link href={`/channel/${encodeURIComponent(channel.id)}`} className="block truncate text-sm font-semibold text-zinc-100 hover:text-theme" title={channel.name}>
          {channel.flag ? `${channel.flag} ` : ""}
          {channel.name}
        </Link>
        <button type="button" onClick={()=>onPlay(channel)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-theme hover:text-theme"><Play className="size-3"/> Play now</button>
        <p className="truncate text-[11px] text-zinc-500">
          {channel.cats.slice(0, 2).join(" · ") || "general"}
          {channel.srcs.length > 1 ? ` · ${channel.srcs.length} sources` : ""}
        </p>
      </div>
    </div>
  );
});
