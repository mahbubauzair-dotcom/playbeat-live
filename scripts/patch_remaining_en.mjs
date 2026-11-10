/**
 * Final patch: hand-written English fixes for the last few fields that still
 * contained Chinese fragments after the LLM passes.
 * Usage: bun /home/z/my-project/scripts/patch_remaining_en.mjs
 */
import { readFileSync, writeFileSync } from "fs";

const SRC = "/home/z/my-project/src/data/collection.json";
const CACHE = "/home/z/my-project/scripts/en_translations.json";

const FIXES = {
  "tdgo.notes":
    "Updated based on new screenshots: the same URL was originally recorded as 'Huoche Tai Du' (Train Too Crowded), now adjusted to 'Freeloaders Alliance' per the screenshot display name; recommendation index is 5 stars, review notes describe it as popular trending shows, ad-free and fast (requires VPN); screenshot status is not used as the basis for this project's status, which will be updated by the automatic availability detection.",
  "guangsu-yingshi.notes":
    "Upon maintainer review, the website is inaccessible and was removed from the curated online streaming list on 2026-09-12. Resource records and historical verification information are retained.",
  "4kvm-cc-18.notes":
    "Per user supplement, the recommendation index for 4K Movies was adjusted from 4 stars to 3 stars, and the summary updated to 'Has ads (acceptable, requires VPN/VIP restrictions)'; GitHub Actions will continue to monitor availability, ad presence, VIP restrictions, copyright status, and site security.",
  "fdzys.name": "FanDazi Movies",
  "dandanqi.notes":
    "According to maintainer review, the website is no longer accessible. Removed from the curated online streaming list on 2026-09-12. Resource record and historical verification information are retained.",
  "yingshidaquan.notes":
    "According to maintainer review, the website is no longer accessible. Removed from the curated online streaming list on 2026-09-12. Resource record and historical verification information are retained.",
  "aipan-me-25.notes":
    "Maintainer @laoma2053 has confirmed inclusion with ok. Test information: 2026-09-05, China. Submitter's risk disclosure: No ads, no pop-ups, no misleading download prompts; no login required, no payment; resource links aggregated from the public network, this site does not store files, copyright risk is the same as similar cloud-drive search sites. Interest disclosure: The submitter is the site operator themselves.",
};

const CJK = /[\u4e00-\u9fff]/;

const data = JSON.parse(readFileSync(SRC, "utf8"));
const cache = JSON.parse(readFileSync(CACHE, "utf8"));

let applied = 0;
for (const [key, value] of Object.entries(FIXES)) {
  if (CJK.test(value)) throw new Error(`fix itself contains CJK: ${key}`);
  const dot = key.indexOf(".");
  const id = key.slice(0, dot);
  const field = key.slice(dot + 1);
  const item = data.items.find((i) => i.id === id);
  if (!item || !item.en) throw new Error(`item not found: ${id}`);
  item.en[field] = value;
  if (cache[id]) cache[id][field] = value;
  applied++;
  console.log(`[patch] ${key} -> OK`);
}

writeFileSync(SRC, JSON.stringify(data, null, 1));
writeFileSync(CACHE, JSON.stringify(cache, null, 1));
console.log(`[patch] applied ${applied} fixes`);

// Final verification
const bad = data.items.filter(
  (i) =>
    i.en &&
    (CJK.test(i.en.name) ||
      CJK.test(i.en.summary) ||
      CJK.test(i.en.summaryShort) ||
      CJK.test(i.en.notes) ||
      i.en.tags.some((t) => CJK.test(t)))
);
console.log(`[patch] items still containing CJK in en fields: ${bad.length}`);
if (bad.length > 0) process.exitCode = 2;
