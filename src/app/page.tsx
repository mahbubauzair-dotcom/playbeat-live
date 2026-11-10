import type { Metadata } from "next";
import { AppShell } from "@/components/stream/app-shell";
import { homeData, shellStats } from "@/lib/shell-data";
import { vodHomeRails } from "@/lib/vod-catalog";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/stream/json-ld";

export const metadata: Metadata = pageMetadata({
  title: "Playbeat TV — Watch Free Live TV Channels, Movies & Web Series",
  description:
    "Stream free live TV channels worldwide plus thousands of movies, web series and dramas on Playbeat TV. News, sports, cinema — free in your browser.",
  path: "https://playbeattv.buzz/",
});

// Live channels + VOD rails use no-store panel fetches, which crash ISR
// revalidation ("Page changed from static to dynamic" -> intermittent 500s).
// Render home dynamically; the KV pool keeps it fast.
export const dynamic = "force-dynamic";

export default async function Home() {
  const vod = await vodHomeRails();
  return (
    <>
      <JsonLd data={webPageJsonLd({
        path: "https://playbeattv.buzz/",
        name: "Playbeat TV — Watch Free Live TV Channels, Movies & Web Series",
        description:
          "Stream free live TV channels worldwide plus thousands of movies, web series and dramas on Playbeat TV.",
      })} />
      <AppShell view="home" vod={vod} {...homeData()} {...shellStats()} />
    </>
  );
}
