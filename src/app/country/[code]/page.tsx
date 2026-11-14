import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/stream/app-shell";
import { shellStats } from "@/lib/shell-data";
import { SITE } from "@/lib/site";
import { siteIntro } from "@/lib/site-seo";
import { pageMetadata, SITE_URL } from "@/lib/seo";
import { JsonLd } from "@/components/stream/json-ld";
import { catalog, categoryName } from "@/lib/stream.server";
import { categoriesOfCountry, channelPath, channelsOfCountry, comboPath, countryMeta, countryPath, MIN_COMBO } from "@/lib/live-seo";

type Props = { params: Promise<{ code: string }> };
export const dynamicParams = true;
export function generateStaticParams() {
  return catalog.countries.map((c) => ({ code: c.code.toLowerCase() }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const country = countryMeta(code);
  const total = country ? channelsOfCountry(country.code).length : 0;
  if (!country || !total) return { title: "Country not found", robots: { index: false } };
  const meta = pageMetadata({
    title: `${country.name} TV Channels: ${total} Free Live Channels | ${SITE.name}`,
    description: `Watch ${total} free-to-air TV channels from ${country.name} live: news, sports, kids, music and more. No sign-up, works in your browser.`.slice(0, 158),
    path: countryPath(country.code),
  });
  return total < MIN_COMBO ? { ...meta, robots: { index: false, follow: true } } : meta;
}

export default async function CountryPage({ params }: Props) {
  const { code } = await params;
  const country = countryMeta(code);
  if (!country) notFound();
  const matches = channelsOfCountry(country.code);
  if (!matches.length) notFound();
  const cats = categoriesOfCountry(country.code);
  const url = `${SITE_URL}${countryPath(country.code)}`;

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: `${country.name} live TV channels`, url, description: `Directory of free live TV channels from ${country.name}.` }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Countries", item: `${SITE_URL}/countries` },
        { "@type": "ListItem", position: 3, name: country.name, item: url },
      ] }} />
      <AppShell view="legal" {...shellStats()}>
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <nav aria-label="Breadcrumb" className="text-sm text-slate-300">
            <Link href="/" className="hover:text-theme">Home</Link> / <Link href="/countries" className="hover:text-theme">Countries</Link> / {country.name}
          </nav>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-theme">Browse by country</p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">{country.flag} {country.name} TV Channels</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-200">
            Watch {matches.length.toLocaleString()} free live TV channel{matches.length === 1 ? "" : "s"} from {country.name}
            {cats[0] ? `, including ${cats.slice(0, 3).map((c) => c.name.toLowerCase()).join(", ")}` : ""}. {siteIntro()} Pick a channel to start watching in your browser. Playback depends on current stream and regional availability.
          </p>

          {cats.filter((c) => c.count >= MIN_COMBO).length > 0 && (
            <>
              <h2 className="mt-8 text-lg font-bold text-white">Browse {country.name} channels by category</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {cats.filter((c) => c.count >= MIN_COMBO).map((c) => (
                  <Link key={c.id} href={comboPath(country.code, c.id)} className="rounded-full border border-white/20 px-4 py-2 text-sm text-slate-100 hover:bg-white/10">{c.name} ({c.count})</Link>
                ))}
              </div>
            </>
          )}

          <h2 className="mt-10 text-lg font-bold text-white">All channels from {country.name}</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {matches.slice(0, 240).map((ch) => (
              <Link key={ch.id} href={channelPath(ch)} className="group rounded-2xl border border-[var(--site-line)] bg-[var(--surface-2)] p-4 transition hover:-translate-y-1 hover:border-theme hover:bg-[var(--surface-3)]">
                <div className="flex h-28 items-center justify-center rounded-xl bg-white p-4">
                  {ch.logo ? <img src={ch.logo} alt={`${ch.name} logo`} loading="lazy" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" /> : <span className="font-bold text-slate-800">TV</span>}
                </div>
                <h3 className="mt-4 truncate text-base font-bold text-white group-hover:text-theme">{ch.name}</h3>
                <p className="mt-1 text-sm text-slate-300">{ch.cats.slice(0, 2).map(categoryName).join(" · ") || "Television"}</p>
              </Link>
            ))}
          </div>
          {matches.length > 240 && (
            <p className="mt-6 text-sm text-slate-300">Showing 240 of {matches.length} channels. <Link href={`/live-tv?country=${country.code}`} className="text-theme underline">View the full directory</Link>.</p>
          )}
        </div>
      </AppShell>
    </>
  );
}
