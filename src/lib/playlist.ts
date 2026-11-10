import { items, type ResourceItem } from "@/lib/collection";

/** Tags that mark Chinese drama / series content focus — excluded per user preference. */
export const CN_CONTENT_TAGS = [
  "国内剧",
  "国剧",
  "中文",
  "华语",
  "大陆",
  "热播剧",
  "电视剧",
  "港剧",
  "国产",
];

/** English display names for the excluded Chinese-content tags (UI only). */
export const CN_CONTENT_TAGS_EN = [
  "CN dramas",
  "Chinese series",
  "Mandarin content",
  "Mainland China",
  "TV series",
  "HK dramas",
];

/** Categories eligible for the safe playlist (streaming-relevant; subtitles etc. excluded). */
export const PLAYLIST_CATEGORIES = [
  "subscription",
  "online_video",
  "video_app",
  "player",
  "open_source",
  "cloud_search",
];

export type PlaylistGroupKey = "live" | "anime" | "player" | "app" | "tool";

export const PLAYLIST_GROUPS: { key: PlaylistGroupKey; label: string; desc: string }[] = [
  {
    key: "live",
    label: "Live TV sources",
    desc: "Public, legal global IPTV channel lists with directly playable links",
  },
  {
    key: "anime",
    label: "Anime / Bangumi",
    desc: "Open-source anime apps focused on Japanese animation",
  },
  {
    key: "app",
    label: "Media apps (bring your own sources)",
    desc: "Aggregator shells store no content themselves — playback depends on user-configured sources",
  },
  {
    key: "player",
    label: "Players / TVBox shells",
    desc: "Open-source players and empty TVBox shells with no built-in content",
  },
  {
    key: "tool",
    label: "Utility tools",
    desc: "Open-source helpers for cloud-drive search / transfer",
  },
];

function hasTag(item: ResourceItem, needles: string[]): boolean {
  return item.tags.some((t) => needles.some((n) => t.toLowerCase().includes(n.toLowerCase())));
}

function isChineseContent(item: ResourceItem): boolean {
  if (item.tags.some((t) => CN_CONTENT_TAGS.includes(t))) return true;
  // Summary explicitly focused on Chinese dramas
  const text = `${item.summary} ${item.summaryShort}`;
  return /国产|国内剧|华语剧|中剧/.test(text);
}

/**
 * Safe playlist criteria (transparent, based on the repo's own declared metadata):
 * 1. Exclude anything the repo itself flags as high copyright risk (all online streaming sites)
 * 2. Exclude subtitle/cloud-drive sites scoped to Chinese content
 * 3. Exclude Chinese drama / series content focus
 * 4. Keep only streaming-relevant categories
 */
export function buildSafePlaylist(includeTools: boolean) {
  const pool = items.filter(
    (i) =>
      i.risks.copyright !== "high" &&
      PLAYLIST_CATEGORIES.includes(i.category) &&
      !isChineseContent(i)
  );

  const declared = pool.filter((i) => i.risks.copyright === "low" || i.risks.copyright === "medium");
  const tools = pool.filter((i) => i.risks.copyright === "unknown");
  const list = includeTools ? [...declared, ...tools] : declared;

  function groupOf(item: ResourceItem): PlaylistGroupKey {
    if (item.category === "subscription" || hasTag(item, ["IPTV", "直播源"])) return "live";
    if (hasTag(item, ["追番", "番剧", "ACG", "动漫", "Bangumi"])) return "anime";
    if (
      item.category === "player" ||
      hasTag(item, ["TVBox", "影视仓", "FongMi", "CatVod", "播放器", "空壳"])
    ) {
      return "player";
    }
    if (item.category === "video_app" || hasTag(item, ["影视聚合", "客户端", "影音应用"])) return "app";
    return "tool";
  }

  const rank = (i: ResourceItem) =>
    (i.risks.copyright === "low" || i.risks.copyright === "medium" ? 0 : 1) * 10 +
    (i.availability?.status === "reachable" ? 0 : i.availability?.status === "restricted" ? 1 : 2);

  const groups = PLAYLIST_GROUPS.map((g) => ({
    ...g,
    items: list
      .filter((i) => groupOf(i) === g.key)
      .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "en")),
  })).filter((g) => g.items.length > 0);

  return {
    total: list.length,
    declaredCount: declared.length,
    toolsCount: tools.length,
    groups,
  };
}
