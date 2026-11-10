// PlayBeat TV — VOD catalog: classification, home rails, browse & search.
// Server-only. Builds a slim in-memory pool (5-min TTL) from per-category
// panel calls — NEVER the 143k-entry full m3u.

import {
  api,
  mapPool,
  vodLine,
  type PanelCategory,
  type SeriesItem,
  type VodItem,
} from "./vod";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/* ---------- classification (proven regexes) ---------- */

const PAK_RE = /\bpk\b|pak\b|paki|urdu|hum\s?tv|\bary\b|in-pk|green\s?ent/i;
const PLATFORM_RE =
  /netflix|prime|hotstar|sony\s?liv|sonyliv|zee5|ullu|hoichoi|alt\s?balaji|altbalaji|mx\s?player|jio|voot|disney|\bhbo\b|hulu|apple\s?tv|web\s?series|originals|amazon/i;
const IN_RE =
  /\bin\b|india|indian|hindi|bollywood|punjabi|desi|daily\s?soap|zee\b|\bsab\b|colors\b|star\s?plus/i;
const HIDDEN_RE =
  /\bkids?\b|cartoon|anim[eé]|wwe|ufc|wrestling|documentar|docu\b|fight|boxing|sports?\b|3d|vr\b|xxx|adult|porn|18\+|french|german|spanish|italian|dutch|turkish|arab|arabic|persian|chinese|japan|korean|thai|viet|indo(nes)?|malay|russian|portug|brazil|latin|somali|swahili|bangla|nepali|marathi|bhojpuri|gujarati|kannada|malayalam|tamil\s?\+|telugu\s?\+|\btr\b|\bnl\b|\bfr\b|\bde\b|\bes\b|\bpt\b|\bpl\b|\bit\b|multi[-\s]?lang|infantile/i;
const ADULT_RE = /xxx|porn|adult|18\+|nude|erotic/i;

export type VodZone = "movies" | "webseries" | "pakistani" | "indian";

export function isAdultName(name: string): boolean {
  return ADULT_RE.test(name);
}

function classify(categoryName: string, kind: "vod" | "series"): VodZone | null {
  const name = categoryName || "";
  if (HIDDEN_RE.test(name)) return null;
  if (PAK_RE.test(name)) return "pakistani";
  if (PLATFORM_RE.test(name)) {
    if (
      kind === "series" &&
      IN_RE.test(name) &&
      !/(netflix|prime|ullu|hoichoi|alt|zee5|mx|hotstar|voot|sony)/i.test(name)
    )
      return "indian";
    return "webseries";
  }
  if (IN_RE.test(name)) return "indian";
  return kind === "vod" ? "movies" : "webseries";
}

/* ---------- card shape shared by rails / browse / search ---------- */

export type VodCard = {
  id: string;
  kind: "movie" | "series";
  name: string;
  poster: string | null;
  year: number;
  rating: number | null;
  cat: string; // panel category id
  catName: string;
  added: number;
  total?: number; // panel-side total for the category (browse pages)
};

type PoolCat = { id: string; name: string; kind: "vod" | "series"; zone: VodZone };

type Pool = {
  cats: PoolCat[];
  byCat: Map<string, { items: VodCard[]; total: number }>;
  all: VodCard[];
};

/* ---------- year + ordering helpers ---------- */

const YEAR_2026_TS = 1767225600; // 2026-01-01T00:00:00Z

function yearFromText(...parts: (string | undefined | null)[]): number {
  for (const p of parts) {
    if (!p) continue;
    const m = String(p).match(/\b(20[0-2][0-9])\b/);
    if (m) return Number(m[1]);
  }
  return 0;
}

function addedNum(v?: string | number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 1_000_000_000 ? n : 0;
}

function ratingOf(r?: string | number, r5?: number): number | null {
  if (r != null && Number(r) > 0) return Math.round(Number(r) * 10) / 10;
  if (r5 && r5 > 0) return Math.round(r5 * 2 * 10) / 10;
  return null;
}

/* ---------- pool builder (5-min TTL) ---------- */

const MAX_PER_CAT = 400; // memory-safe slice; totals stay accurate

// Free Workers plan allows 50 subrequests/invocation. Budget: 1 line +
// 2 category lists + 35 prioritized VOD cats + 1 series list = 39.
// Core audience zones (Pakistani/Indian/web series) always make the cut.
const MAX_VOD_CATS = 35;
const ZONE_PRIORITY: Record<VodZone, number> = {
  pakistani: 0,
  indian: 1,
  webseries: 2,
  movies: 3,
};

let poolPromise: Promise<Pool | null> | null = null;

/* ---------- KV-backed pool (cron warmer -> KV -> app) ---------- */

// The pool is built every 20 min by the playbeat-pool-warmer cron worker
// (own subrequest budget) and stored in KV. Page requests read it in ONE
// KV call instead of firing ~40 panel requests — required on the free
// Workers plan (50 subrequests/invocation).

type SerializedPool = {
  builtAt: number;
  cats: PoolCat[];
  items: VodCard[];
  totals?: Record<string, number>;
};

const POOL_KV_KEY = "pool:v1";
const POOL_MAX_AGE_S = 35 * 60; // cron refreshes every 20 min

function rehydrate(s: SerializedPool): Pool | null {
  if (!s?.cats?.length || !Array.isArray(s.items) || !s.items.length) return null;
  const byCat = new Map<string, { items: VodCard[]; total: number }>();
  for (const c of s.cats) byCat.set(c.id, { items: [], total: s.totals?.[c.id] ?? 0 });
  for (const it of s.items) {
    const b = byCat.get(it.cat);
    if (b) b.items.push(it);
  }
  for (const c of s.cats) {
    const b = byCat.get(c.id);
    if (b && !b.total) b.total = b.items.length; // fallback for missing totals
  }
  return { cats: s.cats, byCat, all: s.items };
}

// Minimal KV surface — avoids depending on @cloudflare/workers-types.
type KVLike = { get<T>(key: string, type: "json"): Promise<T | null> };

async function poolFromKV(): Promise<Pool | null> {
  try {
    const { env } = getCloudflareContext();
    const kv = (env as unknown as { VOD_CACHE?: KVLike }).VOD_CACHE;
    if (!kv) return null;
    const s = await kv.get<SerializedPool>(POOL_KV_KEY, "json");
    if (!s?.builtAt) return null;
    if (Date.now() / 1000 - s.builtAt > POOL_MAX_AGE_S) return null; // stale
    return rehydrate(s);
  } catch {
    return null; // build-time or dev context — fall through to inline build
  }
}

async function buildPool(): Promise<Pool | null> {
  const line = await vodLine();
  if (!line.ok) return null;

  const [vodCats, seriesCats] = await Promise.all([
    api<PanelCategory[]>("get_vod_categories").then((d) => (Array.isArray(d) ? d : [])),
    api<PanelCategory[]>("get_series_categories").then((d) => (Array.isArray(d) ? d : [])),
  ]);

  const cats: PoolCat[] = [];
  for (const c of vodCats) {
    const zone = classify(c.category_name, "vod");
    if (zone) cats.push({ id: c.category_id, name: c.category_name, kind: "vod", zone });
  }
  for (const c of seriesCats) {
    const zone = classify(c.category_name, "series");
    if (zone) cats.push({ id: c.category_id, name: c.category_name, kind: "series", zone });
  }

  const byCat = new Map<string, { items: VodCard[]; total: number }>();
  const fetchCats = cats
    .filter((c) => c.kind === "vod")
    .sort((a, b) => ZONE_PRIORITY[a.zone] - ZONE_PRIORITY[b.zone])
    .slice(0, MAX_VOD_CATS);
  await mapPool(fetchCats, 6, async (cat) => {
    const d = await api<VodItem[]>("get_vod_streams", { category_id: cat.id });
    const list = Array.isArray(d) ? d : [];
    const items: VodCard[] = list.slice(0, MAX_PER_CAT).map((v) => ({
      id: String(v.stream_id),
      kind: "movie" as const,
      name: (v.title || v.name || "").trim(),
      poster: vodCardPoster(v),
      year: yearFromText(v.title || v.name, cat.name),
      rating: ratingOf(v.rating, v.rating_5based),
      cat: String(v.category_id),
      catName: cat.name,
      added: addedNum(v.added),
    }));
    byCat.set(cat.id, { items: items.filter((i) => i.name), total: list.length });
  });

  // Series: ONE unfiltered get_series call (every item carries category_id).
  // The old per-category fan-out (53 parallel requests) silently returned
  // empty on Cloudflare Workers — a single request returns everything in ~2s.
  try {
    const d = await api<SeriesItem[]>("get_series", {}, 60000);
    const list = Array.isArray(d) ? d : [];
    if (!list.length) console.warn(`[vod] series pool: get_series empty/null`);
    else console.warn(`[vod] series pool: ${list.length} raw series`);
    const seriesCatById = new Map(
      cats.filter((c) => c.kind === "series").map((c) => [c.id, c])
    );
    for (const s of list) {
      const cat = seriesCatById.get(String(s.category_id));
      if (!cat) continue;
      const name = (s.name || "").trim();
      if (!name) continue;
      const card: VodCard = {
        id: String(s.series_id),
        kind: "series",
        name,
        poster: vodCardPoster(s),
        year: yearFromText(s.releaseDate, s.name, cat.name),
        rating: ratingOf(s.rating, s.rating_5based),
        cat: String(s.category_id),
        catName: cat.name,
        added: addedNum(s.last_modified),
      };
      const bucket = byCat.get(cat.id);
      if (bucket) {
        bucket.items.push(card);
        bucket.total++;
      } else {
        byCat.set(cat.id, { items: [card], total: 1 });
      }
    }
  } catch {
    // series are optional; movies still render without them
  }

  const all: VodCard[] = [];
  for (const cat of cats) {
    const bucket = byCat.get(cat.id);
    if (bucket) for (const it of bucket.items) all.push(it);
  }
  return { cats, byCat, all };
}

function vodCardPoster(v: { stream_icon?: string; cover?: string }): string | null {
  const u = v.stream_icon || v.cover;
  if (!u) return null;
  const s = String(u).trim();
  if (!s || s === "null" || !/^https?:\/\//i.test(s)) return null;
  return `/api/vod/img?u=${encodeURIComponent(s)}`;
}

export async function getPool(): Promise<Pool | null> {
  if (poolPromise) return poolPromise;

  // L2: cron-published KV snapshot (fast path, 1 subrequest).
  const cached = await poolFromKV();
  if (cached) {
    poolPromise = Promise.resolve(cached);
    setTimeout(() => (poolPromise = null), 4.5 * 60 * 1000);
    return poolPromise;
  }

  // L3: inline build (cold path — e.g. cron missed). Same budget as before.
  poolPromise = buildPool().catch(() => null);
  setTimeout(() => (poolPromise = null), 4.5 * 60 * 1000);
  return poolPromise;
}

/* ---------- ordering ---------- */

function byNewestFirst(items: VodCard[]): VodCard[] {
  const now = Math.floor(Date.now() / 1000);
  return [...items].sort((a, b) => {
    const aNew = a.year >= 2026 || a.added >= YEAR_2026_TS ? 0 : 1;
    const bNew = b.year >= 2026 || b.added >= YEAR_2026_TS ? 0 : 1;
    if (aNew !== bNew) return aNew - bNew;
    return b.added - a.added;
  });
}

function dedupe(items: VodCard[]): VodCard[] {
  const seen = new Set<string>();
  const out: VodCard[] = [];
  for (const it of items) {
    const key = `${it.kind}:${it.name.toLowerCase().replace(/\s*\(\d{4}\)\s*$/, "").trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

/* ---------- home rails ---------- */

export type VodRail = {
  id: string;
  title: string;
  subtitle: string;
  items: VodCard[];
  ranked?: boolean;
};

export type VodHomeData =
  | { ok: true; rails: VodRail[] }
  | { ok: false; reason: "expired" | "banned" | "auth" | "network" | "nocreds" };

export async function vodHomeRails(): Promise<VodHomeData> {
  const line = await vodLine();
  if (!line.ok) return { ok: false, reason: line.reason };

  const pool = await getPool();
  if (!pool) return { ok: false, reason: "network" };

  const zoneItems = (zone: VodZone) =>
    dedupe(byNewestFirst(pool.cats.filter((c) => c.zone === zone).flatMap((c) => pool.byCat.get(c.id)?.items ?? [])));

  const movies = zoneItems("movies");
  const webseries = zoneItems("webseries");
  const pak = zoneItems("pakistani");
  const indian = zoneItems("indian");

  const rails: VodRail[] = [];
  if (movies.length >= 4)
    rails.push({
      id: "top10-movies",
      title: "Top 10 Movies Today",
      subtitle: "Fresh 2026 releases from your panel",
      items: movies.slice(0, 10),
      ranked: true,
    });
  if (movies.length > 10)
    rails.push({
      id: "trending-movies",
      title: "Trending Movies This Week",
      subtitle: "Most recently added films",
      items: movies.slice(10, 22),
    });
  if (webseries.length >= 4)
    rails.push({
      id: "web-series",
      title: "Web Series",
      subtitle: "Netflix, Prime, ULLU, Hoichoi & more",
      items: webseries.slice(0, 12),
    });
  if (pak.length >= 4)
    rails.push({
      id: "pakistani",
      title: "Pakistani Dramas",
      subtitle: "Hum TV, ARY, Geo — new episodes daily",
      items: pak.slice(0, 12),
    });
  if (indian.length >= 4)
    rails.push({
      id: "indian",
      title: "Indian Cinema & Serials",
      subtitle: "Bollywood, Tamil, Telugu & daily soaps",
      items: indian.slice(0, 12),
    });

  return { ok: true, rails };
}

/* ---------- browse ---------- */

export type VodBrowseCat = { id: string; name: string; count: number; kind: "vod" | "series" };

export async function vodBrowseCats(kind: "vod" | "series"): Promise<VodBrowseCat[]> {
  const pool = await getPool();
  if (!pool) return [];
  return pool.cats
    .filter((c) => c.kind === kind)
    .map((c) => ({ id: c.id, name: c.name, count: pool.byCat.get(c.id)?.total ?? 0, kind }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
}

export async function vodBrowsePage(
  kind: "vod" | "series",
  catId: string | null,
  page: number,
  perPage = 60
): Promise<{ items: VodCard[]; total: number; catName: string } | null> {
  const pool = await getPool();
  if (!pool) return null;
  const cats = pool.cats.filter((c) => c.kind === kind && (!catId || c.id === catId));
  if (catId && cats.length === 0) return { items: [], total: 0, catName: catId };
  const items = byNewestFirst(cats.flatMap((c) => pool.byCat.get(c.id)?.items ?? []));
  const total = cats.reduce((n, c) => n + (pool.byCat.get(c.id)?.total ?? 0), 0);
  const start = (page - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    total: Math.max(total, items.length),
    catName: catId ? cats[0]?.name ?? catId : kind === "vod" ? "All Movies" : "All Series",
  };
}

/* ---------- search ---------- */

export async function vodSearch(q: string, limit = 40): Promise<VodCard[]> {
  const term = q.trim().toLowerCase();
  if (term.length < 2) return [];
  const pool = await getPool();
  if (!pool) return [];
  return dedupe(
    pool.all.filter((it) => it.name.toLowerCase().includes(term))
  )
    .sort((a, b) => b.added - a.added)
    .slice(0, limit);
}

/** Poster lookup for detail pages when the info call lacks images. */
export async function vodCardById(
  kind: "movie" | "series",
  id: string
): Promise<VodCard | null> {
  const pool = await getPool();
  if (!pool) return null;
  return pool.all.find((it) => it.kind === kind && it.id === id) ?? null;
}
