import type { Metadata } from "next";
import { AppShell } from "@/components/stream/app-shell";
import { shellStats } from "@/lib/shell-data";
import { allCountriesWithCounts } from "@/lib/spotlight";
import { CountriesBrowser } from "@/components/stream/countries-browser";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/stream/json-ld";

export const metadata: Metadata = pageMetadata({
  title: "Live TV Channels by Country — Playbeat TV",
  description:
    "Browse the international television directory by country and discover available public channels from different regions.",
  path: "/countries",
});

export default function CountriesPage() {
  const chips = allCountriesWithCounts();
  return (
    <>
      <JsonLd data={webPageJsonLd({
        path: "https://playbeattv.buzz/countries",
        name: "Live TV Channels by Country — Playbeat TV",
        description:
          "Browse the international television directory by country and discover available public channels from different regions.",
        type: "CollectionPage",
      })} />
      <AppShell
        view="legal"
        activeNav="countries"
        {...shellStats()}
      >
        <CountriesBrowser chips={chips} />
      </AppShell>
    </>
  );
}
