"use client";

import { useState } from "react";
import type { Episode } from "@/lib/vod";

/** Season tabs + episode buttons for the series detail page. */
export function SeasonTabs({
  seasons,
  seriesId,
}: {
  /** seasons in order: ["1", "2", …] with their episodes */
  seasons: { label: string; episodes: Episode[] }[];
  seriesId: string;
}) {
  const [active, setActive] = useState(0);
  const season = seasons[active];
  if (!season) return null;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Seasons">
        {seasons.map((s, i) => (
          <button
            key={s.label}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={
              i === active
                ? "rounded-full bg-theme px-4 py-1.5 text-xs font-bold text-white"
                : "rounded-full bg-white/5 px-4 py-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200"
            }
          >
            Season {s.label}
            <span className="ml-1.5 font-mono text-[10px] opacity-70">
              {s.episodes.length}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {season.episodes.map((ep) => {
          const ext = ep.container_extension || "mp4";
          const epImg = ep.info?.movie_image
            ? `/api/vod/img?u=${encodeURIComponent(ep.info.movie_image)}`
            : null;
          return (
            <a
              key={ep.id}
              href={`/watch/ep/${ep.id}?ext=${encodeURIComponent(ext)}&series=${seriesId}`}
              className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 transition-all hover:border-theme/40 hover:bg-theme/[0.06]"
            >
              <span className="relative grid h-12 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#141416]">
                {epImg ? (
                  <img
                    src={epImg}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-black text-zinc-600">
                    E{ep.episode_num}
                  </span>
                )}
                <span className="absolute inset-0 grid place-items-center bg-black/40 text-[10px] font-black text-white opacity-0 transition-opacity group-hover:opacity-100">
                  ▶ PLAY
                </span>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-white group-hover:text-theme">
                  E{ep.episode_num}. {ep.title || "Episode"}
                </span>
                {ep.info?.duration && (
                  <span className="mt-0.5 block font-mono text-[10px] text-zinc-500">
                    {ep.info.duration}
                  </span>
                )}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
