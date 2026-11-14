"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Loader2,
  Maximize,
  Pause,
  Play,
  RefreshCw,
  SignalHigh,
  Unplug,
  Volume2,
  VolumeX,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { qualityLabel, type StreamChannel } from "@/lib/stream";

/* Route streams a browser cannot fetch directly from the page (plain-http
   mixed content, DASH manifests, redirect short-links) through the
   same-origin /api/stream-proxy; direct HTTPS HLS stays on the CDN path. */
function resolvePlayUrl(u: string): string {
  if (/^https:\/\/[^/?#]+\/[^?#]*\.m3u8(\?|$)/i.test(u)) return u;
  return `/api/stream-proxy?u=${encodeURIComponent(u)}`;
}

type PlayerStatus = "connecting" | "playing" | "error";

/* Hard deadline for a source to produce its first frame before we
   automatically jump to the next source (or surface an error). */
const CONNECT_DEADLINE_MS = 9_000;

/**
 * Outer dialog chrome. The inner PlayerWithFallbacks wrapper is remounted via
 * `key` whenever the channel changes, which cleanly resets all player state
 * without setState-in-effect patterns. `fallbackChannels` is the healthy
 * auto-advance chain: if every source of the current channel fails, the
 * player seamlessly moves to the next healthy channel instead of erroring.
 */
export function PlayerDialog({
  channel,
  open,
  onOpenChange,
  isFavorite,
  onToggleFavorite,
  categoryNames,
  fallbackChannels = [],
}: {
  channel: StreamChannel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  categoryNames: Record<string, string>;
  /** healthy channels to auto-advance to when the current one dies */
  fallbackChannels?: StreamChannel[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] w-[min(960px,94vw)] max-w-none overflow-hidden border-zinc-800 bg-zinc-950 p-0 text-zinc-100 sm:rounded-xl"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">
          {channel ? `Watching ${channel.name}` : "Player"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Live stream player. No sign-in required.
        </DialogDescription>

        {channel && open && (
          <PlayerWithFallbacks
            key={channel.id}
            channel={channel}
            fallbackChannels={fallbackChannels}
            categoryNames={categoryNames}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Owns the cross-channel fallback position. Remounts happen via PlayerEngine
 * keys; this wrapper only advances an index, so a dead channel hands off to
 * the next healthy one without flashing an error screen in between.
 */
function PlayerWithFallbacks({
  channel,
  fallbackChannels,
  categoryNames,
  isFavorite,
  onToggleFavorite,
}: {
  channel: StreamChannel;
  fallbackChannels: StreamChannel[];
  categoryNames: Record<string, string>;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const chain = useMemo(
    () => [channel, ...fallbackChannels.filter((f) => f.id !== channel.id)],
    [channel, fallbackChannels]
  );
  const [idx, setIdx] = useState(0);
  const safeIdx = Math.min(idx, chain.length - 1);
  const current = chain[safeIdx];
  const next = safeIdx < chain.length - 1 ? chain[safeIdx + 1] : undefined;

  return (
    <PlayerEngine
      key={current.id}
      channel={current}
      onAdvanceChannel={next ? () => setIdx(safeIdx + 1) : undefined}
      triedBackupCount={safeIdx}
      categoryNames={categoryNames}
      isFavorite={isFavorite}
      onToggleFavorite={onToggleFavorite}
    />
  );
}

function PlayerEngine({
  channel,
  onAdvanceChannel,
  triedBackupCount = 0,
  categoryNames,
  isFavorite,
  onToggleFavorite,
}: {
  channel: StreamChannel;
  /** called after the last source fails, if a healthy backup channel exists */
  onAdvanceChannel?: () => void;
  /** how many backup channels were auto-tried before this one */
  triedBackupCount?: number;
  categoryNames: Record<string, string>;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const dashRef = useRef<{ reset(): void } | null>(null);
  const recoverAttempted = useRef(false);
  const statusRef = useRef<PlayerStatus>("connecting");

  const [status, setStatus] = useState<PlayerStatus>("connecting");
  const [srcIndex, setSrcIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const srcCount = channel.srcs.length;

  /* latest-ref for the cross-channel advance callback so the HLS effect
     below can call it without re-running on identity changes */
  const advanceChannelRef = useRef(onAdvanceChannel);
  useEffect(() => {
    advanceChannelRef.current = onAdvanceChannel;
  }, [onAdvanceChannel]);

  /* attach / detach HLS engine (runs on mount, source switch, retry).
     A 9s watchdog guarantees the user never waits longer than that on a
     dead source: it auto-advances to the next source, then to the next
     healthy channel, and only shows the error overlay after every source
     AND every backup channel has been tried. */
  useEffect(() => {
    const video = videoRef.current;
    const url = channel.srcs[srcIndex]?.u;
    if (!video || !url) return;
    const playUrl = resolvePlayUrl(url);

    recoverAttempted.current = false;
    statusRef.current = "connecting";
    /* status is already "connecting" on every path that (re)runs this effect:
       mount init, auto-advance while connecting, manual retry / source switch */

    let watchdog: number | undefined;
    const clearWatchdog = () => {
      if (watchdog !== undefined) {
        window.clearTimeout(watchdog);
        watchdog = undefined;
      }
    };

    /* try the next source; then the next healthy channel; error only after
       every source AND every backup channel has been tried */
    const advanceOrError = () => {
      if (watchdog === undefined) return; // already resolved for this source
      clearWatchdog();
      if (srcIndex < srcCount - 1) setSrcIndex(srcIndex + 1);
      else if (advanceChannelRef.current) {
        statusRef.current = "connecting";
        advanceChannelRef.current();
      } else setStatus("error");
    };

    const resolve = () => {
      clearWatchdog();
      statusRef.current = "playing";
      setStatus("playing");
    };
    function onPlaying() {
      setPaused(false);
      resolve();
    }
    function onPause() {
      setPaused(true);
    }
    function onPlayEvt() {
      setPaused(false);
    }
    /* native HLS (Safari) / element-level failures: honour the same
       source -> healthy-channel chain as hls.js fatal errors */
    function onVideoError() {
      if (statusRef.current === "playing") {
        /* stream died mid-watch — surface it right away */
        statusRef.current = "error";
        setStatus("error");
        return;
      }
      advanceOrError();
    }

    function cleanup() {
      clearWatchdog();
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (dashRef.current) {
        dashRef.current.reset();
        dashRef.current = null;
      }
      if (!video) return;
      video.removeEventListener("error", onVideoError);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("play", onPlayEvt);
    }

    cleanup();
    video.pause();
    video.addEventListener("error", onVideoError);

    if (/\.mpd($|\?)/i.test(url)) {
      /* DASH source (dash.js) — lazily imported engine, same fallback chain:
         fatal errors advance to the next source / healthy channel. */
      let cancelled = false;
      import("dashjs").then(({ default: dashjs }) => {
        if (cancelled) return;
        const dash = dashjs.MediaPlayer().create();
        dashRef.current = dash;
        dash.initialize(video, playUrl, true);
        dash.on(dashjs.MediaPlayer.events.ERROR, () => {
          if (statusRef.current === "playing") {
            statusRef.current = "error";
            setStatus("error");
            return;
          }
          advanceOrError();
        });
      });
      return () => {
        cancelled = true;
        if (dashRef.current) {
          dashRef.current.reset();
          dashRef.current = null;
        }
      };
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        liveSyncDurationCount: 2,
        startFragPrefetch: true,
        manifestLoadingTimeOut: 6_000,
        manifestLoadingMaxRetry: 1,
        manifestLoadingRetryDelay: 400,
        levelLoadingTimeOut: 6_000,
        levelLoadingMaxRetry: 1,
        levelLoadingRetryDelay: 400,
        fragLoadingTimeOut: 8_000,
        fragLoadingMaxRetry: 2,
        fragLoadingRetryDelay: 400,
      });
      hlsRef.current = hls;
      hls.loadSource(playUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !recoverAttempted.current) {
          recoverAttempted.current = true;
          hls.recoverMediaError();
          return;
        }
        if (statusRef.current === "playing") {
          /* stream died mid-watch — surface it right away */
          statusRef.current = "error";
          setStatus("error");
          return;
        }
        advanceOrError();
      });
    } else {
      // Native HLS (Safari) or unsupported browser: assign directly.
      // Failures surface through the <video> onError handler below.
      video.src = playUrl;
    }

    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("play", onPlayEvt);

    watchdog = window.setTimeout(() => {
      if (statusRef.current !== "playing") advanceOrError();
    }, CONNECT_DEADLINE_MS);

    video.play().catch(() => {
      /* autoplay blocked; the center play button invites a tap */
    });

    return cleanup;
  }, [channel, srcIndex, attempt, srcCount]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const goFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen().catch(() => {});
  }, []);

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key.toLowerCase() === "m") {
        toggleMute();
      } else if (e.key.toLowerCase() === "f") {
        goFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, toggleMute, goFullscreen]);

  /* pause + clear hash when unmounting (channel switch / dialog close) */
  useEffect(() => {
    return () => {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
    };
  }, []);

  function copyShare() {
    const url = `${window.location.origin}/#watch=${channel.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function retry() {
    setStatus("connecting");
    setAttempt((a) => a + 1);
  }

  const fav = isFavorite(channel.id);

  return (
    <div className="flex flex-col">
      {/* video area */}
      <div ref={containerRef} className="relative aspect-video w-full bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="size-full bg-black"
          aria-label={`${channel.name} live stream`}
        />

        {/* connecting overlay */}
        {status === "connecting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
            <Loader2 className="size-8 animate-spin text-theme" />
            <p className="text-sm text-zinc-300">Connecting to {channel.name}…</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              auto-switches within {CONNECT_DEADLINE_MS / 1000}s
            </p>
          </div>
        )}

        {/* center play button when autoplay was blocked */}
        {status === "playing" && paused && (
          <button
            onClick={togglePlay}
            aria-label="Play"
            className="absolute inset-0 grid place-items-center bg-black/30 transition-colors hover:bg-black/40"
          >
            <span className="grid size-16 place-items-center rounded-full bg-theme/95 shadow-2xl shadow-theme/25">
              <Play className="size-7 fill-zinc-950 text-white" />
            </span>
          </button>
        )}

        {/* error overlay */}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
            <Unplug className="size-9 text-rose-400" />
            <p className="text-sm font-medium text-zinc-200">Signal unavailable</p>
            <p className="max-w-md text-xs leading-relaxed text-zinc-500">
              Tried {srcCount > 1 ? `all ${srcCount} sources` : "the source"}
              {triedBackupCount > 0
                ? ` plus ${triedBackupCount} backup ${triedBackupCount === 1 ? "channel" : "channels"}`
                : ""}
              , but this stream looks offline or geo-blocked in your region.
              Free-to-air signals vary by country; please try another channel,
              retry, or open the direct link externally.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                size="sm"
                onClick={retry}
                className="bg-theme text-white hover:bg-theme"
              >
                <RefreshCw className="size-3.5" />
                Retry
              </Button>
              {srcCount > 1 && srcIndex < srcCount - 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setStatus("connecting");
                    setSrcIndex((i) => i + 1);
                  }}
                  className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                >
                  Try source {srcIndex + 2}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                asChild
                className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
              >
                <a
                  href={channel.srcs[srcIndex]?.u}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                >
                  Direct link
                </a>
              </Button>
            </div>
          </div>
        )}

        {/* tap-to-unmute hint */}
        {status === "playing" && muted && (
          <button
            onClick={toggleMute}
            className="absolute left-3 top-3 rounded-full bg-zinc-950/80 px-3 py-1.5 text-xs font-medium text-theme ring-1 ring-theme/40 transition-colors hover:bg-zinc-900"
          >
            <VolumeX className="mr-1.5 inline size-3.5" />
            Tap to unmute
          </button>
        )}

        {/* controls bar */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2.5 pt-8">
          <span className="mr-1 inline-flex items-center gap-1.5 rounded bg-rose-600/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            <SignalHigh className="size-3" />
            Live
          </span>
          <button
            onClick={togglePlay}
            aria-label={paused ? "Play" : "Pause"}
            className="rounded-md p-1.5 text-zinc-200 transition-colors hover:bg-white/10"
          >
            {paused ? <Play className="size-4.5" /> : <Pause className="size-4.5" />}
          </button>
          <button
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className="rounded-md p-1.5 text-zinc-200 transition-colors hover:bg-white/10"
          >
            {muted ? <VolumeX className="size-4.5" /> : <Volume2 className="size-4.5" />}
          </button>
          <div className="flex-1" />
          {srcCount > 1 && (
            <span className="mr-1 hidden rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300 sm:inline">
              src {srcIndex + 1}/{srcCount}
            </span>
          )}
          <button
            onClick={copyShare}
            aria-label="Copy share link"
            title="Copy share link"
            className="rounded-md p-1.5 text-zinc-200 transition-colors hover:bg-white/10"
          >
            {copied ? (
              <Check className="size-4.5 text-emerald-400" />
            ) : (
              <Copy className="size-4.5" />
            )}
          </button>
          <button
            onClick={goFullscreen}
            aria-label="Fullscreen"
            className="rounded-md p-1.5 text-zinc-200 transition-colors hover:bg-white/10"
          >
            <Maximize className="size-4.5" />
          </button>
        </div>
      </div>

      {/* info bar */}
      <div className="flex flex-wrap items-center gap-3 border-t border-zinc-800/80 p-3.5">
        {channel.logo ? (
          <img
            src={channel.logo}
            alt=""
            className="h-9 w-9 shrink-0 rounded-md bg-zinc-900 object-contain p-1"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-sm font-bold text-theme">
            {channel.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-100">
            {channel.flag ? `${channel.flag} ` : ""}
            {channel.name}
          </p>
          <p className="truncate text-xs text-zinc-500">
            {channel.cats
              .slice(0, 2)
              .map((c) => categoryNames[c] ?? c)
              .join(" · ") || "General"}{" "}
            · {qualityLabel(channel)} · public free-to-air stream
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onToggleFavorite(channel.id)}
          aria-pressed={fav}
          className={cn(
            "h-8 border-zinc-700 hover:bg-zinc-800",
            fav ? "text-rose-400" : "text-zinc-300"
          )}
        >
          <Heart className={cn("size-3.5", fav && "fill-rose-400")} />
          {fav ? "In My List" : "Add to My List"}
        </Button>
      </div>
    </div>
  );
}
