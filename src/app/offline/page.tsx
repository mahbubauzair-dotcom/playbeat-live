"use client";

import Link from "next/link";
import { WifiOff, RefreshCw, Home, Radio } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-[#0c0c0e] px-6 text-center">
      <div className="relative">
        <div className="absolute inset-0 -z-10 m-auto size-40 rounded-full bg-theme/15 blur-3xl" />
        <div className="grid size-20 place-items-center rounded-3xl border border-theme/20 bg-white/[0.03] shadow-2xl shadow-theme/25">
          <WifiOff className="size-9 text-theme" />
        </div>
      </div>

      <h1 className="mt-8 text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
        You&apos;re offline
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
        Playbeat Live streams live channels, so it needs a connection. Your saved
        channels and settings are safe on this device — everything will pick up
        right where you left it once you&apos;re back online.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-full bg-theme px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-theme/25 transition-colors hover:bg-theme"
        >
          <RefreshCw className="size-4" /> Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.08]"
        >
          <Home className="size-4" /> Go home
        </Link>
      </div>

      <p className="mt-10 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-zinc-600">
        <Radio className="size-3 text-theme/60" />
        Playbeat Live — free live television, no login
      </p>
    </main>
  );
}
