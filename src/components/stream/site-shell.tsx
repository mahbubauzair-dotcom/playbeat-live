"use client";

import { useState } from "react";
import { Info, LayoutGrid, Tv } from "lucide-react";
import { StreamApp, type StreamAppProps } from "@/components/stream/stream-app";
import { cn } from "@/lib/utils";

type View = "tv" | "collection" | "about";

const TABS: { key: View; label: string; icon: React.ReactNode }[] = [
  { key: "tv", label: "Live TV", icon: <Tv className="size-4" /> },
  {
    key: "collection",
    label: "Collection",
    icon: <LayoutGrid className="size-4" />,
  },
  { key: "about", label: "About & Content Policy", icon: <Info className="size-4" /> },
];

/**
 * Global single-route shell: Live TV (primary product) / the original
 * curated collection browser / the About & content-policy section.
 */
export function SiteShell({
  streamProps,
  collection,
  about,
}: {
  streamProps: StreamAppProps;
  collection: React.ReactNode;
  about: React.ReactNode;
}) {
  const [view, setView] = useState<View>("tv");

  return (
    <>
      <div
        className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/40 p-1"
        role="tablist"
        aria-label="Site sections"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={view === t.key}
            onClick={() => setView(t.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
              view === t.key
                ? "bg-theme/15 text-theme"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5" role="tabpanel">
        {view === "tv" && <StreamApp {...streamProps} />}
        {view === "collection" && collection}
        {view === "about" && about}
      </div>
    </>
  );
}
