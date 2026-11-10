import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {catalog} from "@/lib/stream.server";
import {AppShell} from "@/components/stream/app-shell";
import {shellStats} from "@/lib/shell-data";
import {pageMetadata} from "@/lib/seo";
import {JsonLd} from "@/components/stream/json-ld";
type Props={params:Promise<{code:string}>};
export const dynamicParams=true;
export function generateStaticParams(){return catalog.countries.map(c=>({code:c.code.toLowerCase()}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {code}=await params;const country=catalog.countries.find(c=>c.code.toLowerCase()===code.toLowerCase());
 if(!country)return {title:"Country not found",robots:{index:false}};
 const total=catalog.channels.filter(c=>c.country===country.code).length;
 if(!total)return {title:"Country not found",robots:{index:false}};
 return pageMetadata({title:`Free Live TV Channels in ${country.name} | PlayBeat TV`,description:`Explore ${total} publicly listed live television channels from ${country.name}. Browse channel details, categories and viewing options on PlayBeat TV.`,path:`/country/${country.code.toLowerCase()}`});
}
export default async function CountryPage({params}:Props){
 const {code}=await params;const country=catalog.countries.find(c=>c.code.toLowerCase()===code.toLowerCase());if(!country)notFound();
 const matches=catalog.channels.filter(ch=>ch.country===country.code);if(!matches.length)notFound();
 return <><JsonLd data={{"@context":"https://schema.org","@type":"CollectionPage",name:`${country.name} live TV directory`,url:`https://playbeattv.buzz/country/${country.code.toLowerCase()}`,description:`Directory of public live television channels from ${country.name}.`}}/><AppShell view="legal" {...shellStats()}>
 <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><nav className="text-sm text-slate-300"><Link href="/countries" className="hover:text-amber-300">Countries</Link> / {country.name}</nav>
 <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Browse by country</p><h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">{country.flag} Live TV from {country.name}</h1>
 <p className="mt-4 max-w-3xl text-base leading-8 text-slate-200">{matches.length.toLocaleString()} channels in the public directory. Browse channel profiles below; playback depends on current stream and regional availability.</p>
 <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{matches.slice(0,240).map(ch=><Link key={ch.id} href={`/channel/${encodeURIComponent(ch.id)}`} className="group rounded-2xl border border-blue-200/20 bg-[#14294a] p-4 transition hover:-translate-y-1 hover:border-amber-300/60 hover:bg-[#1b355a]"><div className="flex h-28 items-center justify-center rounded-xl bg-white p-4">{ch.logo?<img src={ch.logo} alt="" loading="lazy" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer"/>:<span className="font-bold text-slate-800">TV</span>}</div><h2 className="mt-4 truncate text-base font-bold text-white group-hover:text-amber-200">{ch.name}</h2><p className="mt-1 text-sm text-slate-300">{ch.cats.slice(0,2).join(" · ")||"Television"}</p></Link>)}</div>
 {matches.length>240&&<p className="mt-6 text-sm text-slate-300">Showing 240 channel profiles. <Link href={`/live-tv?country=${country.code}`} className="text-amber-300 underline">View full directory</Link>.</p>}
 </div></AppShell></>;
}
