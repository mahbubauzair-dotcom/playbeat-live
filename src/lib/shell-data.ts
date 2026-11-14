/* Server-only helper: the shared data every AppShell page needs. */
import { catalog, countByCategory } from "@/lib/stream.server";
import { heroItems, homeRows, popularPicks, topCountries, openingChannels } from "@/lib/spotlight";

/** Chrome stats shared by every page that renders <AppShell>. */
export function shellStats() {
  return {
    categories: catalog.categories,
    countries: catalog.countries,
    catCounts: countByCategory(),
    total: catalog.channels.length,
    countriesCount: catalog.countries.length,
    generatedAt: catalog.meta.generatedAt.slice(0, 10),
  };
}

/** Editorial home data (hero rotation + discovery rows + popular grid). */
export function homeData() {
  return {
    hero: heroItems(),
    rows: homeRows(),
    popular: popularPicks(),
    countryChips: topCountries(12),
    /** priority candidates for the muted auto-play on first site open */
    opening: openingChannels(),
  };
}
