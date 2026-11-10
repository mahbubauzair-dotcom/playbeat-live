/* Movie detail — NEXA-style immersive hero. Server-rendered. */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, Film, Play, Star } from "lucide-react";
import {
  getVodInfo,
  vodInfoBackdrop,
  vodInfoPoster,
} from "@/lib/vod";
import { vodCardById } from "@/lib/vod-catalog";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const info = await getVodInfo(Number(id));
  const card = await vodCardById("movie", id);
  const name = info?.name || card?.name || "Movie";
  return {
    title: `${name} — Watch Free | PlayBeat TV`,
    description:
      (info?.plot || `Watch ${name} free on PlayBeat TV.`).slice(0, 200),
  };
}

export default async function MoviePage({
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
  if (!info && !card) notFound();

  const name = info?.name || card?.name || "Movie";
  const backdrop = vodInfoBackdrop(info);
  const poster = vodInfoPoster(info) || card?.poster || null;
  const year =
    Number(info?.year) ||
    Number((info?.releasedate || "").slice(0, 4)) ||
    card?.year ||
    0;
  const rating =
    info?.rating != null && Number(info.rating) > 0
      ? Math.round(Number(info.rating) * 10) / 10
      : card?.rating;
  const genres = (info?.genre || "").split(",").map((g) => g.trim()).filter(Boolean);
  const cast = (info?.cast || "").split(",").map((g) => g.trim()).filter(Boolean).slice(0, 6);

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-white">
      {/* backdrop */}
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
            href="/movies"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-xs font-semibold text-zinc-200 backdrop-blur transition-colors hover:border-theme/50 hover:text-theme"
          >
            <ArrowLeft className="size-3.5" /> All movies
          </Link>

          <div className="mt-8 flex flex-col gap-7 sm:flex-row sm:items-end">
            {/* poster */}
            <div className="w-40 shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/60 sm:w-52">
              <div className="aspect-[2/3] bg-[#141416]">
                {poster ? (
                  <img src={poster} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-zinc-600">
                    <Film className="size-10" />
                  </div>
                )}
              </div>
            </div>

            {/* meta */}
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
                {info?.duration && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5" /> {info.duration}
                  </span>
                )}
                {info?.country && <span>{info.country}</span>}
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

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href={`/watch/movie/${id}`}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-theme px-7 text-sm font-black text-white shadow-lg shadow-theme/30 transition-all hover:brightness-110"
                >
                  <Play className="size-4 fill-current" /> Play now
                </a>
              </div>
            </div>
          </div>

          {/* plot + cast */}
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_300px]">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                Storyline
              </h2>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-zinc-300">
                {info?.plot ||
                  "No storyline available for this title yet — press play and enjoy the movie."}
              </p>
            </div>
            {cast.length > 0 && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                  Starring
                </h2>
                <ul className="mt-3 space-y-1.5 text-sm text-zinc-300">
                  {cast.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
