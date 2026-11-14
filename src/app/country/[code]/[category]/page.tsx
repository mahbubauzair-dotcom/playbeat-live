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
import { allCombos, channelPath, channelsOfCountry, comboPath, countryMeta, countryPath, MIN_COMBO } from "@/lib/live-seo";

type Props = { params: Promise<{ code: string; category: string }> };
export const dynamicParams = true;
export function generateStaticParams() {
  return allCombos().slice(0, 150).map((x) => ({ code: x.code, category: x.cat }));
}

function load(code: string, category: string) {
  const cat = decodeURIComponent(category);
  const country = countryMeta(code);
  const known = catalog.categories.some((c) => c.id === cat);
  const channels = country ? channelsOfCountry(country.code).filter((c) => c.cats.includes(cat)) : [];
  return { country, cat, known, channels };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code, category } = await params;
  const { country, cat, known, channels } = load(code, category);
  if (!country || !known || !channels.length) return { title: "Not found", robots: { index: false } };
  const name = categoryName(cat);
  const meta = pageMetadata({
    title: `${country.name} ${name} Channels: ${channels.length} Free Live TV | ${SITE.name}`,
    description: `Watch ${channels.length} free live ${name.toLowerCase()} TV channels from ${country.name}. No sign-up, works on mobile.`.slice(0, 158),
    path: comboPath(country.code, cat),
  });
  return channels.length < MIN_COMBO ? { ...meta, robots: { index: false, follow: true } } : meta;
}

export default async function CountryCategoryPage({ params }: Props) {
  const { code, category } = await params;
  const { country, cat, known, channels } = load(code, category);
  if (!country || !known || !channels.length) notFound();
  const name = categoryName(cat);
  const url = `${SITE_URL}${comboPath(country.code, cat)}`;

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: country.name, item: `${SITE_URL}${countryPath(country.code)}` },
        { "@type": "ListItem", position: 3, name, item: url },
      ] }} />
      <AppShell view="legal" {...shellStats()}>
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <nav aria-label="Breadcrumb" className="text-sm text-slate-300">
            <Link href="/" className="hover:text-theme">Home</Link> / <Link href={countryPath(country.code)} className="hover:text-theme">{country.name}</Link> / {name}
          </nav>
          <h1 className="mt-8 text-3xl font-black text-white sm:text-5xl">{country.flag} {country.name} {name} Channels</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-200">
            {channels.length} free live {name.toLowerCase()} channel{channels.length === 1 ? "" : "s"} from {country.name}. Choose a channel to start watching in your browser, no account needed.
          </p>
          <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {channels.map((ch) => (
              <Link key={ch.id} href={channelPath(ch)} className="group rounded-2xl border border-[var(--site-line)] bg-[var(--surface-2)] p-4 transition hover:-translate-y-1 hover:border-theme hover:bg-[var(--surface-3)]">
                <div className="flex h-28 items-center justify-center rounded-xl bg-white p-4">
                  {ch.logo ? <img src={ch.logo} alt={`${ch.name} logo`} loading="lazy" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" /> : <span className="font-bold text-slate-800">TV</span>}
                </div>
                <h2 className="mt-4 truncate text-base font-bold text-white group-hover:text-theme">{ch.name}</h2>
              </Link>
            ))}
          </div>
        </div>
      </AppShell>
    </>
  );
}
