import type { MetadataRoute } from "next";
import { catalog } from "@/lib/stream.server";
import { SITE_URL } from "@/lib/seo";
import { allCombos, channelPath, comboPath, countryPath, channelsOfCountry, isIndexable, MIN_COMBO } from "@/lib/live-seo";

/* Live-TV directory only. Movies / Series (panel VOD) pages are deliberately
 * NOT listed here and are sent with X-Robots-Tag: noindex (see next.config.ts). */
const pages: { path: string; frequency: "daily" | "weekly" | "monthly"; priority: number }[] = [
  { path: "/", frequency: "daily", priority: 1 },
  { path: "/live-tv", frequency: "daily", priority: 0.9 },
  { path: "/sports", frequency: "daily", priority: 0.8 },
  { path: "/news", frequency: "daily", priority: 0.8 },
  { path: "/countries", frequency: "weekly", priority: 0.7 },
  { path: "/about", frequency: "monthly", priority: 0.5 },
  { path: "/content-policy", frequency: "monthly", priority: 0.4 },
  { path: "/dmca", frequency: "monthly", priority: 0.4 },
  { path: "/privacy-policy", frequency: "monthly", priority: 0.4 },
  { path: "/terms", frequency: "monthly", priority: 0.4 },
];

// categories that already have their own top-level page
const dedicated = new Set(["movies", "series", "sports", "news"]);

export default function sitemap(): MetadataRoute.Sitemap {
  const d = new Date(catalog.meta.generatedAt);
  const lastModified = Number.isNaN(d.getTime()) ? undefined : d;
  const abs = (p: string) => `${SITE_URL}${p}`;

  return [
    ...pages.map((p) => ({ url: abs(p.path), lastModified, changeFrequency: p.frequency, priority: p.priority })),
    ...catalog.categories
      .filter((c) => !dedicated.has(c.id))
      .map((c) => ({ url: abs(`/category/${encodeURIComponent(c.id)}`), lastModified, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...catalog.countries
      .filter((c) => channelsOfCountry(c.code).length >= MIN_COMBO)
      .map((c) => ({ url: abs(countryPath(c.code)), lastModified, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...allCombos().map((x) => ({ url: abs(comboPath(x.code, x.cat)), lastModified, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...catalog.channels.filter(isIndexable).map((ch) => ({ url: abs(channelPath(ch)), lastModified, changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
