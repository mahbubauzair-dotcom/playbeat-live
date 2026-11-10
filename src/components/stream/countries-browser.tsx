"use client";

/* Searchable directory of every country in the catalog, with dynamic
   channel counts. Each chip links to a crawlable country directory page. */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Globe } from "lucide-react";
import type { CountryChip } from "@/lib/spotlight";

export function CountriesBrowser({ chips }: { chips: CountryChip[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      q
        ? chips.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.code.toLowerCase().includes(q)
          )
        : chips,
    [chips, q]
  );

  const totalChannels = useMemo(
    () => chips.reduce((sum, c) => sum + c.count, 0),
    [chips]
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-theme">
        One world · every screen
      </p>
      <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        Browse by{" "}
        <span className="bg-theme bg-clip-text text-transparent">
          country
        </span>
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
        {chips.length} countries · {totalChannels.toLocaleString()} indexed
        free-to-air channels. Choose a country to filter the live TV directory,
        or head back to the{" "}
        <Link href="/" className="text-theme hover:underline">
          full catalog
        </Link>
        .
      </p>

      <div className="relative mt-6 max-w-md">
        <Globe className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${chips.length} countries…`}
          aria-label="Search countries"
          className="h-11 w-full rounded-full border border-white/10 bg-white/[0.04] pl-9 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-theme/40 focus:outline-none"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((c) => (
          <Link
            key={c.code}
            href={`/country/${encodeURIComponent(c.code.toLowerCase())}`}
            className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-theme/40 hover:bg-theme/[0.06] focus-visible:outline-2 focus-visible:outline-theme"
          >
            <span className="text-xl leading-none">{c.flag}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-zinc-200 group-hover:text-white">
                {c.name}
              </span>
              <span className="block font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                {c.code}
              </span>
            </span>
            <span className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-[10px] text-zinc-400 group-hover:text-theme">
              {c.count.toLocaleString()}
            </span>
          </Link>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="mt-8 text-sm text-zinc-500">
          No country matches “{query}”. Try another name or code.
        </p>
      )}
    </div>
  );
}
