"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { VodRail } from "@/lib/vod-catalog";
import { VodPoster } from "./vod-poster";

/** Horizontal NEXA rail with arrow scrolling + edge fade. */
export function VodRails({ rails }: { rails: VodRail[] }) {
  return (
    <div className="space-y-10">
      {rails.map((rail) => (
        <RailRow key={rail.id} rail={rail} />
      ))}
    </div>
  );
}

function RailRow({ rail }: { rail: VodRail }) {
  const scroller = useRef<HTMLDivElement>(null);

  const nudge = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: "smooth" });
  };

  return (
    <section aria-label={rail.title} className="group/rail relative">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-white sm:text-xl">
            {rail.title}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">{rail.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={
              rail.id === "web-series" || rail.id === "pakistani" || rail.id === "indian"
                ? `/series?zone=${rail.id}`
                : "/movies"
            }
            className="text-xs font-semibold text-theme transition-colors hover:brightness-125"
          >
            Browse all
          </Link>
          <span className="hidden gap-1.5 sm:flex">
            <button
              onClick={() => nudge(-1)}
              aria-label={`Scroll ${rail.title} left`}
              className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-300 transition-colors hover:border-theme/40 hover:text-theme"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => nudge(1)}
              aria-label={`Scroll ${rail.title} right`}
              className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-300 transition-colors hover:border-theme/40 hover:text-theme"
            >
              <ChevronRight className="size-4" />
            </button>
          </span>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scroller}
          className="flex snap-x snap-mandatory gap-3.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {rail.items.map((it, i) => (
            <div
              key={`${it.kind}-${it.id}`}
              className="w-[132px] shrink-0 snap-start sm:w-[148px] lg:w-[156px]"
            >
              <VodPoster item={it} rank={rail.ranked ? i + 1 : undefined} eager={rail.ranked && i < 6} />
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-16 bg-gradient-to-l from-[#0c0c0e] to-transparent sm:block" />
      </div>
    </section>
  );
}
