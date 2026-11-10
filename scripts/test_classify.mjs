// Test vod-catalog classify() against the panel's real category names.
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

const B = "http://stream.playbeat.live:80/player_api.php?username=8fc12ea6&password=1bf83aa4";

(async () => {
  const cats = await (await fetch(`${B}&action=get_series_categories`)).json();
  const kept = [];
  const dropped = [];
  for (const c of cats) {
    const z = classify(c.category_name, "series");
    if (z) kept.push([c.category_id, c.category_name, z]);
    else dropped.push(c.category_name);
  }
  console.log(`series cats: ${cats.length} total, ${kept.length} kept, ${dropped.length} hidden`);
  console.log("\nKEPT (first 12):");
  kept.slice(0, 12).forEach((k) => console.log("  ", k[0], "|", k[1], "->", k[2]));
  console.log("\nHIDDEN (first 12):");
  dropped.slice(0, 12).forEach((d) => console.log("  ", d));
})();
