/* Live-TV SEO helpers (server-only). Works on the bundled iptv-org catalog. */
import { catalog, categoryName } from "@/lib/stream.server";
import type { StreamChannel } from "@/lib/stream";

export const MIN_COMBO = 3; // country x category pages need >= 3 channels

export const channelPath = (ch: StreamChannel) => `/channel/${encodeURIComponent(ch.id)}`;
export const countryPath = (code: string) => `/country/${code.toLowerCase()}`;
export const comboPath = (code: string, cat: string) => `${countryPath(code)}/${encodeURIComponent(cat)}`;

export const bestQ = (ch: StreamChannel) => Math.max(0, ...ch.srcs.map((s) => s.q));
export const qLabel = (q: number) => (q >= 2160 ? "4K" : q >= 1080 ? "1080p" : q >= 720 ? "720p (HD)" : q > 0 ? `${q}p` : "");

/** a channel page is worth indexing only if it has a stream AND at least one category */
export const isIndexable = (ch: StreamChannel) => ch.srcs.length > 0 && ch.cats.length > 0;

export const countryMeta = (code: string) =>
  catalog.countries.find((c) => c.code.toLowerCase() === code.toLowerCase());

let byCountry: Map<string, StreamChannel[]> | null = null;
export function channelsOfCountry(code: string): StreamChannel[] {
  if (!byCountry) {
    byCountry = new Map();
    for (const ch of catalog.channels) {
      const k = ch.country.toLowerCase();
      (byCountry.get(k) ?? byCountry.set(k, []).get(k)!).push(ch);
    }
    for (const list of byCountry.values()) list.sort((a, b) => a.name.localeCompare(b.name));
  }
  return byCountry.get(code.toLowerCase()) ?? [];
}

export function categoriesOfCountry(code: string) {
  const counts = new Map<string, number>();
  for (const ch of channelsOfCountry(code)) for (const c of ch.cats) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts.entries()]
    .map(([id, count]) => ({ id, name: categoryName(id), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

let combos: { code: string; cat: string; count: number }[] | null = null;
export function allCombos() {
  if (!combos) {
    combos = [];
    for (const code of new Set(catalog.channels.map((c) => c.country.toLowerCase()))) {
      for (const { id, count } of categoriesOfCountry(code)) if (count >= MIN_COMBO) combos.push({ code, cat: id, count });
    }
  }
  return combos;
}

export function similarChannels(ch: StreamChannel, limit = 6): StreamChannel[] {
  const sameCountry = channelsOfCountry(ch.country).filter(
    (c) => c.id !== ch.id && c.srcs.length > 0 && c.cats.some((x) => ch.cats.includes(x)),
  );
  if (sameCountry.length >= limit) return sameCountry.slice(0, limit);
  const rest = catalog.channels.filter(
    (c) => c.country !== ch.country && c.srcs.length > 0 && c.cats.some((x) => ch.cats.includes(x)),
  );
  return [...sameCountry, ...rest].slice(0, limit);
}

export const lastVerified = (): string | undefined => {
  const hc = (catalog.meta as unknown as { healthCheck?: { checkedAt?: string } }).healthCheck;
  return (hc?.checkedAt ?? catalog.meta.generatedAt)?.slice(0, 10);
};
