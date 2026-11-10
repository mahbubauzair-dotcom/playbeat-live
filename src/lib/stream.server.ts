/* Server-only stream data access — imports the bundled catalog JSON.
   NEVER import this from a client component. */
import rawCatalog from "@/data/stream-catalog.json";
import type {
  StreamCatalog,
  StreamChannel,
} from "@/lib/stream";

export const catalog = rawCatalog as unknown as StreamCatalog;

export function categoryName(id: string): string {
  return catalog.categories.find((c) => c.id === id)?.name ?? id;
}

export function channelById(id: string): StreamChannel | undefined {
  return catalog.channels.find((c) => c.id === id);
}

/** Deterministic "featured" set: channels with logo + best quality signal. */
export function featuredChannels(count = 18): StreamChannel[] {
  return [...catalog.channels]
    .sort((a, b) => {
      const q = (c: StreamChannel) =>
        (c.logo ? 2 : 0) + (c.srcs[0]?.q ?? 0) / 1080;
      return q(b) - q(a) || a.name.localeCompare(b.name);
    })
    .slice(0, count);
}

export function countByCategory(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of catalog.channels)
    for (const cat of c.cats) out[cat] = (out[cat] ?? 0) + 1;
  return out;
}

export function countByCountry(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of catalog.channels) out[c.country] = (out[c.country] ?? 0) + 1;
  return out;
}
