/* Series detail — NEXA hero + season tabs. Server-rendered. */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Star, Tv } from "lucide-react";
import { getSeriesInfo, type Episode } from "@/lib/vod";
import { vodCardById } from "@/lib/vod-catalog";
import { SeasonTabs } from "@/components/stream/season-tabs";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getSeriesInfo(Number(id));
  const card = await vodCardById("series", id);
  const name = data?.info?.name || card?.name || "Series";
  return {
    robots: { index: false, follow: false },
    title: `${name} — Watch Free | PlayBeat TV`,
    description:
      (data?.info?.plot || `Watch ${name} free on PlayBeat TV.`).slice(0, 200),
  };
}

function proxiedInfoImage(u?: string | null): string | null {
  if (!u) return null;
  const s = String(u).trim();
  if (!s || s === "null" || !/^https?:\/\//i.test(s)) return null;
  return `/api/vod/img?u=${encodeURIComponent(s)}`;
}

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const seriesId = Number(id);
  if (!Number.isInteger(seriesId) || seriesId <= 0) notFound();

  const [data, card] = await Promise.all([
    getSeriesInfo(seriesId),
    vodCardById("series", id),
  ]);
  if (!data && !card) notFound();

  const info = data?.info;
  const name = info?.name || card?.name || "Series";
  const backdrop = proxiedInfoImage(
    Array.isArray(info?.backdrop) ? info?.backdrop?.[0] : null
  );
  const poster = proxiedInfoImage(info?.cover) || card?.poster || null;
  const year =
    card?.year ||
    Number((info?.releaseDate || info?.releasedate || "").slice(0, 4)) ||
    0;
  const rating =
    info?.rating != null && Number(info.rating) > 0
      ? Math.round(Number(info.rating) * 10) / 10
      : card?.rating;
  const genres = (info?.genre || card?.catName || "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);

  // seasons in numeric order
  const rawSeasons = Object.entries(data?.episodes ?? {});
  const seasons: { label: string; episodes: Episode[] }[] = rawSeasons
    .map(([label, episodes]) => ({
      label,
      episodes: [...episodes].sort(
        (a, b) => Number(a.episode_num) - Number(b.episode_num)
      ),
    }))
    .sort((a, b) => Number(a.label) - Number(b.label));

  const totalEpisodes = seasons.reduce((n, s) => n + s.episodes.length, 0);

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-white">
      <div className="relative">
        <div className="absolute inset-0 overflow-hidden">
          {backdrop && (
            <img
              src={backdrop}
              alt=""
              className="h-full w-full object-cover opacity-40"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/60 to-[#0c0c0e]/20" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-4 pb-12 pt-5 sm:px-6">
          <Link
            href="/series"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-xs font-semibold text-zinc-200 backdrop-blur transition-colors hover:border-theme/50 hover:text-theme"
          >
            <ArrowLeft className="size-3.5" /> All series
          </Link>

          <div className="mt-8 flex flex-col gap-7 sm:flex-row sm:items-end">
            <div className="w-40 shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/60 sm:w-52">
              <div className="aspect-[2/3] bg-[#141416]">
                {poster ? (
                  <img src={poster} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-zinc-600">
                    <Tv className="size-10" />
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                {name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-zinc-400">
                {rating != null && (
                  <span className="flex items-center gap-1.5 font-bold text-white">
                    <Star className="size-4 fill-theme text-theme" />
                    {rating.toFixed(1)}
                  </span>
                )}
                {year > 0 && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" /> {year}
                  </span>
                )}
                {seasons.length > 0 && (
                  <span>
                    {seasons.length} season{seasons.length > 1 ? "s" : ""} ·{" "}
                    {totalEpisodes} episodes
                  </span>
                )}
              </div>

              {genres.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {genres.slice(0, 5).map((g) => (
                    <span
                      key={g}
                      className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-zinc-300"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {info?.plot && (
            <p className="mt-8 max-w-3xl text-[15px] leading-relaxed text-zinc-300">
              {info.plot}
            </p>
          )}

          {seasons.length > 0 ? (
            <div className="mt-10">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500">
                Episodes
              </h2>
              <SeasonTabs seasons={seasons} seriesId={id} />
            </div>
          ) : (
            <p className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center text-sm text-zinc-400">
              Episode list is still syncing from the panel — check back shortly.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
