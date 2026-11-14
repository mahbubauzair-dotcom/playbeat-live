import type { Metadata } from "next";
import { AppShell } from "@/components/stream/app-shell";
import { homeData, shellStats } from "@/lib/shell-data";
import { vodHomeRails } from "@/lib/vod-catalog";
import { pageMetadata, webPageJsonLd, SITE_URL } from "@/lib/seo";
import { homeTitle, homeDescription } from "@/lib/site-seo";
import { JsonLd } from "@/components/stream/json-ld";

export const metadata: Metadata = pageMetadata({
  title: homeTitle(),
  description: homeDescription(),
  path: `${SITE_URL}/`,
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
        path: `${SITE_URL}/`,
        name: homeTitle(),
        description: homeDescription(),
      })} />
      <AppShell view="home" vod={vod} {...homeData()} {...shellStats()} />
    </>
  );
}
