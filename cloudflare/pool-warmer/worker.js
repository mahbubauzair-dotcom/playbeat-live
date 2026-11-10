// playbeat-pool-warmer — cron-triggered VOD pool builder for PlayBeat TV.
//
// The main site runs on the free Workers plan (50 subrequests/invocation),
// so page requests must NEVER build the ~40-call VOD pool themselves.
// This worker runs on a cron, builds the pool with its own subrequest
// budget, and stores the slim result in KV. The site reads it in 1 call.
//
// KV shape: key "pool:v1" -> { builtAt, cats:[{id,name,kind,zone}], items:[VodCard] }
// The app rehydrates byCat from items on read.

const PANEL_BASE = "http://stream.playbeat.live:80";

/* ---------- classification (mirror of src/lib/vod-catalog.ts) ---------- */

const PAK_RE = /\bpk\b|pak\b|paki|urdu|hum\s?tv|\bary\b|in-pk|green\s?ent/i;
const PLATFORM_RE =
  /netflix|prime|hotstar|sony\s?liv|sonyliv|zee5|ullu|hoichoi|alt\s?balaji|altbalaji|mx\s?player|jio|voot|disney|\bhbo\b|hulu|apple\s?tv|web\s?series|originals|amazon/i;
const IN_RE =
  /\bin\b|india|indian|hindi|bollywood|punjabi|desi|daily\s?soap|zee\b|\bsab\b|colors\b|star\s?plus/i;
const HIDDEN_RE =
  /\bkids?\b|cartoon|anim[eé]|wwe|ufc|wrestling|documentar|docu\b|fight|boxing|sports?\b|3d|vr\b|xxx|adult|porn|18\+|french|german|spanish|italian|dutch|turkish|arab|arabic|persian|chinese|japan|korean|thai|viet|indo(nes)?|malay|russian|portug|brazil|latin|somali|swahili|bangla|nepali|marathi|bhojpuri|gujarati|kannada|malayalam|tamil\s?\+|telugu\s?\+|\btr\b|\bnl\b|\bfr\b|\bde\b|\bes\b|\bpt\b|\bpl\b|\bit\b|multi[-\s]?lang|infantile/i;

function classify(categoryName, kind) {
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

const ZONE_PRIORITY = { pakistani: 0, indian: 1, webseries: 2, movies: 3 };
const MAX_VOD_CATS = 35;
const MAX_PER_CAT = 400;

/* ---------- panel helpers ---------- */

function apiQ(user, pass, action, extra = {}) {
  const qs = new URLSearchParams({ username: user, password: pass, action, ...extra });
  return `${PANEL_BASE}/player_api.php?${qs}`;
}

async function jget(url, ms = 20000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "SMART-TV", Accept: "application/json,text/plain,*/*" },
      signal: ac.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.log(`jget fail: ${String(e).slice(0, 80)}`);
    return null;
  } finally {
    clearTimeout(t);
  }
}

function addedNum(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 1e9 ? n : 0;
}
function yearFromText(...parts) {
  for (const p of parts) {
    if (!p) continue;
    const m = String(p).match(/\b(20[0-2][0-9])\b/);
    if (m) return Number(m[1]);
  }
  return 0;
}
function ratingOf(r, r5) {
  if (r != null && Number(r) > 0) return Math.round(Number(r) * 10) / 10;
  if (r5 && r5 > 0) return Math.round(r5 * 2 * 10) / 10;
  return null;
}

async function mapPool(items, pool, fn) {
  const results = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(pool, items.length)) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        results[idx] = await fn(items[idx], idx);
      } catch {
        results[idx] = null;
      }
    }
  });
  await Promise.all(workers);
  return results;
}

/* ---------- pool build (same shape as the app's buildPool) ---------- */

async function buildPool(user, pass) {
  const line = await jget(apiQ(user, pass, ""), 15000);
  const ui = line?.user_info ?? line;
  if (!ui?.username) return { ok: false, reason: "line-not-active" };

  const [vodCats, seriesCats] = await Promise.all([
    jget(apiQ(user, pass, "get_vod_categories")).then((d) => (Array.isArray(d) ? d : [])),
    jget(apiQ(user, pass, "get_series_categories")).then((d) => (Array.isArray(d) ? d : [])),
  ]);

  const cats = [];
  for (const c of vodCats) {
    const zone = classify(c.category_name, "vod");
    if (zone) cats.push({ id: String(c.category_id), name: c.category_name, kind: "vod", zone });
  }
  for (const c of seriesCats) {
    const zone = classify(c.category_name, "series");
    if (zone) cats.push({ id: String(c.category_id), name: c.category_name, kind: "series", zone });
  }

  const fetchCats = cats
    .filter((c) => c.kind === "vod")
    .sort((a, b) => ZONE_PRIORITY[a.zone] - ZONE_PRIORITY[b.zone])
    .slice(0, MAX_VOD_CATS);

  const byCat = new Map();
  await mapPool(fetchCats, 6, async (cat) => {
    const d = await jget(apiQ(user, pass, "get_vod_streams", { category_id: cat.id }), 30000);
    const list = Array.isArray(d) ? d : [];
    const items = list.slice(0, MAX_PER_CAT).map((v) => ({
      id: String(v.stream_id),
      kind: "movie",
      name: (v.title || v.name || "").trim(),
      poster: /^https?:\/\//i.test(String(v.stream_icon || v.cover || ""))
        ? `/api/vod/img?u=${encodeURIComponent(String(v.stream_icon || v.cover))}`
        : null,
      year: yearFromText(v.title || v.name, cat.name),
      rating: ratingOf(v.rating, v.rating_5based),
      cat: String(v.category_id),
      catName: cat.name,
      added: addedNum(v.added),
    }));
    byCat.set(cat.id, { items: items.filter((i) => i.name), total: list.length });
  });

  const seriesAll = await jget(apiQ(user, pass, "get_series"), 60000);
  const seriesList = Array.isArray(seriesAll) ? seriesAll : [];
  const seriesCatById = new Map(cats.filter((c) => c.kind === "series").map((c) => [c.id, c]));
  for (const s of seriesList) {
    const cat = seriesCatById.get(String(s.category_id));
    if (!cat) continue;
    const name = (s.name || "").trim();
    if (!name) continue;
    const card = {
      id: String(s.series_id),
      kind: "series",
      name,
      poster: /^https?:\/\//i.test(String(s.cover || ""))
        ? `/api/vod/img?u=${encodeURIComponent(String(s.cover))}`
        : null,
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

  const items = [];
  const totals = {};
  for (const [k, v] of byCat) totals[k] = v.total;
  for (const cat of cats) {
    const bucket = byCat.get(cat.id);
    if (bucket) for (const it of bucket.items) items.push(it);
  }
  return {
    ok: true,
    pool: { builtAt: Math.floor(Date.now() / 1000), cats, items, totals },
    stats: {
      movies: items.filter((i) => i.kind === "movie").length,
      series: items.filter((i) => i.kind === "series").length,
      cats: cats.length,
    },
  };
}

/* ---------- IndexNow daily auto-submission ---------- */

const INDEXNOW_KEY = "4abc5d14a63441c0b4118f37ca7ad0d4";
const SITE_ORIGIN = "https://playbeattv.buzz";
const INDEXNOW_KEYLOC = `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`;
const IN_KV_KEY = "indexnow:v1";

async function postIndexNow(endpoint, urls) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: "playbeattv.buzz",
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEYLOC,
      urlList: urls,
    }),
  });
  return res.status;
}

async function submitIndexNow(urls) {
  // Shared endpoint reaches every participating engine; Bing is the fallback
  // until cross-engine site verification syncs.
  let code = await postIndexNow("https://api.indexnow.org/IndexNow", urls).catch(() => 0);
  let engine = "api.indexnow.org";
  if (code !== 200 && code !== 202) {
    code = await postIndexNow("https://www.bing.com/indexnow", urls).catch(() => 0);
    engine = "bing.com";
  }
  return { code, engine };
}

// Once a day: homepage + hubs + the 120 newest catalog items.
async function indexNowDaily(env) {
  const st = await env.VOD_CACHE.get(IN_KV_KEY, "json").catch(() => null);
  const now = Math.floor(Date.now() / 1000);
  if (st?.lastAt && now - st.lastAt < 20 * 3600)
    return { skipped: true, lastAt: st.lastAt, lastCode: st.code };

  const p = await env.VOD_CACHE.get("pool:v1", "json").catch(() => null);
  if (!p?.items?.length) return { skipped: true, reason: "no-pool" };

  const newest = [...p.items]
    .sort((a, b) => (b.added || 0) - (a.added || 0))
    .slice(0, 120)
    .map((it) => `${SITE_ORIGIN}/${it.kind === "movie" ? "movie" : "series"}/${it.id}`);
  const urls = [
    `${SITE_ORIGIN}/`,
    `${SITE_ORIGIN}/live-tv`,
    `${SITE_ORIGIN}/movies`,
    `${SITE_ORIGIN}/series`,
    ...newest,
  ];
  const out = await submitIndexNow(urls);
  const record = { lastAt: now, submitted: urls.length, ...out };
  await env.VOD_CACHE.put(IN_KV_KEY, JSON.stringify(record), { expirationTtl: 86400 * 3 });
  console.log(`indexnow: ${JSON.stringify(record)}`);
  return record;
}

/* ---------- worker entry ---------- */

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      (async () => {
        const w = await warm(env);
        let idx = null;
        try {
          idx = await indexNowDaily(env);
        } catch (e) {
          idx = { ok: false, error: String(e).slice(0, 100) };
          console.log(`indexnow fail: ${String(e).slice(0, 100)}`);
        }
        console.log(`scheduled done: warm=${w?.ok} indexnow=${JSON.stringify(idx)}`);
      })()
    );
  },

  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/health") {
      const raw = await env.VOD_CACHE.get("pool:v1");
      let info = null;
      if (raw) {
        try {
          const p = JSON.parse(raw);
          info = {
            builtAt: p.builtAt,
            ageMinutes: Math.round((Date.now() / 1000 - p.builtAt) / 60),
            movies: p.items.filter((i) => i.kind === "movie").length,
            series: p.items.filter((i) => i.kind === "series").length,
            bytes: raw.length,
          };
        } catch {}
      }
      const inr = await env.VOD_CACHE.get(IN_KV_KEY, "json").catch(() => null);
      return Response.json({ ok: true, kv: info ? "present" : "empty", pool: info, indexnow: inr });
    }
    if (url.pathname === "/warm") {
      if (url.searchParams.get("key") !== env.WARM_TOKEN)
        return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
      const out = await warm(env);
      let idx = null;
      try {
        idx = await indexNowDaily(env);
      } catch (e) {
        idx = { ok: false, error: String(e).slice(0, 100) };
      }
      return Response.json({ ...out, indexnow: idx }, { status: out.ok ? 200 : 502 });
    }
    return Response.json({ ok: false, error: "not found" }, { status: 404 });
  },
};

async function warm(env) {
  const t0 = Date.now();
  try {
    const out = await buildPool(env.XTREAM_USER, env.XTREAM_PASS);
    if (!out.ok) return { ok: false, error: out.reason };
    await env.VOD_CACHE.put("pool:v1", JSON.stringify(out.pool), { expirationTtl: 7200 });
    console.log(`warm ok: ${JSON.stringify(out.stats)} in ${Date.now() - t0}ms`);
    return { ok: true, ...out.stats, ms: Date.now() - t0 };
  } catch (e) {
    console.log(`warm fail: ${String(e).slice(0, 120)}`);
    return { ok: false, error: String(e).slice(0, 120) };
  }
}
