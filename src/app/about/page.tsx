import type { Metadata } from "next";
import { AppShell } from "@/components/stream/app-shell";
import { AboutSection } from "@/components/stream/about-section";
import { catalog } from "@/lib/stream.server";
import { shellStats } from "@/lib/shell-data";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/stream/json-ld";

export const metadata: Metadata = pageMetadata({
  title: "About Playbeat Live — Global Live TV Directory",
  description:
    "Learn about Playbeat Live, its channel directory, public streaming sources and how viewers discover free-to-air television.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd({
        path: "https://playbeat.live/about",
        name: "About Playbeat Live — Global Live TV Directory",
        description:
          "Learn about Playbeat Live, its channel directory, public streaming sources and how viewers discover free-to-air television.",
      })} />
      <AppShell
        view="about"
        {...shellStats()}
        about={
          <AboutSection
            channels={catalog.channels.length}
            generatedAt={catalog.meta.generatedAt.slice(0, 10)}
          />
        }
      />
    </>
  );
}
