/* Fullscreen episode player with next-episode support. */

import { notFound } from "next/navigation";
import { getSeriesInfo, type Episode } from "@/lib/vod";
import { VodPlayer } from "@/components/stream/vod-player";

export const revalidate = 300;

export default async function WatchEpisodePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ series?: string; ext?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^\d{1,12}$/.test(id)) notFound();

  const seriesId = Number(sp.series || 0);
  let title = "Episode";
  let poster: string | null = null;
  let nextHref: string | null = null;
  let nextLabel: string | null = null;

  if (Number.isInteger(seriesId) && seriesId > 0) {
    const data = await getSeriesInfo(seriesId);
    if (data?.info?.name) {
      const all: { ep: Episode; season: string }[] = [];
      for (const [season, eps] of Object.entries(data.episodes ?? {})) {
        for (const ep of eps) all.push({ ep, season });
      }
      const idx = all.findIndex((x) => x.ep.id === id);
      if (idx >= 0) {
        const cur = all[idx];
        title = `${data.info.name} — S${cur.season}·E${cur.ep.episode_num}`;
        poster = cur.ep.info?.movie_image
          ? `/api/vod/img?u=${encodeURIComponent(cur.ep.info.movie_image)}`
          : null;
        const nxt = all[idx + 1];
        if (nxt) {
          nextHref = `/watch/ep/${nxt.ep.id}?series=${seriesId}&ext=${
            nxt.ep.container_extension || "mp4"
          }`;
          nextLabel = `Next E${nxt.ep.episode_num}`;
        }
      } else {
        title = data.info.name;
      }
      if (!poster && data.info.cover) {
        poster = `/api/vod/img?u=${encodeURIComponent(data.info.cover)}`;
      }
    }
  }

  return (
    <VodPlayer
      src={`/api/play/ep/${id}?ext=${encodeURIComponent(sp.ext || "mp4")}`}
      title={title}
      backHref={seriesId > 0 ? `/series/${seriesId}` : "/series"}
      poster={poster}
      nextHref={nextHref}
      nextLabel={nextLabel || undefined}
    />
  );
}
