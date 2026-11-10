"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Film,
  Tv,
  Sparkles,
  Plus,
  Trash2,
  Play,
  ArrowLeft,
  Lock,
  CheckCircle2,
  Download,
  Upload,
  Globe,
  Layers,
} from "lucide-react";
import {
  useCustomContent,
  type CustomContentItem,
} from "@/lib/custom-content";
import { PlayerDialog } from "@/components/stream/player-dialog";
import { customItemToChannel } from "@/lib/custom-content";
import type { StreamChannel } from "@/lib/stream";

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

  const { items, addOrUpdate, remove } = useCustomContent();

  // Active form state
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"movie" | "drama" | "cartoon">("movie");
  const [streamUrl, setStreamUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [country, setCountry] = useState("GLOBAL");
  const [language, setLanguage] = useState("Hindi / Urdu / English");
  const [quality, setQuality] = useState<"4K" | "1080p" | "720p" | "HD">("1080p");
  const [year, setYear] = useState<number>(2024);
  const [description, setDescription] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  // Preview player state
  const [previewChannel, setPreviewChannel] = useState<StreamChannel | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);

  // Tab filter in library
  const [filterType, setFilterType] = useState<"all" | "movie" | "drama" | "cartoon">("all");

  const filteredItems = useMemo(() => {
    if (filterType === "all") return items;
    return items.filter((x) => x.type === filterType);
  }, [items, filterType]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() === "playbeat2026" || pin.trim() === "admin") {
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Incorrect Admin PIN. (Default: playbeat2026)");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !streamUrl.trim()) {
      setStatusMsg("Title and Stream URL are required!");
      return;
    }

    const newItem: CustomContentItem = {
      id: `custom-${type}-${Date.now()}`,
      title: title.trim(),
      type,
      streamUrl: streamUrl.trim(),
      posterUrl:
        posterUrl.trim() ||
        "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80",
      country: country.trim() || "GLOBAL",
      language: language.trim() || "Hindi / Urdu",
      quality,
      year: year || 2024,
      description: description.trim(),
      createdAt: new Date().toISOString(),
    };

    addOrUpdate(newItem);
    setStatusMsg(`"${newItem.title}" successfully added!`);

    // Reset fields
    setTitle("");
    setStreamUrl("");
    setPosterUrl("");
    setDescription("");
    setTimeout(() => setStatusMsg(""), 4000);
  };

  const handleTestPlay = (item: CustomContentItem) => {
    const ch = customItemToChannel(item);
    setPreviewChannel(ch);
    setPlayerOpen(true);
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `playbeat-custom-content-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050814] px-4 py-12 text-zinc-100">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#e2b34e]/30 bg-[#0d1624]/90 p-8 shadow-2xl backdrop-blur-2xl">
          <div className="absolute -right-20 -top-20 size-48 rounded-full bg-[#e2b34e]/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 size-48 rounded-full bg-blue-600/10 blur-3xl" />

          <div className="text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#e2b34e]/20 to-[#e2b34e]/5 ring-1 ring-[#e2b34e]/40">
              <Lock className="size-6 text-[#e2b34e]" />
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-white">
              PlayBeat TV Admin
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Enter your admin security PIN to upload &amp; manage custom movies, dramas, and cartoons.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300">
                Admin Security PIN
              </label>
              <input
                type="password"
                placeholder="Enter PIN (Default: playbeat2026)"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-[#e2b34e] focus:outline-none focus:ring-1 focus:ring-[#e2b34e]"
                autoFocus
              />
            </div>

            {authError && (
              <p className="text-xs font-medium text-rose-400">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-[#e2b34e] to-[#c99532] py-3 text-sm font-bold text-slate-950 shadow-lg shadow-[#e2b34e]/20 transition-transform active:scale-[0.98]"
            >
              Unlock Dashboard
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="size-3.5" /> Back to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050814] text-zinc-100">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-[#e2b34e]/20 bg-[#070e1b]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="size-3.5" /> Exit Admin
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <h1 className="text-base font-black tracking-tight text-white">
              PlayBeat TV <span className="text-[#e2b34e]">Studio</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2b34e]/30 bg-[#e2b34e]/10 px-3 py-1.5 text-xs font-semibold text-[#e2b34e] hover:bg-[#e2b34e]/20"
            >
              <Download className="size-3.5" /> Export Catalog JSON
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1.4fr]">
          {/* Left Form: Add Content */}
          <div className="rounded-3xl border border-white/10 bg-[#0b1424]/90 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-[#e2b34e]/15 text-[#e2b34e]">
                <Plus className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Add New Movie, Drama or Cartoon
                </h2>
                <p className="text-xs text-zinc-400">
                  Fill in the details to publish custom media into PlayBeat TV.
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="mt-6 space-y-4">
              {/* Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300">
                  Content Type
                </label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setType("movie")}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                      type === "movie"
                        ? "border-[#e2b34e] bg-[#e2b34e]/15 text-[#e2b34e]"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Film className="size-4" /> Movie
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("drama")}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                      type === "drama"
                        ? "border-[#e2b34e] bg-[#e2b34e]/15 text-[#e2b34e]"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Tv className="size-4" /> Drama / Series
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("cartoon")}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                      type === "cartoon"
                        ? "border-[#e2b34e] bg-[#e2b34e]/15 text-[#e2b34e]"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Sparkles className="size-4" /> Cartoon
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300">
                  Title / Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ertugrul Ghazi, Jawan, Spider-Man, Tom & Jerry"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-[#e2b34e] focus:outline-none"
                />
              </div>

              {/* Stream URL */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300">
                  Stream URL (M3U8 / MP4) *
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/stream/index.m3u8 or .mp4"
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-[#e2b34e] focus:outline-none font-mono text-xs"
                />
              </div>

              {/* Poster URL */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300">
                  Poster Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://.../poster.jpg (TMDB, Imgur, direct link)"
                  value={posterUrl}
                  onChange={(e) => setPosterUrl(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-[#e2b34e] focus:outline-none"
                />
                {posterUrl && (
                  <div className="mt-2 flex items-center gap-3 rounded-lg border border-white/10 bg-black/40 p-2">
                    <img
                      src={posterUrl}
                      alt="Preview"
                      className="size-12 rounded object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <span className="text-[11px] text-zinc-400">
                      Poster preview loaded successfully
                    </span>
                  </div>
                )}
              </div>

              {/* Grid: Quality & Language */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300">
                    Quality
                  </label>
                  <select
                    value={quality}
                    onChange={(e) =>
                      setQuality(e.target.value as "4K" | "1080p" | "720p" | "HD")
                    }
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#101b2d] px-3 py-2.5 text-xs text-white focus:border-[#e2b34e] focus:outline-none"
                  >
                    <option value="4K">4K Ultra HD</option>
                    <option value="1080p">1080p Full HD</option>
                    <option value="720p">720p HD</option>
                    <option value="HD">HD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300">
                    Language
                  </label>
                  <input
                    type="text"
                    placeholder="Urdu, Hindi, English, etc."
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#e2b34e] focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300">
                  Short Description / Synopsis
                </label>
                <textarea
                  rows={2}
                  placeholder="Plot summary, episode info, or star cast..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white placeholder-zinc-500 focus:border-[#e2b34e] focus:outline-none"
                />
              </div>

              {statusMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 p-3 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="size-4 shrink-0" />
                  {statusMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-[#e2b34e] to-[#c99532] py-3 text-sm font-bold text-slate-950 shadow-lg shadow-[#e2b34e]/20 transition-all hover:brightness-110 active:scale-[0.98]"
              >
                + Publish Content to Site
              </button>
            </form>
          </div>

          {/* Right: Library of Custom Content */}
          <div className="flex flex-col rounded-3xl border border-white/10 bg-[#0b1424]/90 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Custom Media Library ({items.length})
                </h2>
                <p className="text-xs text-zinc-400">
                  Titles stored and currently active on PlayBeat TV.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 text-xs font-medium">
                {(["all", "movie", "drama", "cartoon"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`rounded-lg px-2.5 py-1 capitalize transition-colors ${
                      filterType === t
                        ? "bg-[#e2b34e] font-bold text-slate-950"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {t === "all" ? "All" : t}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="mt-6 flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-1">
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
                  <Film className="size-10 stroke-1" />
                  <p className="mt-2 text-sm">No items in this category yet.</p>
                  <p className="text-xs text-zinc-600">Use the form on the left to add one.</p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-[#e2b34e]/40 hover:bg-white/[0.06]"
                  >
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      className="size-16 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80";
                      }}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#e2b34e]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#e2b34e]">
                          {item.type}
                        </span>
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-zinc-300">
                          {item.quality}
                        </span>
                        <span className="truncate text-xs text-zinc-400">
                          {item.language}
                        </span>
                      </div>

                      <h3 className="mt-1 truncate text-sm font-bold text-white">
                        {item.title}
                      </h3>

                      <p className="truncate text-[11px] text-zinc-400">
                        {item.description || item.streamUrl}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleTestPlay(item)}
                        className="grid size-9 place-items-center rounded-xl bg-[#e2b34e]/20 text-[#e2b34e] transition-transform hover:scale-105 hover:bg-[#e2b34e] hover:text-slate-950"
                        title="Test Play Stream"
                      >
                        <Play className="size-4 fill-current" />
                      </button>

                      <button
                        onClick={() => remove(item.id)}
                        className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:border-rose-500/40 hover:bg-rose-500/20 hover:text-rose-400"
                        title="Delete"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Test Play Player Dialog */}
      <PlayerDialog
        channel={previewChannel}
        open={playerOpen}
        onOpenChange={setPlayerOpen}
        isFavorite={() => false}
        onToggleFavorite={() => {}}
        categoryNames={{
          movies: "Movies",
          series: "Series & Dramas",
          animation: "Animation & Cartoons",
          kids: "Kids",
        }}
      />
    </div>
  );
}
