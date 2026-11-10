import Link from "next/link";
import { Star } from "lucide-react";
import type { VodCard } from "@/lib/vod-catalog";

/** NEXA-style VOD poster card — matches the channel PosterCard language. */
export function VodPoster({
  item,
  rank,
  eager,
}: {
  item: VodCard;
  rank?: number;
  eager?: boolean;
}) {
  const href = item.kind === "movie" ? `/movie/${item.id}` : `/series/${item.id}`;
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-all duration-200 hover:border-theme/40 hover:shadow-lg hover:shadow-theme/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-theme"
      aria-label={item.name}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#141416]">
        {item.poster ? (
          <img
            src={item.poster}
            alt=""
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center px-3 text-center">
            <span className="line-clamp-3 text-xs font-semibold text-zinc-500">
              {item.name}
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {typeof rank === "number" && (
          <span
            aria-hidden
            className="absolute -bottom-2 left-1 select-none font-sans text-5xl font-black leading-none text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
            style={{ WebkitTextStroke: "1px rgba(0,0,0,0.35)" }}
          >
            {rank}
          </span>
        )}

        <div className="absolute left-1.5 top-1.5 flex flex-col gap-1">
          {item.rating != null && (
            <span className="inline-flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
              <Star className="size-2.5 fill-theme text-theme" />
              {item.rating.toFixed(1)}
            </span>
          )}
          {item.year >= 2026 && (
            <span className="inline-flex items-center rounded-md bg-theme px-1.5 py-0.5 text-[10px] font-bold text-white">
              {item.year}
            </span>
          )}
        </div>

        {item.kind === "series" && (
          <span className="absolute right-1.5 top-1.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-200 backdrop-blur-sm">
            Series
          </span>
        )}
      </div>
      <div className="px-2 py-2">
        <p className="truncate text-[13px] font-semibold text-white group-hover:text-theme">
          {item.name}
        </p>
        <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          {[item.year || null, item.catName].filter(Boolean).join(" · ") || "VOD"}
        </p>
      </div>
    </Link>
  );
}
