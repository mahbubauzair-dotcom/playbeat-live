/**
 * Translates Chinese data values in src/data/collection.json into English
 * and stores them as an `en` overlay per item (originals kept intact so the
 * Chinese-content exclusion logic in lib/playlist.ts keeps working).
 *
 * Usage: bun /home/z/my-project/scripts/translate_collection_en.mjs
 * Progress is cached in /home/z/my-project/scripts/en_translations.json so
 * re-runs only translate missing/failed items.
 */
import ZAI from "z-ai-web-dev-sdk";
import { readFileSync, writeFileSync, existsSync } from "fs";

const SRC = "/home/z/my-project/src/data/collection.json";
const CACHE = "/home/z/my-project/scripts/en_translations.json";
const BATCH_SIZE = 6;
const CONCURRENCY = 2;
const MAX_RETRIES = 3;

const SYSTEM_PROMPT = `You localize Chinese metadata for a free-streaming resource index into natural English.

Rules:
1. "name": if it contains Chinese characters, translate it into a natural English site/app name. If it is already an English/brand name (e.g. Kodi, IPTV-org, SenPlayer), keep it EXACTLY unchanged.
2. "summary" and "summaryShort": translate into concise, natural English. Keep URLs, emails, version numbers and English tokens (TVBox, IPTV, Kodi, 4K, VPN...) unchanged. The Chinese slang "梯子" means a VPN / censorship-circumvention tool. "网盘" means cloud drive. "追剧" means following/binge-watching shows.
3. "notes": translate into English; keep URLs, dates and numbers unchanged. If the input is an empty string, return an empty string.
4. "tags": translate each tag into a SHORT English tag (Title Case). The output array MUST have the same number of tags, in the same order. Keep English tags and acronyms exactly as-is (e.g. IPTV, TVBox, 4K).
5. Respond with STRICT JSON only: a single JSON array with one object per input item, each with keys: id, name, summary, summaryShort, notes, tags. No markdown fences, no commentary.`;

function loadJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function extractJsonArray(text) {
  const cleaned = text
    .replace(/^[\s\S]*?\[/, (m) => (m.trimStart().startsWith("[") ? m : "["))
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) throw new Error("No JSON array in response");
    return JSON.parse(text.slice(start, end + 1));
  }
}

function validate(orig, out) {
  if (!out || typeof out !== "object" || Array.isArray(out)) return "not an object";
  if (out.id !== orig.id) return "id mismatch";
  for (const k of ["name", "summary", "summaryShort"]) {
    if (typeof out[k] !== "string" || !out[k].trim()) return `bad ${k}`;
  }
  if (typeof out.notes !== "string") return "bad notes";
  if (!Array.isArray(out.tags) || out.tags.length !== orig.tags.length) return "tags length mismatch";
  if (out.tags.some((t) => typeof t !== "string" || !t.trim())) return "bad tag value";
  return null;
}

async function translateBatch(zai, batch) {
  const payload = batch.map((i) => ({
    id: i.id,
    name: i.name,
    summary: i.summary,
    summaryShort: i.summaryShort,
    notes: i.verification?.notes ?? "",
    tags: i.tags,
  }));
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(payload) },
    ],
    thinking: { type: "disabled" },
  });
  const text = completion.choices[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error("empty response");
  return extractJsonArray(text);
}

async function main() {
  const data = loadJson(SRC, null);
  if (!data) throw new Error(`Cannot read ${SRC}`);
  const cache = loadJson(CACHE, {});

  const todo = data.items.filter((i) => !cache[i.id]);
  console.log(`[translate] items: ${data.items.length}, cached: ${data.items.length - todo.length}, to do: ${todo.length}`);
  if (todo.length === 0) {
    console.log("[translate] nothing to do");
  }

  const zai = await ZAI.create();
  const failures = [];

  // Build batches
  const batches = [];
  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    batches.push(todo.slice(i, i + BATCH_SIZE));
  }

  let done = 0;
  async function worker(queue) {
    while (queue.length > 0) {
      const batch = queue.shift();
      if (!batch) break;
      let ok = false;
      for (let attempt = 1; attempt <= MAX_RETRIES && !ok; attempt++) {
        try {
          const results = await translateBatch(zai, batch);
          const byId = new Map(results.map((r) => [r?.id, r]));
          for (const orig of batch) {
            const out = byId.get(orig.id);
            const err = validate(orig, out);
            if (err) throw new Error(`item ${orig.id}: ${err}`);
            cache[orig.id] = {
              name: out.name,
              summary: out.summary,
              summaryShort: out.summaryShort,
              notes: out.notes,
              tags: out.tags,
            };
          }
          ok = true;
        } catch (e) {
          console.warn(`[translate] batch attempt ${attempt} failed: ${e.message}`);
          if (attempt === MAX_RETRIES && batch.length > 1) {
            // fall back: retry items one-by-one
            queue.push(...batch.map((i) => [i]));
          } else if (attempt === MAX_RETRIES) {
            for (const orig of batch) failures.push(orig.id);
          } else {
            await new Promise((r) => setTimeout(r, 1200 * attempt));
          }
        }
      }
      done += batch.length;
      writeFileSync(CACHE, JSON.stringify(cache, null, 1));
      console.log(`[translate] progress ${done}/${todo.length}`);
    }
  }

  if (todo.length > 0) {
    const queue = [...batches];
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker(queue))
    );
  }

  // Merge cache into dataset
  let merged = 0;
  for (const item of data.items) {
    const en = cache[item.id];
    if (en) {
      item.en = en;
      merged++;
    }
  }
  writeFileSync(SRC, JSON.stringify(data, null, 1));
  console.log(`[translate] merged ${merged}/${data.items.length} items into ${SRC}`);
  if (failures.length > 0) {
    console.warn(`[translate] FAILED items (${failures.length}): ${failures.join(", ")}`);
    process.exitCode = 2;
  } else {
    console.log("[translate] all items translated successfully");
  }
}

main().catch((e) => {
  console.error("[translate] fatal:", e);
  process.exit(1);
});
