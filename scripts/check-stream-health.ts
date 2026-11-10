/* Stream health checker for the bundled PlayBeat TV catalog.
 *
 * For every unique source URL in src/data/stream-catalog.json, verify the
 * stream is actually playable with a 3-level probe:
 *   L1  GET manifest            -> 2xx + body contains #EXTM3U
 *   L2  GET first variant       -> body contains #EXTINF / #EXT-X-PART / #EXT-X-MAP / #EXT-X-TARGETDURATION
 *      (only when manifest is a master playlist; 1 nesting level allowed)
 *   L3  GET first segment       -> 2xx + >=1 byte (Range: bytes=0-16383)
 *      (skipped for AES-encrypted playlists — hls.js fetches keys itself)
 *
 * Results are persisted to scripts/health-state.json (crash-resumable).
 * Run: bun scripts/check-stream-health.ts [--concurrency 96] [--fresh]
 */

import catalogJson from "../src/data/stream-catalog.json";

const CATALOG = catalogJson as unknown as {
  channels: { id: string; name: string; srcs: { u: string; q?: number }[] }[];
};

const STATE_FILE = new URL("./health-state.json", import.meta.url).pathname;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/* ---------- CLI ---------- */
const args = process.argv.slice(2);
const flag = (name: string, dflt: number) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : dflt;
};
const FRESH = args.includes("--fresh");
const CONCURRENCY = Math.max(1, Math.min(128, flag("--concurrency", 32)));
const MAX = flag("--max", 0); // optional per-invocation cap (chunked runs; 0 = no cap)

/* ---------- types ---------- */
interface ProbeResult {
  ok: boolean;
  level: 0 | 1 | 2 | 3; // deepest level reached
  code?: number; // last HTTP status
  reason?: string;
  ms: number;
}

/* ---------- state (resume support) ---------- */
import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";

function loadState(): Record<string, ProbeResult> {
  if (FRESH || !existsSync(STATE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

const state: Record<string, ProbeResult> = loadState();

function saveState() {
  const tmp = STATE_FILE + ".tmp";
  writeFileSync(tmp, JSON.stringify(state));
  renameSync(tmp, STATE_FILE);
}

/* ---------- fetch helpers ---------- */
const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524]);

async function fetchLimited(
  url: string,
  timeoutMs: number,
  range?: string
): Promise<{ res: Response; text?: string; err?: string } | { res: null; text?: never; err: string }> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { "user-agent": UA, accept: "*/*" };
    if (range) headers.range = range;
    const res = await fetch(url, { signal: ac.signal, headers, redirect: "follow" });
    return { res };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { res: null, err: msg.includes("abort") ? "timeout" : msg.slice(0, 120) };
  } finally {
    clearTimeout(timer);
  }
}

/** GET and read up to cap bytes of the body as text. */
async function fetchText(url: string, timeoutMs: number, cap = 512_000) {
  const r = await fetchLimited(url, timeoutMs);
  if (!r.res) return { status: 0, text: "", err: r.err };
  if (!r.res.ok) {
    try { await r.res.body?.cancel(); } catch {}
    return { status: r.res.status, text: "", err: undefined };
  }
  const reader = r.res.body?.getReader();
  if (!reader) return { status: r.res.status, text: "", err: "no-body" };
  const decoder = new TextDecoder();
  let text = "";
  try {
    while (text.length < cap) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
  } catch {
    /* truncated read is fine — we only need the head of the playlist */
  }
  try { await reader.cancel(); } catch {}
  return { status: r.res.status, text, err: undefined };
}

/** GET first chunk only; pass if any byte arrives. */
async function fetchSegmentProbe(url: string, timeoutMs: number): Promise<{ ok: boolean; status: number; err?: string }> {
  const r = await fetchLimited(url, timeoutMs, "bytes=0-16383");
  if (!r.res) return { ok: false, status: 0, err: r.err };
  const res = r.res;
  if (!res.ok) {
    try { await res.body?.cancel(); } catch {}
    return { ok: false, status: res.status };
  }
  const reader = res.body?.getReader();
  if (!reader) return { ok: false, status: res.status, err: "no-body" };
  try {
    const { done, value } = await reader.read();
    const ok = !done && !!value && value.length > 0;
    return { ok, status: res.status };
  } catch (e) {
    return { ok: false, status: res.status, err: e instanceof Error ? e.message : "read-err" };
  } finally {
    try { await reader.cancel(); } catch {}
  }
}

/* ---------- m3u8 parsing ---------- */
interface ManifestInfo {
  kind: "master" | "media" | "empty";
  variants: string[];
  segments: string[];
  encrypted: boolean;
}

function parseManifest(text: string, baseUrl: string): ManifestInfo {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const variants: string[] = [];
  const segments: string[] = [];
  let expectVariant = false;
  let encrypted = false;

  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith("#")) {
      if (line.startsWith("#EXT-X-STREAM-INF")) expectVariant = true;
      if (/^#EXT-X-KEY:.*METHOD=(?!NONE)[A-Z-]+/.test(line)) encrypted = true;
      continue;
    }
    // resolve URI
    let abs: string;
    try {
      abs = new URL(line, baseUrl).toString();
    } catch {
      continue;
    }
    if (expectVariant) {
      variants.push(abs);
      expectVariant = false;
    } else {
      segments.push(abs);
    }
  }

  let kind: ManifestInfo["kind"] = "empty";
  if (variants.length > 0) kind = "master";
  else if (
    segments.length > 0 ||
    /#EXTINF/.test(text) ||
    /#EXT-X-TARGETDURATION/.test(text) ||
    /#EXT-X-MAP/.test(text) ||
    /#EXT-X-PART/.test(text)
  )
    kind = "media";

  return { kind, variants, segments, encrypted };
}

/* ---------- per-URL probe with retries ---------- */
async function probeOnce(url: string): Promise<ProbeResult> {
  const t0 = Date.now();

  // L1: manifest
  const l1 = await fetchText(url, 9000);
  if (l1.err) return { ok: false, level: 1, code: 0, reason: `net:${l1.err}`, ms: Date.now() - t0 };
  if (l1.status < 200 || l1.status >= 300)
    return { ok: false, level: 1, code: l1.status, reason: `http${l1.status}`, ms: Date.now() - t0 };
  if (!l1.text.includes("#EXTM3U"))
    return { ok: false, level: 1, code: l1.status, reason: l1.text.trim() ? "not-m3u8" : "empty-body", ms: Date.now() - t0 };

  const info = parseManifest(l1.text, url);

  // L2: variant playlist (masters only, one nesting level)
  let mediaInfo = info;
  if (info.kind === "master") {
    const l2url = info.variants[0];
    if (!l2url) return { ok: false, level: 2, code: l1.status, reason: "master-no-variant", ms: Date.now() - t0 };
    const l2 = await fetchText(l2url, 9000);
    if (l2.err) return { ok: false, level: 2, code: 0, reason: `net:${l2.err}`, ms: Date.now() - t0 };
    if (l2.status < 200 || l2.status >= 300)
      return { ok: false, level: 2, code: l2.status, reason: `variant-http${l2.status}`, ms: Date.now() - t0 };
    if (!l2.text.includes("#EXTM3U"))
      return { ok: false, level: 2, code: l2.status, reason: "variant-not-m3u8", ms: Date.now() - t0 };
    mediaInfo = parseManifest(l2.text, l2url);
    if (mediaInfo.kind === "master") {
      // nested master — accept a live nested variant playlist as media
      const l2b = mediaInfo.variants[0];
      if (!l2b) return { ok: false, level: 2, code: l2.status, reason: "nested-master-empty", ms: Date.now() - t0 };
      const l2c = await fetchText(l2b, 9000);
      if (l2c.err || l2c.status < 200 || l2c.status >= 300 || !l2c.text.includes("#EXTM3U"))
        return { ok: false, level: 2, code: l2c.status || 0, reason: "nested-variant-fail", ms: Date.now() - t0 };
      mediaInfo = parseManifest(l2c.text, l2b);
    }
  }

  if (mediaInfo.kind === "empty")
    return { ok: false, level: 2, code: l1.status, reason: "empty-playlist", ms: Date.now() - t0 };

  // L3: segment probe (skip for encrypted playlists)
  if (mediaInfo.encrypted)
    return { ok: true, level: 3, code: l1.status, reason: "encrypted-playlist-ok", ms: Date.now() - t0 };

  const seg = mediaInfo.segments[0];
  if (!seg) return { ok: false, level: 2, code: l1.status, reason: "no-segments", ms: Date.now() - t0 };

  const l3 = await fetchSegmentProbe(seg, 9000);
  if (l3.err) return { ok: false, level: 3, code: l3.status, reason: `seg:${l3.err}`, ms: Date.now() - t0 };
  if (!l3.ok) return { ok: false, level: 3, code: l3.status, reason: `seg-http${l3.status || 0}`, ms: Date.now() - t0 };
  return { ok: true, level: 3, code: l3.status, reason: "segment-ok", ms: Date.now() - t0 };
}

function isRetryable(r: ProbeResult): boolean {
  if (!r.ok) {
    if (r.reason?.startsWith("net:")) return true; // timeouts / connection resets
    if (r.code && (RETRYABLE.has(r.code) || r.code === 403)) return true;
  }
  return false;
}

async function probeWithRetries(url: string, attempts = 3): Promise<ProbeResult> {
  let last: ProbeResult | null = null;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1200 * i)); // 1.2s, 2.4s backoff
    const r = await probeOnce(url);
    last = r;
    if (r.ok || !isRetryable(r)) return r;
  }
  return last!;
}

/* ---------- worker pool ---------- */
async function main() {
  let urls: string[] = [];
  for (const ch of CATALOG.channels) for (const s of ch.srcs) urls.push(s.u);
  const ufi = args.indexOf("--urls-file");
  const urlsFile = ufi >= 0 && args[ufi + 1] ? args[ufi + 1] : null;
  if (urlsFile) {
    urls = JSON.parse(readFileSync(urlsFile, "utf8")) as string[];
    console.log(`[health] urls-file mode: ${urls.length} urls (state shared)`);
  }
  const unique = [...new Set(urls)];
  const pending = unique.filter((u) => !(u in state));
  const remainingBefore = pending.length;
  if (MAX > 0) pending.length = Math.min(pending.length, MAX);

  console.log(
    `[health] channels=${CATALOG.channels.length} uniqueUrls=${unique.length} cached=${unique.length - remainingBefore} toCheck=${pending.length} concurrency=${CONCURRENCY}`
  );

  const t0 = Date.now();
  let done = 0;
  let alive = 0;
  let dead = 0;
  const total = pending.length;

  async function worker(id: number) {
    while (true) {
      const url = pending.pop();
      if (!url) return;
      const r = await probeWithRetries(url);
      state[url] = r;
      if (r.ok) alive++;
      else dead++;
      done++;
      if (done % 150 === 0) {
        const rate = done / ((Date.now() - t0) / 1000);
        const etaMin = ((total - done) / rate / 60).toFixed(1);
        const rss = (process.memoryUsage.rss() / 1_048_576).toFixed(0);
        console.log(
          `[health] ${done}/${total} alive=${alive} dead=${dead} rate=${rate.toFixed(1)}/s eta=${etaMin}min rss=${rss}MB (w${id})`
        );
        saveState();
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));
  saveState();

  const reasons: Record<string, number> = {};
  for (const u of unique) {
    const r = state[u];
    if (r && !r.ok) {
      const key = (r.reason ?? "unknown").replace(/net:[^;]*/, "net:*");
      reasons[key] = (reasons[key] ?? 0) + 1;
    }
  }

  console.log(`\n[health] DONE in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  console.log(
    `[health] alive=${unique.filter((u) => state[u]?.ok).length}/${unique.length} checked this run: ${done}`
  );
  const left = unique.filter((u) => !(u in state)).length;
  console.log(`[health] remaining=${left}`);
  console.log("[health] dead-by-reason:", JSON.stringify(reasons, null, 1));
  console.log(`[health] state saved -> ${STATE_FILE}`);
}

for (const sig of ["SIGINT", "SIGTERM"] as const)
  process.on(sig, () => {
    console.log("[health] signal received — saving state and exiting");
    saveState();
    process.exit(0);
  });

main().catch((e) => {
  console.error("[health] fatal:", e);
  saveState();
  process.exit(1);
});
