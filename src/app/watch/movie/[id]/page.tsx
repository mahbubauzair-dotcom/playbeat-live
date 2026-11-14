import type { Metadata } from "next";
/* Fullscreen movie player. */

import { notFound } from "next/navigation";
import { getVodInfo, vodInfoPoster } from "@/lib/vod";
import { vodCardById } from "@/lib/vod-catalog";
import { VodPlayer } from "@/components/stream/vod-player";

export const revalidate = 300;

/* Fullscreen player page — must stay out of search indexes. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function WatchMoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const streamId = Number(id);
  if (!Number.isInteger(streamId) || streamId <= 0) notFound();

  const [info, card] = await Promise.all([
    getVodInfo(streamId),
    vodCardById("movie", id),
  ]);
  const title = info?.name || card?.name || "Movie";
  const poster = vodInfoPoster(info) || card?.poster || null;
  const extRaw = String(info?.container_extension || "mp4").toLowerCase();
  const ext = /^[a-z0-9]{2,4}$/.test(extRaw) ? extRaw : "mp4";

  return (
    <VodPlayer
      src={`/api/play/vod/${streamId}?ext=${ext}`}
      title={title}
      backHref={`/movie/${streamId}`}
      poster={poster}
    />
  );
}
