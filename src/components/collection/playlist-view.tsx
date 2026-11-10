"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  AvailabilityBadge,
  RiskBadge,
  VerificationBadge,
} from "@/components/collection/status";
import {
  buildSafePlaylist,
  CN_CONTENT_TAGS_EN,
  type PlaylistGroupKey,
} from "@/lib/playlist";
import {
  categoryLabel,
  hostOf,
  type ResourceItem,
} from "@/lib/collection";
import {
  Copy,
  Check,
  ExternalLink,
  Info,
  ListMusic,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const GROUP_ORDER: Record<PlaylistGroupKey, number> = {
  live: 0,
  anime: 1,
  app: 2,
  player: 3,
  tool: 4,
};

function PlaylistRow({
  item,
  index,
}: {
  item: ResourceItem;
  index: number;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const declared = item.risks.copyright === "low" || item.risks.copyright === "medium";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ description: "Copy failed — please copy the link manually" });
    }
  }

  const displayName = item.en?.name ?? item.name;

  return (
    <li
      className={cn(
        "group flex items-center gap-3 border-b border-zinc-800/60 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-zinc-900/60",
        item.verification.status === "removed" && "opacity-60"
      )}
    >
      <span className="w-7 shrink-0 text-right font-mono text-sm text-zinc-600">
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="truncate text-sm font-medium text-zinc-100 hover:text-amber-400"
          >
            {displayName}
          </a>
          <span className="truncate font-mono text-[11px] text-zinc-600">
            {hostOf(item.url)}
          </span>
          <Badge
            variant="secondary"
            className="border-zinc-700/60 bg-zinc-800/80 text-[10px] text-zinc-400"
          >
            {categoryLabel(item.category)}
          </Badge>
          {declared && (
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-300"
            >
              <ShieldCheck className="size-3" />
              Repo-declared {item.risks.copyright === "low" ? "low" : "medium"} risk
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {item.en?.summaryShort || item.en?.summary || item.summaryShort || item.summary}
        </p>
      </div>

      <div className="hidden shrink-0 items-center gap-1.5 md:flex">
        <AvailabilityBadge
          status={item.availability?.status ?? "unchecked"}
          httpStatus={item.availability?.httpStatus}
        />
        <VerificationBadge status={item.verification.status} />
        {item.risks.copyright !== "unknown" && <RiskBadge level={item.risks.copyright!} />}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={copyLink}
          className="size-8 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          aria-label={`Copy ${displayName} link`}
          title="Copy link"
        >
          {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
        </Button>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="h-8 border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <a href={item.url} target="_blank" rel="noopener noreferrer nofollow">
            <ExternalLink className="size-3.5" />
            Open
          </a>
        </Button>
      </div>
    </li>
  );
}

export function PlaylistView() {
  const [includeTools, setIncludeTools] = useState(true);
  const { toast } = useToast();

  const playlist = useMemo(() => buildSafePlaylist(includeTools), [includeTools]);

  const orderedGroups = useMemo(
    () => [...playlist.groups].sort((a, b) => GROUP_ORDER[a.key] - GROUP_ORDER[b.key]),
    [playlist]
  );

  async function copyAllLinks() {
    const links = orderedGroups
      .flatMap((g) => g.items)
      .map((i, n) => `${String(n + 1).padStart(2, "0")} ${i.en?.name ?? i.name} — ${i.url}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(links);
      toast({ description: `Copied ${playlist.total} links` });
    } catch {
      toast({ description: "Copy failed — please copy manually" });
    }
  }

  return (
    <section className="flex-1" aria-label="Safe playlist">
      {/* Criteria banner */}
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <div className="space-y-1.5 text-sm leading-relaxed text-zinc-300">
            <p className="font-medium text-amber-300">Safe playlist inclusion criteria</p>
            <p className="text-zinc-400">
              Important: <span className="text-rose-300">every online streaming site in this
              repository is flagged as high copyright risk by the maintainer itself</span>, so
              none of them are included. The list below contains only publicly legal IPTV
              sources and open-source players / tools, and — per your request — excludes
              Chinese drama / series content (tags: {CN_CONTENT_TAGS_EN.join(", ")}) as well as
              subtitle sites.
            </p>
            <p className="text-xs text-zinc-500">
              "No copyright risk" reflects the repository's own self-declared labels and is not
              a legal guarantee. Aggregator apps and players host no content themselves — what
              you can play depends on the sources you configure. Please follow the laws of your
              region.
            </p>
          </div>
        </div>
      </div>

      {/* Playlist toolbar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className="border-zinc-800 bg-zinc-900/60 font-mono text-zinc-400"
          >
            <ListMusic className="size-3" />
            {playlist.total} items
          </Badge>
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 font-mono text-emerald-300"
          >
            {playlist.declaredCount} declared low/medium risk
          </Badge>
          <Badge
            variant="outline"
            className="border-zinc-800 bg-zinc-900/60 font-mono text-zinc-400"
          >
            {playlist.toolsCount} open-source tools (risk undeclared)
          </Badge>
          <Badge
            variant="outline"
            className="border-zinc-800 bg-zinc-900/60 font-mono text-zinc-400"
          >
            Excludes {CN_CONTENT_TAGS_EN.length} Chinese-content tags
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
            <Switch
              checked={includeTools}
              onCheckedChange={setIncludeTools}
              aria-label="Include open-source tools"
            />
            Include open-source tools ({playlist.toolsCount})
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={copyAllLinks}
            disabled={playlist.total === 0}
            className="h-8 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <Copy className="size-3.5" />
            Copy all links
          </Button>
        </div>
      </div>

      {/* Playlist groups */}
      {playlist.total > 0 ? (
        <div className="mt-4 space-y-5 pb-6">
          {orderedGroups.map((group) => (
            <div
              key={group.key}
              className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-zinc-800 bg-zinc-900/60 px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                  <ListMusic className="size-4 text-amber-400" />
                  {group.label}
                  <span className="font-mono text-xs text-zinc-500">{group.items.length}</span>
                </h3>
                <p className="text-xs text-zinc-500">{group.desc}</p>
              </div>
              <ul>
                {group.items.map((item, n) => (
                  <PlaylistRow key={item.id} item={item} index={n} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-800 py-14 text-center">
          <Trash2 className="size-10 text-zinc-700" />
          <p className="text-sm text-zinc-500">
            No resources qualify under the current criteria (all high copyright risk and
            Chinese content excluded).
          </p>
        </div>
      )}
    </section>
  );
}
