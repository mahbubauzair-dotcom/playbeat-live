/**
 * Second pass v2: fixes English overlay fields that still contain Chinese.
 * Strategy: per-string translation (no arrays) + a distinct-tag map. Robust validation.
 * Usage: bun /home/z/my-project/scripts/fix_en_cjk.mjs
 */
import ZAI from "z-ai-web-dev-sdk";
import { readFileSync, writeFileSync } from "fs";

const SRC = "/home/z/my-project/src/data/collection.json";
const CACHE = "/home/z/my-project/scripts/en_translations.json";
const CONCURRENCY = 1;
const MAX_RETRIES = 6;

const CJK = /[\u4e00-\u9fff]/;

const NAME_PROMPT = `Translate this streaming site/app name into a natural English name. Keep any Latin part unchanged (e.g. "No影视" -> "NoVideo", "SA视频" -> "SA Video"). Reply with ONLY the translated name, nothing else.`;

const TEXT_PROMPT = `Translate the following Chinese text into concise, natural English. Keep URLs, dates, version numbers and English tokens unchanged. Reply with ONLY the translation, nothing else.`;

const TAG_PROMPT = `Translate each Chinese tag below into a SHORT English tag (Title Case). Keep English/acronym tags unchanged. Respond with STRICT JSON only: a single JSON object mapping each original tag to its English translation (every input key must appear exactly once). No markdown.`;

async function translateString(zai, systemPrompt, text) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: systemPrompt },
          { role: "user", content: text },
        ],
        thinking: { type: "disabled" },
      });
      const out = (completion.choices[0]?.message?.content ?? "").trim();
      if (!out) throw new Error("empty");
      const cleaned = out.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      if (CJK.test(cleaned)) throw new Error("still CJK: " + cleaned.slice(0, 60));
      return cleaned;
    } catch (e) {
      if (attempt === MAX_RETRIES) throw e;
      const is429 = /429/.test(e.message);
      await new Promise((r) => setTimeout(r, (is429 ? 5000 : 800) * attempt));
    }
  }
}

async function translateTagMap(zai, tags) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: TAG_PROMPT },
          { role: "user", content: JSON.stringify(tags) },
        ],
        thinking: { type: "disabled" },
      });
      const raw = (completion.choices[0]?.message?.content ?? "").trim();
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      const obj = JSON.parse(cleaned);
      const map = {};
      let ok = true;
      for (const t of tags) {
        const v = obj[t];
        if (typeof v !== "string" || !v.trim() || CJK.test(v)) { ok = false; break; }
        map[t] = v.trim();
      }
      if (!ok) throw new Error("incomplete tag map");
      return map;
    } catch (e) {
      if (attempt === MAX_RETRIES) throw e;
      const is429 = /429/.test(e.message);
      await new Promise((r) => setTimeout(r, (is429 ? 5000 : 800) * attempt));
    }
  }
}

async function main() {
  const data = JSON.parse(readFileSync(SRC, "utf8"));
  const cache = JSON.parse(readFileSync(CACHE, "utf8"));

  const bad = data.items.filter((i) => i.en && (
    CJK.test(i.en.name) || CJK.test(i.en.summary) || CJK.test(i.en.summaryShort) ||
    CJK.test(i.en.notes) || i.en.tags.some((t) => CJK.test(t))
  ));
  console.log(`[fix-cjk] items needing fixes: ${bad.length}`);
  if (bad.length === 0) return;

  // Collect distinct CJK tags
  const cjkTags = [...new Set(bad.flatMap((i) => i.en.tags.filter((t) => CJK.test(t))))];
  console.log(`[fix-cjk] distinct CJK tags: ${cjkTags.length}`, cjkTags);

  const zai = await ZAI.create();

  let tagMap = {};
  if (cjkTags.length > 0) {
    tagMap = await translateTagMap(zai, cjkTags);
    console.log("[fix-cjk] tag map:", JSON.stringify(tagMap));
  }

  // Build list of string jobs
  const jobs = [];
  for (const item of bad) {
    const en = item.en;
    if (CJK.test(en.name)) jobs.push({ id: item.id, field: "name", text: en.name, prompt: NAME_PROMPT });
    if (CJK.test(en.summary)) jobs.push({ id: item.id, field: "summary", text: en.summary, prompt: TEXT_PROMPT });
    if (CJK.test(en.summaryShort)) jobs.push({ id: item.id, field: "summaryShort", text: en.summaryShort, prompt: TEXT_PROMPT });
    if (CJK.test(en.notes)) jobs.push({ id: item.id, field: "notes", text: en.notes, prompt: TEXT_PROMPT });
  }
  console.log(`[fix-cjk] string jobs: ${jobs.length}`);

  const failures = [];
  let done = 0;
  const queue = [...jobs];

  async function worker() {
    while (queue.length > 0) {
      const job = queue.shift();
      if (!job) break;
      try {
        const out = await translateString(zai, job.prompt, job.text);
        cache[job.id][job.field] = out;
      } catch (e) {
        console.warn(`[fix-cjk] job failed ${job.id}.${job.field}: ${e.message}`);
        failures.push(`${job.id}.${job.field}`);
      }
      done++;
      if (done % 10 === 0) console.log(`[fix-cjk] progress ${done}/${jobs.length}`);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));

  // Apply tag map + string fixes to cache and dataset
  let fixedItems = 0;
  for (const item of bad) {
    const en = cache[item.id];
    if (!en) continue;
    if (en.tags) en.tags = en.tags.map((t) => tagMap[t] ?? t);
    item.en = en;
    fixedItems++;
  }
  writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  writeFileSync(SRC, JSON.stringify(data, null, 1));
  console.log(`[fix-cjk] updated ${fixedItems} items in ${SRC}`);

  // Final check
  const stillBad = data.items.filter((i) => i.en && (
    CJK.test(i.en.name) || CJK.test(i.en.summary) || CJK.test(i.en.summaryShort) ||
    CJK.test(i.en.notes) || i.en.tags.some((t) => CJK.test(t))
  ));
  console.log(`[fix-cjk] items still containing CJK: ${stillBad.length}`, stillBad.map((i) => i.id).join(","));
  if (failures.length > 0) {
    console.warn(`[fix-cjk] FAILED jobs: ${failures.join(", ")}`);
    process.exitCode = 2;
  } else {
    console.log("[fix-cjk] all fixes applied");
  }
}

main().catch((e) => {
  console.error("[fix-cjk] fatal:", e);
  process.exit(1);
});
