import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { catalog } from "@/lib/stream.server";
import { pageMetadata } from "@/lib/seo";
import { AppShell } from "@/components/stream/app-shell";
import { shellStats } from "@/lib/shell-data";
import { JsonLd } from "@/components/stream/json-ld";

type Props = { params: Promise<{ slug: string }> };
const byId = new Map(catalog.channels.map(ch => [ch.id.toLowerCase(), ch]));
const findChannel = (slug: string) => byId.get(decodeURIComponent(slug).toLowerCase());
export const dynamicParams = true;
export function generateStaticParams() { return catalog.channels.filter(c=>!!c.logo).slice(0,80).map(c=>({slug:c.id})); }
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {slug}=await params;const ch=findChannel(slug);
 if(!ch) return {title:"Channel not found — PlayBeat TV",robots:{index:false}};
 const country=catalog.countries.find(c=>c.code===ch.country)?.name??ch.country;
 return pageMetadata({title:`${ch.name} Live TV — ${country} | PlayBeat TV`,description:`Explore ${ch.name}, a listed television channel from ${country}. Find its categories, available stream sources and watch options on PlayBeat TV.`,path:`/channel/${encodeURIComponent(ch.id)}`});
}
export default async function ChannelPage({params}:Props){
 const {slug}=await params;const ch=findChannel(slug);
 if(!ch)notFound();
 const country=catalog.countries.find(c=>c.code===ch.country);
 const countryName=country?.name??ch.country;
 const url=`https://playbeattv.buzz/channel/${encodeURIComponent(ch.id)}`;
 return <>
  <JsonLd data={{"@context":"https://schema.org","@type":"WebPage",name:`${ch.name} — PlayBeat TV`,url,description:`Information and viewing options for ${ch.name} from ${countryName}.`,breadcrumb:{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Home",item:"https://playbeattv.buzz/"},{"@type":"ListItem",position:2,name:"Countries",item:"https://playbeattv.buzz/countries"},{"@type":"ListItem",position:3,name:ch.name,item:url}]}}} />
  <AppShell view="legal" {...shellStats()}>
   <article className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
    <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap gap-2 text-sm text-slate-300"><Link href="/" className="hover:text-amber-300">Home</Link><span>/</span><Link href="/countries" className="hover:text-amber-300">Countries</Link><span>/</span><span className="text-white">{ch.name}</span></nav>
    <div className="rounded-3xl border border-blue-200/20 bg-gradient-to-br from-[#152d52] via-[#101d3a] to-[#20183b] p-6 shadow-2xl sm:p-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
       <div className="flex size-32 shrink-0 items-center justify-center rounded-2xl bg-white p-5 shadow-xl">
        {ch.logo?<img src={ch.logo} alt={`${ch.name} channel logo`} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer"/>:<span className="font-bold text-slate-900">TV</span>}
       </div>
       <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Channel directory</p><h1 className="mt-2 text-3xl font-extrabold text-white sm:text-5xl">{ch.name}</h1><p className="mt-3 text-base leading-7 text-slate-200">Listed in {countryName}{ch.cats.length?` · ${ch.cats.join(", ")}`:""}. Stream availability can change by location and broadcaster.</p><Link href={`/live-tv#watch=${encodeURIComponent(ch.id)}`} className="mt-6 inline-flex rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300">Watch available stream</Link></div>
      </div>
    </div>
    <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-6"><h2 className="text-2xl font-bold text-white">About this channel</h2><p className="mt-4 text-base leading-8 text-slate-200">{ch.name} is included in the PlayBeat TV publicly indexed channel directory under {countryName}. {ch.srcs.length} stream {ch.srcs.length===1?"source is":"sources are"} listed in the catalog. Listing does not guarantee a continuously available or globally accessible broadcast.</p>
      <div className="mt-5 flex flex-wrap gap-3"><Link href={`/country/${ch.country.toLowerCase()}`} className="rounded-full border border-white/20 px-4 py-2 text-sm text-amber-200 hover:bg-white/10">More channels from {countryName}</Link>{ch.cats.map(cat=><Link key={cat} href={["movies","series","sports","news"].includes(cat)?`/${cat}`:`/category/${cat}`} className="rounded-full border border-white/20 px-4 py-2 text-sm text-slate-200 hover:bg-white/10">{catalog.categories.find(c=>c.id===cat)?.name??cat}</Link>)}</div>
    </section>
   </article>
  </AppShell>
 </>;
}
