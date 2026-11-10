// Replicate buildPool's series branch: 53 kept cats, get_series per cat, concurrency 6.
const PAK_RE = /\bpk\b|pak\b|paki|urdu|hum\s?tv|\bary\b|in-pk|green\s?ent/i;
const PLATFORM_RE = /netflix|prime|hotstar|sony\s?liv|sonyliv|zee5|ullu|hoichoi|alt\s?balaji|altbalaji|mx\s?player|jio|voot|disney|\bhbo\b|hulu|apple\s?tv|web\s?series|originals|amazon/i;
const IN_RE = /\bin\b|india|indian|hindi|bollywood|punjabi|desi|daily\s?soap|zee\b|\bsab\b|colors\b|star\s?plus/i;
const HIDDEN_RE = /\bkids?\b|cartoon|anim[eé]|wwe|ufc|wrestling|documentar|docu\b|fight|boxing|sports?\b|3d|vr\b|xxx|adult|porn|18\+|french|german|spanish|italian|dutch|turkish|arab|arabic|persian|chinese|japan|korean|thai|viet|indo(nes)?|malay|russian|portug|brazil|latin|somali|swahili|bangla|nepali|marathi|bhojpuri|gujarati|kannada|malayalam|tamil\s?\+|telugu\s?\+|\btr\b|\bnl\b|\bfr\b|\bde\b|\bes\b|\bpt\b|\bpl\b|\bit\b|multi[-\s]?lang|infantile/i;
const keep = (n) => !HIDDEN_RE.test(n);
const B = "http://stream.playbeat.live:80/player_api.php?username=8fc12ea6&password=1bf83aa4";
const UA = "SMART-TV"; // not critical for API

async function api(action, extra = {}) {
  const qs = new URLSearchParams({ username: "8fc12ea6", password: "1bf83aa4", action, ...extra });
  const t0 = Date.now();
  try {
    const res = await fetch(`${B}&${qs}`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    const ms = Date.now() - t0;
    if (!res.ok) return { kind: "http-error", status: res.status, ms };
    const d = await res.json();
    return { kind: Array.isArray(d) ? "array" : typeof d, len: Array.isArray(d) ? d.length : "-", ms };
  } catch (e) {
    return { kind: "throw", err: String(e).slice(0, 60), ms: Date.now() - t0 };
  }
}

(async () => {
  const cats = (await (await fetch(`${B}&action=get_series_categories`)).json()).filter((c) => keep(c.category_name));
  console.log(`testing ${cats.length} kept series cats, concurrency 6...`);
  let ok = 0, empty = 0, fail = 0, totalItems = 0;
  const queue = [...cats];
  async function worker() {
    while (queue.length) {
      const c = queue.shift();
      const r = await api("get_series", { category_id: c.category_id });
      if (r.kind === "array") {
        if (r.len > 0) { ok++; totalItems += r.len; } else empty++;
      } else { fail++; if (fail <= 3) console.log("  FAIL", c.category_name, JSON.stringify(r)); }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log(`RESULT: ok=${ok} (total items ${totalItems}), empty=${empty}, failed=${fail}`);
})();
