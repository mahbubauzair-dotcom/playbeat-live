#!/usr/bin/env node
/**
 * TASK 2 — Phase 1: Production SEO audit of the DEPLOYED site.
 * Fetches every key URL, extracts SSR SEO signals, prints a structured report.
 * No fixes applied here — audit only.
 */
const BASE = "https://stream.playbeattv.buzz";

const PATHS = [
  { p: "/", label: "Homepage" },
  { p: "/live-tv", label: "Live TV" },
  { p: "/movies", label: "Movies" },
  { p: "/series", label: "Series" },
  { p: "/sports", label: "Sports" },
  { p: "/news", label: "News" },
  { p: "/countries", label: "Countries" },
  { p: "/category/kids", label: "Category: Kids" },
  { p: "/category/music", label: "Category: Music" },
  { p: "/category/documentary", label: "Category: Documentary" },
  { p: "/category/entertainment", label: "Category: Entertainment" },
  { p: "/about", label: "About" },
  { p: "/privacy-policy", label: "Privacy Policy" },
  { p: "/terms", label: "Terms" },
  { p: "/dmca", label: "DMCA" },
  { p: "/content-policy", label: "Content Policy" },
  { p: "/google6512a067cc9e5944.html", label: "Google verification file" },
  { p: "/sitemap.xml", label: "Sitemap" },
  { p: "/robots.txt", label: "robots.txt" },
  { p: "/manifest.webmanifest", label: "PWA manifest" },
];

function extract(tag, html) {
  const m = html.match(tag);
  return m ? m[1].trim() : null;
}

function decodeEntities(s) {
  if (!s) return s;
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

const results = [];

for (const { p, label } of PATHS) {
  const url = BASE + p;
  let status = 0, finalUrl = "", html = "", err = null;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SEO-Audit/1.0)" },
      signal: AbortSignal.timeout(25000),
    });
    status = res.status;
    finalUrl = res.url;
    if (p.endsWith(".html") || p.endsWith(".txt") || p.endsWith(".xml") || p.endsWith(".webmanifest") || p === "/" || p.startsWith("/live") || !p.includes(".")) {
      html = await res.text();
    }
  } catch (e) {
    err = e.message;
  }
  const ms = Date.now() - t0;

  const rec = { path: p, label, status, finalUrl, ms, err };

  if (html && (status === 200)) {
    rec.title = decodeEntities(extract(/<title[^>]*>([\s\S]*?)<\/title>/i, html));
    rec.metaDesc = decodeEntities(extract(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i, html)) ||
                   decodeEntities(extract(/<meta\s+content=["']([\s\S]*?)["']\s+name=["']description["']/i, html));
    rec.canonical = extract(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i, html) ||
                    extract(/<link\s+href=["']([^"']+)["']\s+rel=["']canonical["']/i, html);
    rec.robots = extract(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i, html);
    rec.ogTitle = decodeEntities(extract(/<meta\s+property=["']og:title["']\s+content=["']([\s\S]*?)["']/i, html));
    rec.ogImage = extract(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i, html);
    // H1s in SSR HTML
    const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m =>
      m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    ).filter(Boolean);
    rec.h1s = h1s;
    // structured data types
    const ldTypes = [...html.matchAll(/"@type"\s*:\s*"([^"]+)"/g)].map(m => m[1]);
    rec.ldTypes = [...new Set(ldTypes)];
    // visible SSR text volume (rough): strip scripts/styles/tags
    const bodyText = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    rec.ssrTextChars = bodyText.length;
    rec.ssrSample = bodyText.slice(0, 300);
    // internal links to key pages present in SSR HTML?
    rec.links = {};
    for (const key of ["/live-tv", "/movies", "/series", "/sports", "/news", "/countries", "/kids", "/music", "/documentary"]) {
      const re = new RegExp(`href=["']${key}["']`, "i");
      rec.links[key] = re.test(html);
    }
    rec.htmlBytes = html.length;
  }
  results.push(rec);
}

// ---- Report ----
console.log(`\n=== PHASE 1 PRODUCTION AUDIT — ${new Date().toISOString()} ===\n`);
for (const r of results) {
  const line = `[${r.status || "ERR"}] ${r.path}  (${r.ms}ms)${r.err ? " ERR:" + r.err : ""}`;
  console.log(line);
  if (r.status && r.status !== 200) {
    console.log(`   redirect-> ${r.finalUrl}`);
    continue;
  }
  if (r.title !== undefined) {
    console.log(`   title(${r.title ? r.title.length : 0}): ${r.title ? r.title.slice(0, 110) : "MISSING"}`);
    console.log(`   desc(${r.metaDesc ? r.metaDesc.length : 0}): ${r.metaDesc ? r.metaDesc.slice(0, 110) : "MISSING"}`);
    console.log(`   canonical: ${r.canonical || "MISSING"}`);
    console.log(`   robots: ${r.robots || "(none — indexable by default)"}`);
    console.log(`   H1 count: ${r.h1s ? r.h1s.length : "?"}${r.h1s && r.h1s.length ? " -> " + r.h1s.map(h => `"${h.slice(0, 60)}"`).join(" | ") : ""}`);
    console.log(`   ld+json types: ${r.ldTypes && r.ldTypes.length ? r.ldTypes.join(",") : "NONE"}`);
    console.log(`   SSR text chars: ${r.ssrTextChars ?? "-"}`);
    console.log(`   og:title: ${r.ogTitle ? r.ogTitle.slice(0, 70) : "MISSING"} | og:image: ${r.ogImage ? "yes" : "MISSING"}`);
    if (r.links) {
      const missing = Object.entries(r.links).filter(([, v]) => !v).map(([k]) => k);
      console.log(`   key internal links: ${missing.length === 0 ? "ALL PRESENT" : "MISSING -> " + missing.join(", ")}`);
    }
  }
}

// duplicate metadata detection
console.log(`\n=== DUPLICATE METADATA CHECK ===`);
const byTitle = {}, byDesc = {};
for (const r of results) {
  if (r.title) (byTitle[r.title] ||= []).push(r.path);
  if (r.metaDesc) (byDesc[r.metaDesc] ||= []).push(r.path);
}
const dupT = Object.entries(byTitle).filter(([, v]) => v.length > 1);
const dupD = Object.entries(byDesc).filter(([, v]) => v.length > 1);
console.log(`Duplicate titles: ${dupT.length === 0 ? "NONE" : JSON.stringify(dupT)}`);
console.log(`Duplicate descriptions: ${dupD.length === 0 ? "NONE" : JSON.stringify(dupD)}`);

// canonical correctness
console.log(`\n=== CANONICAL CHECK ===`);
for (const r of results) {
  if (r.canonical !== undefined) {
    const expected = BASE + (r.path === "/" ? "/" : r.path);
    const ok = r.canonical === expected;
    console.log(`${ok ? "OK " : "!! "} ${r.path}: ${r.canonical || "MISSING"}${ok ? "" : "  (expected " + expected + ")"}`);
  }
}
