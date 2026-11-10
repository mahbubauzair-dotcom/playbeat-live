// PlayBeat TV — Star IPTV (Xtream Codes) VOD client. Server-only.
// Credentials never reach the browser: playback goes through /api/play/* 302s
// and images through /api/vod/img. All calls degrade gracefully to null.

export const PANEL_BASE =
  process.env.XTREAM_BASE || "http://stream.playbeat.live:8880";

export const PANEL_USER = process.env.XTREAM_USER || "";
export const PANEL_PASS = process.env.XTREAM_PASS || "";

const SMART_TV_UA =
  "Mozilla/5.0 (SMART-TV; LINUX) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/* ---------- tiny TTL cache (works on Node + CF Workers isolates) ---------- */

const memo = new Map<string, { at: number; val: unknown }>();
const TTL_MS = 5 * 60 * 1000;

function cacheGet<T>(key: string): T | undefined {
  const hit = memo.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > TTL_MS) {
    memo.delete(key);
    return undefined;
  }
  return hit.val as T;
}

function cacheSet(key: string, val: unknown) {
  memo.set(key, { at: Date.now(), val });
  // keep the isolate memory bounded
  if (memo.size > 200) {
    const oldest = [...memo.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) memo.delete(oldest[0]);
  }
}

/* ---------- fetch helpers ---------- */

async function rawFetch(url: string, ms = 20000): Promise<Response | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": SMART_TV_UA,
        Accept: "application/json,text/plain,*/*",
      },
      signal: ac.signal,
      cache: "no-store",
    });
    return res;
  } catch (e) {
    console.warn(`[vod] rawFetch throw ${String(e).slice(0, 120)}`);
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Panel API call — never throws; returns null on any failure. */
export async function api<T>(
  action: string,
  extra: Record<string, string> = {},
  ms = 20000
): Promise<T | null> {
  if (!PANEL_USER || !PANEL_PASS) return null;
  const qs = new URLSearchParams({
    username: PANEL_USER,
    password: PANEL_PASS,
    action,
    ...extra,
  });
  const key = `api:${qs.toString()}`;
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const t0 = Date.now();
  const res = await rawFetch(`${PANEL_BASE}/player_api.php?${qs.toString()}`, ms);
  if (!res || !res.ok) {
    console.warn(`[vod] api ${action} fail status=${res ? res.status : "null"} ms=${Date.now() - t0}`);
    return null;
  }
  try {
    const data = (await res.json()) as T;
    console.warn(`[vod] api ${action} ok bytes≈${(res.headers.get("content-length") ?? "?")} ms=${Date.now() - t0}`);
    // Bulk list responses are one-shot pool inputs — caching them exhausts
    // the 128MB isolate and makes later fetches throw instantly (ms=0).
    if (data && action !== "get_vod_streams" && action !== "get_series") cacheSet(key, data);
    return data ?? null;
  } catch (e) {
    console.warn(`[vod] api ${action} json-parse-fail ms=${Date.now() - t0} err=${String(e).slice(0, 80)}`);
    return null;
  }
}

/* ---------- line status ---------- */

export type VodLine =
  | { ok: true; status: string; exp?: string | number | null }
  | { ok: false; reason: "expired" | "banned" | "auth" | "network" | "nocreds" };

export async function vodLine(): Promise<VodLine> {
  if (!PANEL_USER || !PANEL_PASS) return { ok: false, reason: "nocreds" };
  const key = "line";
  const hit = cacheGet<VodLine>(key);
  if (hit) return hit;
  const qs = new URLSearchParams({ username: PANEL_USER, password: PANEL_PASS });
  const res = await rawFetch(
    `${PANEL_BASE}/player_api.php?${qs.toString()}`,
    15000
  );
  let out: VodLine = { ok: false, reason: "network" };
  if (res && res.ok) {
    try {
      const d = (await res.json()) as {
        error?: string;
        username?: string;
        status?: string;
        exp_date?: string | number | null;
        user_info?: {
          username?: string;
          status?: string;
          exp_date?: string | number | null;
          error?: string;
        };
      };
      // Active lines nest auth inside user_info; errors come flat.
      const ui = d.user_info ?? d;
      const err = d.error || ui.error;
      if (err === "USER_EXPIRED") out = { ok: false, reason: "expired" };
      else if (err === "USER_BANNED") out = { ok: false, reason: "banned" };
      else if (!ui.username) out = { ok: false, reason: "auth" };
      else
        out = {
          ok: true,
          status: ui.status || "Active",
          exp: ui.exp_date ?? d.exp_date ?? null,
        };
    } catch {
      out = { ok: false, reason: "network" };
    }
  }
  cacheSet(key, out);
  return out;
}

/* ---------- types ---------- */

export type PanelCategory = {
  category_id: string;
  category_name: string;
  parent_id?: number;
};

export type VodItem = {
  name: string;
  title?: string;
  stream_id: number;
  stream_icon?: string;
  cover?: string;
  rating?: string | number;
  rating_5based?: number;
  added?: string | number;
  category_id: string | number;
  container_extension?: string;
};

export type SeriesItem = {
  name: string;
  series_id: number;
  cover?: string;
  backdrop?: string[] | string;
  plot?: string;
  genre?: string;
  releaseDate?: string;
  last_modified?: string | number;
  rating?: string | number;
  rating_5based?: number;
  category_id: string | number;
};

export type VodInfo = {
  name?: string;
  cover_big?: string;
  movie_image?: string;
  backdrop_path?: string[] | string;
  o_name?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  releasedate?: string;
  releaseDate?: string;
  year?: string;
  duration?: string;
  rating?: string | number;
  rating_5based?: number;
  duration_secs?: number;
  country?: string;
  container_extension?: string;
};

export type Episode = {
  id: string;
  episode_num: number | string;
  title: string;
  container_extension?: string;
  info?: { movie_image?: string; plot?: string; duration?: string };
  season?: number | string;
  added?: string;
};

/* ---------- concurrency helper ---------- */

export async function mapPool<T, R>(
  items: T[],
  pool: number,
  fn: (item: T, i: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(pool, items.length)) },
    async () => {
      while (i < items.length) {
        const idx = i++;
        try {
          results[idx] = await fn(items[idx], idx);
        } catch {
          results[idx] = null as unknown as R;
        }
      }
    }
  );
  await Promise.all(workers);
  return results;
}

/* ---------- detail fetchers ---------- */

export async function getVodInfo(vodId: number): Promise<VodInfo | null> {
  const d = await api<{ info?: VodInfo }>("get_vod_info", {
    vod_id: String(vodId),
  });
  return d?.info ?? null;
}

export async function getSeriesInfo(
  seriesId: number
): Promise<{
  info: VodInfo & { name?: string; cover?: string; backdrop?: string[] };
  episodes?: Record<string, Episode[]>;
} | null> {
  return api("get_series_info", { series_id: String(seriesId) });
}

/* ---------- URL builders ---------- */

export function vodStreamUrl(streamId: number, ext = "mp4"): string {
  return `${PANEL_BASE}/movie/${PANEL_USER}/${PANEL_PASS}/${streamId}.${ext}`;
}

export function episodeStreamUrl(episodeId: string | number, ext = "mp4"): string {
  return `${PANEL_BASE}/series/${PANEL_USER}/${PANEL_PASS}/${episodeId}.${ext}`;
}

/** Proxied image URL (mixed-content + hotlink safe). */
export function proxied(u?: string | null): string | null {
  if (!u) return null;
  const s = String(u).trim();
  if (!s || s === "null" || !/^https?:\/\//i.test(s)) return null;
  return `/api/vod/img?u=${encodeURIComponent(s)}`;
}

export function vodPoster(it: { stream_icon?: string; cover?: string }): string | null {
  return proxied(it.stream_icon || it.cover);
}

/** get_vod_info returns TMDB-style payloads — cover_big first, then movie_image. */
export function vodInfoPoster(info: VodInfo | null): string | null {
  if (!info) return null;
  return proxied(info.cover_big || info.movie_image);
}

export function vodInfoBackdrop(info: VodInfo | null): string | null {
  if (!info) return null;
  const bp = info.backdrop_path;
  const first = Array.isArray(bp) ? bp[0] : typeof bp === "string" ? bp : null;
  return proxied(first || info.cover_big || info.movie_image);
}
