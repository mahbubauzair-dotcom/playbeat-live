import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { catalog, categoryName } from "@/lib/stream.server";
import { SITE } from "@/lib/site";
import { siteIntro } from "@/lib/site-seo";
import { pageMetadata, SITE_URL } from "@/lib/seo";
import { AppShell } from "@/components/stream/app-shell";
import { shellStats } from "@/lib/shell-data";
import { JsonLd } from "@/components/stream/json-ld";
import { bestQ, channelPath, comboPath, countryMeta, countryPath, isIndexable, lastVerified, qLabel, similarChannels } from "@/lib/live-seo";

type Props = { params: Promise<{ slug: string }> };
const byId = new Map(catalog.channels.map((ch) => [ch.id.toLowerCase(), ch]));
const findChannel = (slug: string) => byId.get(decodeURIComponent(slug).toLowerCase());

export const dynamicParams = true;
export function generateStaticParams() {
  return catalog.channels.filter((c) => !!c.logo && isIndexable(c)).slice(0, 150).map((c) => ({ slug: c.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ch = findChannel(slug);
  if (!ch) return { title: "Channel not found | Playbeat Live", robots: { index: false } };
  const country = countryMeta(ch.country)?.name ?? ch.country;
  const q = qLabel(bestQ(ch));
  const cat = ch.cats[0] ? categoryName(ch.cats[0]).toLowerCase() : "";
  const meta = pageMetadata({
    title: `Watch ${ch.name} Live Free (${country}) | ${SITE.name}`,
    description: `Stream ${ch.name}${cat ? `, a ${cat} channel` : ""} from ${country}${q ? ` in up to ${q}` : ""}. Free, no sign-up, works in your browser.`.slice(0, 158),
    path: channelPath(ch),
  });
  return isIndexable(ch) ? meta : { ...meta, robots: { index: false, follow: true } };
}

export default async function ChannelPage({ params }: Props) {
  const { slug } = await params;
  const ch = findChannel(slug);
  if (!ch) notFound();

  const country = countryMeta(ch.country);
  const countryName = country?.name ?? ch.country;
  const url = `${SITE_URL}${channelPath(ch)}`;
  const q = qLabel(bestQ(ch));
  const cats = ch.cats.map((id) => ({ id, name: categoryName(id) }));
  const similar = similarChannels(ch, 6);
  const verified = lastVerified();

  const crumbs = [
    { name: "Home", item: `${SITE_URL}/` },
    { name: countryName, item: `${SITE_URL}${countryPath(ch.country)}` },
    ...(cats[0] ? [{ name: cats[0].name, item: `${SITE_URL}${comboPath(ch.country, cats[0].id)}` }] : []),
    { name: ch.name, item: url },
  ];
  const ld = [
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })),
    },
    {
      "@context": "https://schema.org", "@type": "TelevisionChannel", name: ch.name, url,
      ...(ch.logo ? { image: ch.logo } : {}),
      description: `${ch.name} is a${cats[0] ? ` ${cats[0].name.toLowerCase()}` : ""} TV channel from ${countryName}.`,
    },
  ];

  return (
    <>
      {ld.map((d, i) => <JsonLd key={i} data={d} />)}
      <AppShell view="legal" {...shellStats()}>
        <article className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
          <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap gap-2 text-sm text-slate-300">
            <Link href="/" className="hover:text-theme">Home</Link><span>/</span>
            <Link href={countryPath(ch.country)} className="hover:text-theme">{countryName}</Link><span>/</span>
            {cats[0] && (<><Link href={comboPath(ch.country, cats[0].id)} className="hover:text-theme">{cats[0].name}</Link><span>/</span></>)}
            <span className="text-white">{ch.name}</span>
          </nav>

          <div className="rounded-3xl border border-[var(--site-line)] bg-gradient-to-br from-[var(--surface-3)] via-[var(--surface-2)] to-[var(--surface-1)] p-6 shadow-2xl sm:p-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex size-32 shrink-0 items-center justify-center rounded-2xl bg-white p-5 shadow-xl">
                {ch.logo ? <img src={ch.logo} alt={`${ch.name} channel logo`} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" /> : <span className="font-bold text-slate-900">TV</span>}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-theme">Live channel</p>
                <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-5xl">Watch {ch.name} Live</h1>
                <p className="mt-3 text-base leading-7 text-slate-200">
                  {cats[0] ? `${cats.map((c) => c.name).join(", ")} · ` : ""}{countryName}{q ? ` · up to ${q}` : ""}. Free to watch, no account needed.
                </p>
                <Link href={`/live-tv#watch=${encodeURIComponent(ch.id)}`} className="mt-6 inline-flex rounded-full bg-theme px-6 py-3 text-sm font-bold text-[var(--site-on-accent)] transition hover:brightness-110">Watch live</Link>
              </div>
            </div>
          </div>

          <section className="mt-10 rounded-2xl border border-[var(--site-line)] bg-white/[0.04] p-6">
            <h2 className="text-2xl font-bold text-white">About {ch.name}</h2>
            <p className="mt-4 text-base leading-8 text-slate-200">
              {ch.name} is a{cats[0] ? ` ${cats[0].name.toLowerCase()}` : ""} channel from {countryName}. {SITE.name} lists {ch.srcs.length} public stream source{ch.srcs.length === 1 ? "" : "s"} for it{q ? `, up to ${q}` : ""}. The video is delivered directly by the broadcaster’s own servers, so availability can vary by region and time of day.
            </p>
            <dl className="mt-6 grid grid-cols-[max-content_1fr] gap-x-8 gap-y-2 text-sm">
              <dt className="text-slate-400">Country</dt><dd className="text-white"><Link href={countryPath(ch.country)} className="underline decoration-white/30 hover:text-theme">{countryName}</Link></dd>
              {cats.length > 0 && (<><dt className="text-slate-400">Category</dt><dd className="text-white">{cats.map((c) => c.name).join(", ")}</dd></>)}
              {q && (<><dt className="text-slate-400">Best quality</dt><dd className="text-white">{q}</dd></>)}
              <dt className="text-slate-400">Stream sources</dt><dd className="text-white">{ch.srcs.length}</dd>
              {verified && (<><dt className="text-slate-400">Catalog checked</dt><dd className="text-white">{verified}</dd></>)}
            </dl>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-bold text-white">Questions about {ch.name}</h2>
            <h3 className="mt-4 font-semibold text-white">Is {ch.name} free to watch?</h3>
            <p className="mt-1 text-slate-300">Yes. It is a publicly available free-to-air stream, so no account or payment is needed on {SITE.name}.</p>
            <h3 className="mt-4 font-semibold text-white">Why is {ch.name} not playing?</h3>
            <p className="mt-1 text-slate-300">Try another source if one is offered, refresh the page, or check whether the channel is limited to viewers in {countryName}. Broadcasters can change or remove streams without notice.</p>
          </section>

          {similar.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-bold text-white">More channels like {ch.name}</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {similar.map((s) => (
                  <Link key={s.id} href={channelPath(s)} className="group rounded-2xl border border-[var(--site-line)] bg-[var(--surface-2)] p-4 transition hover:-translate-y-1 hover:border-theme">
                    <div className="flex h-20 items-center justify-center rounded-xl bg-white p-3">
                      {s.logo ? <img src={s.logo} alt={`${s.name} logo`} loading="lazy" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" /> : <span className="font-bold text-slate-800">TV</span>}
                    </div>
                    <p className="mt-3 truncate text-sm font-bold text-white group-hover:text-theme">{s.name}</p>
                    <p className="text-xs text-slate-400">{countryMeta(s.country)?.name ?? s.country}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
      </AppShell>
    </>
  );
}
