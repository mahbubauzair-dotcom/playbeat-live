"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";

/** Fullscreen NEXA VOD player. src points at /api/play/* (302 to the panel). */
export function VodPlayer({
  src,
  title,
  backHref,
  poster,
  nextHref,
  nextLabel,
}: {
  src: string;
  title: string;
  backHref: string;
  poster?: string | null;
  nextHref?: string | null;
  nextLabel?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"loading" | "playing" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setState("loading");
    // reload the source on retry
    v.load();
    v.play().catch(() => {
      /* autoplay may be blocked — user can press play */
    });
  }, [src, attempt]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* top chrome */}
      <div className="flex items-center justify-between gap-3 bg-gradient-to-b from-black/80 to-transparent px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={backHref}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-white transition-colors hover:border-theme/50 hover:text-theme"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="truncate text-sm font-semibold text-white sm:text-base">
            {title}
          </h1>
        </div>
        {nextHref && (
          <Link
            href={nextHref}
            className="shrink-0 rounded-full bg-theme px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-theme/25 transition-all hover:brightness-110"
          >
            {nextLabel || "Next"} →
          </Link>
        )}
      </div>

      {/* video */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <video
          ref={videoRef}
          className="h-full w-full object-contain"
          controls
          autoPlay
          playsInline
          poster={poster || undefined}
          onPlaying={() => setState("playing")}
          onError={() => setState("error")}
        />

        {state === "loading" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="size-10 animate-spin rounded-full border-2 border-white/20 border-t-theme" />
          </div>
        )}

        {state === "error" && (
          <div className="absolute inset-0 grid place-items-center bg-black/80 px-6">
            <div className="max-w-sm rounded-2xl border border-white/10 bg-[#141416] p-6 text-center">
              <AlertTriangle className="mx-auto size-8 text-theme" />
              <h2 className="mt-3 text-base font-bold text-white">
                This stream couldn&apos;t be opened
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                The title may still be propagating on the panel, or the source
                format needs a moment. Try again, or pick another episode.
              </p>
              <button
                onClick={() => setAttempt((a) => a + 1)}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-theme px-5 py-2 text-sm font-bold text-white shadow-lg shadow-theme/25 hover:brightness-110"
              >
                <RotateCcw className="size-4" /> Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
