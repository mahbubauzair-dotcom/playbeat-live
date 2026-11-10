#!/usr/bin/env node
/* PlayBeat TV — Technical SEO audit v2 (Task 2, Phase 7).
 *
 * Crawls every production URL (indexable pages, redirect aliases, offline
 * fallback, robots.txt, sitemap.xml, Google verification file) and validates:
 *
 *   1.  Unique, non-blank titles + meta descriptions (length warnings)
 *   2.  Exactly one self-referencing canonical per page on the prod host
 *   3.  No accidental noindex on public pages; /offline stays noindex
 *   4.  Redirect aliases answer with real 3xx redirects (never soft 200s)
 *   5.  Sitemap: valid XML, only 200 canonical URLs, correct host, no
 *       duplicates, no query strings, no stream/segment URLs, full coverage
 *   6.  H1 validation: exactly one non-empty H1 per indexable page
 *   7.  Open Graph (title/image/url) + Twitter card consistency
 *   8.  Structured data: JSON-LD present AND parseable (@context/@type)
 *   9.  Mobile crawler accessibility: viewport meta + html lang
 *   10. Server-rendered content depth (warns on thin directories)
 *   11. Internal links: every unique internal href resolves to a 200
 *   12. robots.txt reachable, sitemap declared; Google verification file intact
 *
 * Usage:
 *   BASE_URL=https://stream.playbeattv.buzz AUDIT_SHA=<git-sha> node scripts/seo-audit.mjs
 *
 * Exits 1 on critical problems — CI-safe.
 * Writes a machine-readable report to <repo>/seo-audit-report.json
 * (committed to GitHub and uploaded as a CI artifact by
 * .github/workflows/seo-audit.yml).
 */

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL || "https://stream.playbeattv.buzz";
const REPORT_PATH = new URL("../seo-audit-report.json", import.meta.url);

const STATIC_PAGES = [
  { path: "/", name: "home" },
  { path: "/live-tv", name: "live-tv" },
  { path: "/movies", name: "movies" },
  { path: "/series", name: "series" },
  { path: "/sports", name: "sports" },
  { path: "/news", name: "news" },
  { path: "/countries", name: "countries" },
  { path: "/about", name: "about" },
  { path: "/privacy-policy", name: "privacy-policy" },
  { path: "/terms", name: "terms" },
  { path: "/dmca", name: "dmca" },
  { path: "/content-policy", name: "content-policy" },
];

// Served from the catalog: keep in sync with src/data/stream-catalog.json categories
// (movies/series/sports/news have dedicated pages and are excluded).
const DYNAMIC_CATEGORIES = [
  "animation","auto","business","classic","comedy","cooking","culture","documentary",
  "education","entertainment","family","general","kids","legislative","lifestyle",
  "music","outdoor","public","relax","religious","science","shop","travel","weather",
];

const ALIASES = ["/live", "/privacypol", "/privacypolicy"]; // must redirect, never index
const OFFLINE = "/offline"; // must stay noindex
const VERIFY_FILE = "/google6512a067cc9e5944.html"; // never modify/remove
const EXPECTED_ALIAS = {
  "/live": "/live-tv",
  "/privacypol": "/privacy-policy",
  "/privacypolicy": "/privacy-policy",
};

function deploymentSha() {
  if (process.env.AUDIT_SHA) return process.env.AUDIT_SHA;
  try {
    return execSync("git rev-parse HEAD", { cwd: new URL("..", import.meta.url).pathname })
      .toString().trim();
  } catch {
    return "unknown";
  }
}

async function fetchPage(url, redirectsLeft = 5, chain = []) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "PlaybeatSEOAudit/2.0 (+https://stream.playbeattv.buzz)" },
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    });
    const status = res.status;
    const location = res.headers.get("location");
    if (status >= 300 && status < 400 && location && redirectsLeft > 0) {
      const next = new URL(location, url).toString();
      return fetchPage(next, redirectsLeft - 1, [...chain, { status, location }]);
    }
    const body = await res.text();
    return { url, finalUrl: url, status, location, chain, body };
  } catch (e) {
    return { url, status: 0, body: "", chain, err: String(e) };
  }
}

/* Strip scripts/styles, then tags → visible server-rendered text. */
function visibleText(body) {
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extract(body) {
  const pick = (re) => {
    const m = body.match(re);
    return m ? m[1].trim() : "";
  };
  const metas = [...body.matchAll(/<meta\s+[^>]*>/gi)].map((m) => m[0]);
  const metaContent = (attr, key) => {
    const tag = metas.find((t) => t.includes(`${attr}="${key}"`));
    if (!tag) return "";
    const c = tag.match(/content="([^"]*)"/i);
    return c ? c[1].trim() : "";
  };
  const links = [...body.matchAll(/<link\s+[^>]*>/gi)].map((m) => m[0]);
  const canonicals = links
    .filter((t) => t.includes('rel="canonical"'))
    .map((t) => (t.match(/href="([^"]*)"/i) || [])[1])
    .filter(Boolean)
    .map((h) => new URL(h, BASE).toString());
  const jsonLdBlocks = [...body.matchAll(
    /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi
  )].map((m) => m[1]);
  const jsonLdTypes = [];
  let jsonLdParseErrors = 0;
  for (const raw of jsonLdBlocks) {
    try {
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const n of nodes) {
        if (n && n["@context"] === "https://schema.org" && n["@type"])
          jsonLdTypes.push(String(n["@type"]));
        else jsonLdParseErrors++;
      }
    } catch {
      jsonLdParseErrors++;
    }
  }
  return {
    title: pick(/<title[^>]*>([\s\S]*?)<\/title>/i).replace(/\s+/g, " "),
    description: metaContent("name", "description"),
    canonicals,
    robots: metaContent("name", "robots"),
    ogTitle: metaContent("property", "og:title"),
    ogUrl: metaContent("property", "og:url"),
    ogImage: metaContent("property", "og:image"),
    twitterCard: metaContent("name", "twitter:card"),
    viewport: metaContent("name", "viewport"),
    lang: (body.match(/<html[^>]*\slang="([^"]*)"/i) || [])[1] || "",
    h1s: [...body.matchAll(/<h1[\s>][\s\S]*?<\/h1>/gi)]
      .map((m) => m[0].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
      .filter(Boolean),
    jsonLdBlocks: jsonLdBlocks.length,
    jsonLdTypes,
    jsonLdParseErrors,
    words: visibleText(body).split(" ").filter((w) => w.length > 2).length,
  };
}

/* Crawlable internal links found in the SSR HTML of indexable pages. */
function internalLinks(body) {
  const out = new Set();
  for (const m of body.matchAll(/href="([^"]+)"/g)) {
    let href = m[1];
    if (href.startsWith("/")) {
      // keep path only — drop query/hash (params are canonicalised away)
      href = href.split(/[?#]/)[0];
    } else if (href.startsWith(BASE)) {
      href = new URL(href).pathname;
    } else continue;
    if (!href || href === "//") continue;
    if (/\.(css|js|mjs|json|png|jpe?g|webp|avif|svg|ico|txt|xml|webmanifest|woff2?|mp4|ts|m3u8)$/i.test(href)) continue;
    if (href.startsWith("/api/")) continue;
    out.add(href);
  }
  return [...out];
}

async function main() {
  const targets = [
    ...STATIC_PAGES.map((p) => p.path),
    ...DYNAMIC_CATEGORIES.map((c) => `/category/${c}`),
    ...ALIASES,
    OFFLINE,
  ];

  const results = new Map();
  for (const path of targets) {
    const r = await fetchPage(BASE + path);
    results.set(path, r);
  }

  // sitemap + robots + verification file
  const sm = await fetchPage(BASE + "/sitemap.xml");
  const robots = await fetchPage(BASE + "/robots.txt");
  const verify = await fetchPage(BASE + VERIFY_FILE);
  const sitemapUrls = [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => m[1].trim()
  );

  const rows = [];
  const problems = [];
  const warnings = [];
  const redirectsLog = [];

  // stats for the report summary
  let canonicalErrors = 0;
  let httpErrors = 0;

  for (const path of targets) {
    const r = results.get(path);
    const isAlias = ALIASES.includes(path);
    const isOffline = path === OFFLINE;
    if (r.err || r.status === 0) {
      httpErrors++;
      problems.push(`${path}: FETCH FAILED (${r.err || r.status})`);
      continue;
    }
    if (isAlias) {
      const firstHop = r.chain?.[0];
      if (firstHop && firstHop.status >= 300 && firstHop.status < 400) {
        const dest = new URL(firstHop.location, BASE + path).toString().replace(/\/$/, "");
        const expected = EXPECTED_ALIAS[path];
        redirectsLog.push({ path, status: firstHop.status, location: dest });
        if (!dest.endsWith(expected))
          problems.push(`${path}: alias redirects to unexpected ${dest}`);
        else if (firstHop.status !== 308 && firstHop.status !== 301)
          warnings.push(`${path}: alias uses temporary ${firstHop.status} (prefer 301/308)`);
        continue; // real HTTP redirect — never indexable, good
      }
      // no HTTP redirect: content served directly
      const x = extract(r.body);
      if (r.status === 200 && !/noindex/i.test(x.robots)) {
        problems.push(
          `${path}: alias served 200 without noindex — should be a redirect (final ${r.status})`
        );
      } else {
        warnings.push(`${path}: alias served content (status ${r.status})`);
      }
      continue;
    }
    if (isOffline) {
      const x = extract(r.body);
      if (!/noindex/i.test(x.robots))
        problems.push(`${path}: offline page missing noindex`);
      continue;
    }

    const x = extract(r.body);
    const url = BASE + path;
    const row = { url, ...x };
    rows.push(row);

    // ---- titles / descriptions ----
    if (!x.title) problems.push(`${path}: blank title`);
    else if (x.title.length < 15 || x.title.length > 65)
      warnings.push(`${path}: title length ${x.title.length} (${x.title.slice(0, 40)}…)`);
    if (!x.description) problems.push(`${path}: blank meta description`);
    else if (x.description.length < 70 || x.description.length > 170)
      warnings.push(`${path}: description length ${x.description.length}`);

    // ---- canonical ----
    if (!x.canonicals.length) {
      problems.push(`${path}: missing canonical`); canonicalErrors++;
    } else if (x.canonicals.length > 1) {
      problems.push(`${path}: ${x.canonicals.length} canonical tags (conflict)`); canonicalErrors++;
    } else {
      const selfPath = new URL(url).pathname.replace(/\/$/, "") || "/";
      const canPath = new URL(x.canonicals[0], BASE).pathname.replace(/\/$/, "") || "/";
      if (canPath !== selfPath) {
        problems.push(`${path}: canonical points elsewhere (${x.canonicals[0]})`); canonicalErrors++;
      }
      const canHost = new URL(x.canonicals[0], BASE).host;
      const baseHost = new URL(BASE).host;
      if (canHost !== baseHost) {
        const msg = `canonical host ${canHost} != audited host ${baseHost}`;
        if (baseHost.includes("playbeattv.buzz")) {
          problems.push(`${path}: ${msg}`); canonicalErrors++;
        } else warnings.push(`${path}: ${msg} (expected off-prod)`);
      }
      if (new URL(x.canonicals[0], BASE).search)
        warnings.push(`${path}: canonical carries query string (${x.canonicals[0]})`);
    }

    // ---- robots directives ----
    if (/noindex/i.test(x.robots)) problems.push(`${path}: noindex on public page`);

    // ---- Open Graph / Twitter ----
    if (!x.ogTitle) warnings.push(`${path}: missing og:title`);
    if (!x.ogImage) warnings.push(`${path}: missing og:image`);
    if (!x.twitterCard) warnings.push(`${path}: missing twitter:card`);
    if (x.ogUrl && x.canonicals.length === 1) {
      const ogPath = new URL(x.ogUrl, BASE).pathname.replace(/\/$/, "") || "/";
      const canPath = new URL(x.canonicals[0], BASE).pathname.replace(/\/$/, "") || "/";
      if (ogPath !== canPath) warnings.push(`${path}: og:url ${ogPath} != canonical ${canPath}`);
    }

    // ---- H1 ----
    if (x.h1s.length === 0) problems.push(`${path}: no H1`);
    else if (x.h1s.length > 1) problems.push(`${path}: ${x.h1s.length} H1s`);

    // ---- structured data ----
    if (x.jsonLdBlocks === 0) warnings.push(`${path}: no JSON-LD`);
    if (x.jsonLdParseErrors > 0)
      problems.push(`${path}: ${x.jsonLdParseErrors} unparseable/invalid JSON-LD block(s)`);

    // ---- mobile crawler accessibility ----
    if (!x.viewport) problems.push(`${path}: missing viewport meta`);
    if (!x.lang) warnings.push(`${path}: missing html lang`);

    // ---- server-rendered content depth ----
    if (x.words < 200)
      warnings.push(`${path}: thin server-rendered content (${x.words} visible words)`);
  }

  // ---- duplicate detection across indexable rows ----
  const dupBy = (key) => {
    const seen = new Map();
    for (const r of rows) {
      const v = (r[key] || "").toLowerCase();
      if (!v) continue;
      seen.set(v, [...(seen.get(v) || []), r.url]);
    }
    return [...seen.entries()].filter(([, urls]) => urls.length > 1);
  };
  const dupTitles = dupBy("title");
  const dupDescs = dupBy("description");
  for (const [title, urls] of dupTitles)
    problems.push(`DUPLICATE TITLE "${title}": ${urls.join(", ")}`);
  for (const [desc, urls] of dupDescs)
    problems.push(`DUPLICATE DESCRIPTION "${desc.slice(0, 60)}…": ${urls.join(", ")}`);

  // ---- sitemap validation ----
  const sitemapIssues = { not200: 0, duplicates: 0, wrongHost: 0, queryParams: 0, streamUrls: 0 };
  const sitemapSet = new Map(); // path -> count
  for (const smUrl of sitemapUrls) {
    let u;
    try { u = new URL(smUrl); } catch { problems.push(`sitemap: malformed URL "${smUrl}"`); continue; }
    if (u.host !== new URL(BASE).host) {
      const msg = `sitemap: off-host URL ${smUrl}`;
      if (new URL(BASE).host.includes("playbeattv.buzz")) {
        sitemapIssues.wrongHost++; problems.push(msg);
      } else warnings.push(`${msg} (expected off-prod)`);
    }
    if (u.search) { sitemapIssues.queryParams++; problems.push(`sitemap: query-string URL ${smUrl}`); }
    if (/\.(m3u8|ts|mp4)$/i.test(u.pathname) || u.pathname.includes("/hls/")) {
      sitemapIssues.streamUrls++; problems.push(`sitemap: stream/segment URL ${smUrl}`);
    }
    const p = u.pathname.replace(/\/$/, "") || "/";
    sitemapSet.set(p, (sitemapSet.get(p) || 0) + 1);
  }
  for (const [p, n] of sitemapSet) if (n > 1) { sitemapIssues.duplicates += n - 1; problems.push(`sitemap: ${n} duplicates for ${p}`); }
  for (const smUrl of sitemapUrls) {
    const path = new URL(smUrl).pathname;
    if (!results.has(path)) { warnings.push(`sitemap URL not audited: ${smUrl}`); continue; }
    const r = results.get(path);
    if (r.status !== 200) { sitemapIssues.not200++; problems.push(`sitemap URL not 200: ${smUrl} (${r.status})`); }
  }
  const missingFromSitemap = [];
  for (const row of rows) {
    const p = new URL(row.url).pathname.replace(/\/$/, "") || "/";
    if (!sitemapSet.has(p)) { missingFromSitemap.push(p); problems.push(`indexable page missing from sitemap: ${row.url}`); }
  }
  if (sm.status !== 200) problems.push(`sitemap.xml fetch failed (${sm.status})`);

  // ---- robots.txt + verification file ----
  const robotsOk = robots.status === 200 && /sitemap:/i.test(robots.body);
  if (!robotsOk) problems.push(`robots.txt bad (status ${robots.status}, sitemap declared: ${/sitemap:/i.test(robots.body)})`);
  if (verify.status !== 200) problems.push(`Google verification file missing (${VERIFY_FILE} → ${verify.status})`);

  // ---- internal link validation (unique links across indexable pages) ----
  const linkTargets = new Set();
  for (const path of targets) {
    if (ALIASES.includes(path) || path === OFFLINE) continue;
    const r = results.get(path);
    if (!r || r.status !== 200) continue;
    for (const l of internalLinks(r.body)) linkTargets.add(l);
  }
  const brokenLinks = [];
  for (const link of [...linkTargets].sort()) {
    const r = await fetchPage(BASE + link);
    const final = r.status;
    if (final >= 400 || final === 0) brokenLinks.push({ url: BASE + link, status: final });
  }
  for (const b of brokenLinks) problems.push(`broken internal link: ${b.url} (status ${b.status})`);

  // ---- report ----
  const pad = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s.padEnd(n));
  console.log("\n=== SEO AUDIT TABLE ===");
  console.log(
    ["URL", "TITLE", "DESC", "CANONICAL", "ROBOTS", "H1", "LD", "OG", "TW", "WORDS"]
      .map((h, i) => pad(h, [42, 48, 5, 42, 8, 3, 3, 3, 3, 6][i]))
      .join(" ")
  );
  for (const r of rows) {
    console.log(
      [
        pad(r.url.replace(BASE, "") || "/", 42),
        pad(r.title, 48),
        pad(String(r.description.length), 5),
        pad(r.canonicals[0] ? r.canonicals[0].replace(BASE, "") || "/" : "MISSING", 42),
        pad(r.robots || "index", 8),
        pad(String(r.h1s.length), 3),
        pad(String(r.jsonLdBlocks), 3),
        pad(r.ogTitle ? "Y" : "N", 3),
        pad(r.twitterCard ? "Y" : "N", 3),
        pad(String(r.words), 6),
      ].join(" ")
    );
  }

  console.log(`\n=== SITEMAP: ${sitemapUrls.length} URLs (status ${sm.status}) ===`);
  console.log(`=== ROBOTS.TXT: status ${robots.status}, sitemap declared: ${/sitemap:/i.test(robots.body)} ===`);
  console.log(`=== VERIFY FILE ${VERIFY_FILE}: ${verify.status} ===`);
  console.log(`=== INTERNAL LINKS: ${linkTargets.size} unique checked, ${brokenLinks.length} broken ===`);
  console.log(`\n=== WARNINGS (${warnings.length}) ===`);
  for (const w of warnings) console.log("  ~", w);
  console.log(`\n=== PROBLEMS (${problems.length}) ===`);
  for (const p of problems) console.log("  ✗", p);

  const result = problems.length ? "FAIL" : "PASS";
  console.log(`\nRESULT: ${result}${problems.length ? "" : " — no critical SEO problems"}`);

  // machine-readable report (committed + uploaded as CI artifact)
  const report = {
    audit: {
      generatedAt: new Date().toISOString(),
      base: BASE,
      deploymentSha: deploymentSha(),
      tool: "scripts/seo-audit.mjs v2",
    },
    summary: {
      result,
      urlsExamined: targets.length,
      indexableUrls: rows.length,
      httpErrors,
      problems: problems.length,
      warnings: warnings.length,
      duplicateTitles: dupTitles.length,
      duplicateDescriptions: dupDescs.length,
      canonicalErrors,
      brokenInternalLinks: brokenLinks.length,
    },
    checks: {
      titles: { validated: rows.length, duplicates: dupTitles.length },
      descriptions: { validated: rows.length, duplicates: dupDescs.length },
      canonicals: { errors: canonicalErrors },
      robots: {
        robotsTxtStatus: robots.status,
        sitemapDeclared: /sitemap:/i.test(robots.body),
        verificationFile: { path: VERIFY_FILE, status: verify.status },
      },
      sitemap: {
        status: sm.status,
        urls: sitemapUrls.length,
        issues: sitemapIssues,
        indexableMissingFromSitemap: missingFromSitemap,
      },
      redirects: redirectsLog,
      h1: {
        pagesWithoutH1: rows.filter((r) => r.h1s.length === 0).length,
        pagesWithMultipleH1s: rows.filter((r) => r.h1s.length > 1).length,
      },
      openGraph: {
        missingOgTitle: rows.filter((r) => !r.ogTitle).length,
        missingOgImage: rows.filter((r) => !r.ogImage).length,
      },
      structuredData: {
        pagesWithJsonLd: rows.filter((r) => r.jsonLdBlocks > 0).length,
        parseErrors: rows.reduce((n, r) => n + r.jsonLdParseErrors, 0),
        typesSeen: [...new Set(rows.flatMap((r) => r.jsonLdTypes))],
      },
      mobile: {
        missingViewport: rows.filter((r) => !r.viewport).length,
        missingLang: rows.filter((r) => !r.lang).length,
      },
      content: {
        thinPages: rows
          .filter((r) => r.words < 200)
          .map((r) => ({ url: r.url.replace(BASE, "") || "/", words: r.words })),
      },
      internalLinks: { uniqueChecked: linkTargets.size, broken: brokenLinks },
    },
    rows: rows.map((r) => ({ ...r, url: r.url })),
    warnings,
    problems,
    sitemapUrls,
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`report saved -> ${REPORT_PATH.pathname}`);

  if (problems.length) process.exit(1);
}

main();
