import Link from "next/link";
import { Clapperboard, Search, Tv } from "lucide-react";
import type { VodBrowseCat, VodCard } from "@/lib/vod-catalog";
import { VodPoster } from "./vod-poster";
import { AdSlot } from "./ad-slot";

export type VodHubData = {
  kind: "movie" | "series";
  title: string;
  tagline: string;
  cats: VodBrowseCat[];
  activeCat: string | null;
  page: number;
  perPage: number;
  items: VodCard[];
  total: number;
  catName: string;
  query: string;
  notice?: string | null;
};

/** Shared shell for the /movies and /series VOD hubs (NEXA style). */
export function VodHub({
  kind,
  title,
  tagline,
  cats,
  activeCat,
  page,
  perPage,
  items,
  total,
  catName,
  query,
  notice,
}: VodHubData) {
  const basePath = kind === "movie" ? "/movies" : "/series";
  const pages = Math.max(1, Math.ceil(total / perPage));
  const chipHref = (id: string | null, p = 1) => {
    const qs = new URLSearchParams();
    if (id) qs.set("cat", id);
    if (p > 1) qs.set("page", String(p));
    if (query) qs.set("q", query);
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      {/* header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-theme">
            {kind === "movie" ? (
              <Clapperboard className="size-3.5" />
            ) : (
              <Tv className="size-3.5" />
            )}
            PlayBeat VOD
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">{tagline}</p>
        </div>

        {/* search */}
        <form action={basePath} className="relative w-full sm:w-72" role="search">
          {activeCat && <input type="hidden" name="cat" value={activeCat} />}
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={kind === "movie" ? "Search movies…" : "Search series…"}
            className="h-11 w-full rounded-full border border-white/10 bg-white/[0.04] pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-theme/50 focus:outline-none"
          />
        </form>
      </header>

      {notice && (
        <div className="mt-5 rounded-2xl border border-theme/25 bg-theme/[0.07] px-4 py-3 text-sm text-zinc-300">
          {notice}
        </div>
      )}

      <AdSlot slot="header" className="mt-6" />

      {/* category chips */}
      {cats.length > 0 && (
        <nav className="mt-6 flex flex-wrap items-center gap-1.5" aria-label="Categories">
          <Chip href={chipHref(null)} active={!activeCat}>
            All
          </Chip>
          {cats.slice(0, 24).map((c) => (
            <Chip key={c.id} href={chipHref(c.id)} active={activeCat === c.id}>
              {prettyCat(c.name)}
              <span className="ml-1.5 font-mono text-[9px] opacity-60">{c.count}</span>
            </Chip>
          ))}
        </nav>
      )}

      {/* result meta */}
      <p className="mt-6 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
        {query ? (
          <>Results for “{query}” — {items.length} found</>
        ) : (
          <>
            {catName} — page {page} of {pages} · {total.toLocaleString()} titles
          </>
        )}
      </p>

      {/* grid */}
      {items.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-x-3.5 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((it, i) => (
            <VodPoster key={`${it.kind}-${it.id}`} item={it} eager={i < 12} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center">
          <p className="text-base font-bold text-white">Nothing here yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
            {query
              ? `No ${kind === "movie" ? "movies" : "series"} match “${query}”. Try a shorter query.`
              : "The movie library fills automatically from the panel. If your IPTV line was renewed recently, check back in a few minutes."}
          </p>
        </div>
      )}

      {/* pagination */}
      {!query && pages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pages">
          {page > 1 && (
            <PageLink href={chipHref(activeCat, page - 1)}>← Prev</PageLink>
          )}
          <span className="rounded-full bg-white/[0.06] px-4 py-2 font-mono text-xs text-zinc-300">
            {page} / {pages}
          </span>
          {page < pages && (
            <PageLink href={chipHref(activeCat, page + 1)}>Next →</PageLink>
          )}
        </nav>
      )}

      <AdSlot slot="footer" className="mt-10" />
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-theme px-3.5 py-1.5 text-xs font-bold text-white"
          : "rounded-full bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200"
      }
    >
      {children}
    </Link>
  );
}

function PageLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:border-theme/40 hover:text-theme"
    >
      {children}
    </Link>
  );
}

function prettyCat(name: string): string {
  return name
    .replace(/^(EN|IN|PK|US|UK)\s*-\s*/i, "")
    .replace(/\s*-\s*(VOD|Movies?|Series?)\s*$/i, "")
    .trim();
}
