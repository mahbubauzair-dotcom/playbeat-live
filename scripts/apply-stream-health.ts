/* Rebuild the bundled catalog after the stream health check.
 *
 * 1. Prune dead sources from every channel
 * 2. For channels whose sources all died: adopt fresh replacement URLs from
 *    the latest iptv-org streams.json (alive replacement URLs only, max 2)
 * 3. Drop channels still left with zero sources
 * 4. Drop countries left with zero channels
 * 5. Update meta (counts, generatedAt, healthCheck block, criteria lines)
 * 6. Back up the original catalog, write src/ + public/ copies
 *
 * Run: bun scripts/apply-stream-health.ts
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const SRC = new URL("../src/data/stream-catalog.json", import.meta.url).pathname;
const PUB = new URL("../public/data/stream-catalog.json", import.meta.url).pathname;
const STATE = new URL("./health-state.json", import.meta.url).pathname;
const BACKUP = new URL("./catalog-backup-pre-health.json", import.meta.url).pathname;
const LATEST = new URL("./iptv_cache/streams-latest.json", import.meta.url).pathname;

type Src = { u: string; q?: number };
type Ch = {
  id: string;
  name: string;
  country: string;
  flag: string;
  cats: string[];
  logo?: string;
  srcs: Src[];
};
type Cat = {
  meta: Record<string, unknown> & { channels: number; countries: number; categories: number };
  countries: { code: string; name: string; flag: string }[];
  categories: { id: string; name: string }[];
  channels: Ch[];
};

if (!existsSync(STATE)) {
  console.error("health-state.json not found — run check-stream-health.ts first");
  process.exit(1);
}

const catalog = JSON.parse(readFileSync(SRC, "utf8")) as Cat;
const state = JSON.parse(readFileSync(STATE, "utf8")) as Record<
  string,
  { ok: boolean; level: number; code?: number; reason?: string }
>;
const latest = JSON.parse(readFileSync(LATEST, "utf8")) as {
  channel: string | null;
  url: string;
  quality: string | null;
}[];

const ok = (u: string) => state[u]?.ok === true;
const qualityNum = (q: string | null) => {
  const m = q?.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
};

/* ---------- latest-source lookup by channel id ---------- */
const catalogUrls = new Set<string>(catalog.channels.flatMap((c) => c.srcs.map((s) => s.u)));
const freshByChannel = new Map<string, Src[]>();
for (const st of latest) {
  if (!st.channel || !ok(st.url)) continue;
  if (catalogUrls.has(st.url)) continue; // already known (handled by pruning)
  const list = freshByChannel.get(st.channel) ?? [];
  if (!list.some((s) => s.u === st.url))
    list.push({ u: st.url, q: qualityNum(st.quality) });
  freshByChannel.set(st.channel, list);
}

/* ---------- rebuild channels ---------- */
const keptChannels: Ch[] = [];
const removedChannels: string[] = [];
let keptSrcs = 0;
let prunedInLive = 0;
let adoptedChannels = 0;
let adoptedSrcs = 0;

for (const ch of catalog.channels) {
  const aliveSrcs = ch.srcs.filter((s) => ok(s.u));
  if (aliveSrcs.length === 0) {
    // try fresh replacement URLs from the latest iptv-org index
    const fresh = (freshByChannel.get(ch.id) ?? [])
      .sort((a, b) => (b.q ?? 0) - (a.q ?? 0))
      .slice(0, 2);
    if (fresh.length === 0) {
      removedChannels.push(ch.id);
      continue;
    }
    keptChannels.push({ ...ch, srcs: fresh });
    adoptedChannels++;
    adoptedSrcs += fresh.length;
    keptSrcs += fresh.length;
    continue;
  }
  if (aliveSrcs.length < ch.srcs.length) prunedInLive += ch.srcs.length - aliveSrcs.length;
  keptChannels.push({ ...ch, srcs: aliveSrcs });
  keptSrcs += aliveSrcs.length;
}

/* ---------- recompute countries ---------- */
const usedCountries = new Set(keptChannels.map((c) => c.country));
const keptCountryList = catalog.countries.filter((c) => usedCountries.has(c.code));

/* ---------- meta ---------- */
const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const before = {
  channels: catalog.channels.length,
  srcs: [...catalogUrls].length,
  countries: catalog.countries.length,
};

const nextMeta = {
  ...catalog.meta,
  generatedAt: now,
  channels: keptChannels.length,
  countries: keptCountryList.length,
  criteria: [
    ...((catalog.meta.criteria as unknown as string[]) ?? []),
    "Stream health verified (manifest, playlist and segment probes)",
  ],
  healthCheck: {
    checkedAt: now,
    probedUrls: Object.keys(state).length,
    channelsBefore: before.channels,
    channelsAfter: keptChannels.length,
    sourcesBefore: before.srcs,
    sourcesAfter: keptSrcs,
    deadSourcesPruned: before.srcs - (keptSrcs - adoptedSrcs),
    deadSourcesPrunedInLiveChannels: prunedInLive,
    channelsRevivedWithFreshUrls: adoptedChannels,
    replacementSourcesAdopted: adoptedSrcs,
    method: "manifest + variant playlist + segment probe (HLS liveness)",
  },
};

const next = { ...catalog, meta: nextMeta, countries: keptCountryList, channels: keptChannels };

/* ---------- hero / curated survival report ---------- */
const aliveIds = new Set(keptChannels.map((c) => c.id));
const curated = [
  "BloombergTV.us", "France24.fr", "AlJazeera.qa", "ARTFLIXMovieClassics.us",
  "AndTV.in", "B4UBhojpuri.in", "TRTWorld.tr", "NickelodeonLatinAmerica.us",
  "BabySharkTV.us", "BabyFirst.us", "RedBullTV.at", "TSports.bd", "Euroenglish.fr",
  "CricketGold.au", "WillowSports.us", "Willow.us", "ABCNewsLive.us", "NBCNewsNOW.us",
  "CBSNews247.us", "AlJazeeraDocumentary.qa", "Vevo80s.us", "Vevo2K.us", "Tastemade.us",
  "EuronewsEnglish.fr", "BloombergOriginals.us", "CNAOriginals.sg",
];
const curatedDead = curated.filter((id) => !aliveIds.has(id));

/* ---------- category coverage ---------- */
const catCounts: Record<string, number> = {};
for (const c of keptChannels) for (const cat of c.cats) catCounts[cat] = (catCounts[cat] ?? 0) + 1;
const emptyCategories = catalog.categories.filter((c) => !catCounts[c.id]).map((c) => c.id);

/* ---------- write ---------- */
copyFileSync(SRC, BACKUP);
const json = JSON.stringify(next, null, 2) + "\n";
writeFileSync(SRC, json);
writeFileSync(PUB, json);

console.log("channels :", `${before.channels} -> ${keptChannels.length}  (-${before.channels - keptChannels.length})`);
console.log("sources  :", `${before.srcs} -> ${keptSrcs}  (dead pruned in live channels: ${prunedInLive})`);
console.log("revived  :", `${adoptedChannels} channels via ${adoptedSrcs} fresh iptv-org sources`);
console.log("countries:", `${before.countries} -> ${keptCountryList.length}`);
console.log("file size:", (json.length / 1_048_576).toFixed(2), "MB (backup:", (readFileSync(BACKUP).length / 1_048_576).toFixed(2) + "MB)");
console.log("hero/curated dead:", curatedDead.length ? curatedDead.join(", ") : "none — all survive");
console.log("empty categories:", emptyCategories.length ? emptyCategories.join(", ") : "none");
console.log("backup ->", BACKUP);
console.log("written ->", SRC, "+", PUB);
