"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Cloud,
  Code2,
  Captions,
  Clapperboard,
  Film,
  Magnet,
  PlayCircle,
  Radio,
  Search,
  Smartphone,
  Tv,
  RotateCcw,
  SearchX,
  ListMusic,
  LayoutGrid,
} from "lucide-react";
import { ResourceCard } from "@/components/collection/resource-card";
import { ResourceDialog } from "@/components/collection/resource-dialog";
import { PlaylistView } from "@/components/collection/playlist-view";
import { cn } from "@/lib/utils";
import {
  categoryLabel,
  categories,
  items as allItems,
  meta,
  type ResourceItem,
} from "@/lib/collection";

/* ---------- constants ---------- */

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  online_video: <Film className="size-3.5" />,
  video_app: <Smartphone className="size-3.5" />,
  cloud_search: <Cloud className="size-3.5" />,
  magnet_search: <Magnet className="size-3.5" />,
  subtitles: <Captions className="size-3.5" />,
  tvbox_config: <Tv className="size-3.5" />,
  player: <PlayCircle className="size-3.5" />,
  open_source: <Code2 className="size-3.5" />,
  subscription: <Radio className="size-3.5" />,
};

type AvailabilityFilter = "all" | "reachable" | "restricted" | "unreachable" | "unchecked";
type RiskFilter = "all" | "high" | "medium" | "low";
type VerificationFilter = "all" | "recommended" | "caution" | "removed";
type SortKey = "featured" | "score" | "newest" | "name";

const AVAILABILITY_TABS: { key: AvailabilityFilter; label: string; count: number }[] = [
  { key: "all", label: "All", count: allItems.length },
  {
    key: "reachable",
    label: "Reachable",
    count: allItems.filter((i) => i.availability?.status === "reachable").length,
  },
  {
    key: "restricted",
    label: "Restricted",
    count: allItems.filter((i) => i.availability?.status === "restricted").length,
  },
  {
    key: "unreachable",
    label: "Unreachable",
    count: allItems.filter((i) => i.availability?.status === "unreachable").length,
  },
  {
    key: "unchecked",
    label: "Not checked",
    count: allItems.filter((i) => i.availability == null).length,
  },
];

/* ---------- component ---------- */

export function CollectionPanel() {
  const [view, setView] = useState<"all" | "playlist">("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [verification, setVerification] = useState<VerificationFilter>("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("featured");
  const [detail, setDetail] = useState<ResourceItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = allItems.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (availability === "unchecked") {
        if (item.availability != null) return false;
      } else if (availability !== "all" && item.availability?.status !== availability) {
        return false;
      }
      if (risk !== "all" && (item.risks.copyright ?? "unknown") !== risk) return false;
      if (verification !== "all" && item.verification.status !== verification) return false;
      if (featuredOnly && !item.featured) return false;
      if (q) {
        const hay = [
          item.name,
          item.id,
          item.summary,
          item.summaryShort,
          item.url,
          item.en?.name,
          item.en?.summary,
          item.en?.summaryShort,
          ...item.tags,
          ...(item.en?.tags ?? []),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "score":
          return (b.avgScore ?? -1) - (a.avgScore ?? -1);
        case "newest":
          return (b.addedAt ?? "").localeCompare(a.addedAt ?? "");
        case "name":
          return a.name.localeCompare(b.name, "en");
        case "featured":
        default:
          return (
            Number(b.featured) - Number(a.featured) ||
            (b.avgScore ?? -1) - (a.avgScore ?? -1)
          );
      }
    });
    return list;
  }, [query, category, availability, risk, verification, featuredOnly, sort]);

  const hasFilters =
    query !== "" ||
    category !== "all" ||
    availability !== "all" ||
    risk !== "all" ||
    verification !== "all" ||
    featuredOnly ||
    sort !== "featured";

  function resetFilters() {
    setQuery("");
    setCategory("all");
    setAvailability("all");
    setRisk("all");
    setVerification("all");
    setFeaturedOnly(false);
    setSort("featured");
  }

  function openDetails(item: ResourceItem) {
    setDetail(item);
    setDialogOpen(true);
  }

  return (
    <section className="flex-1" aria-label="Movie resource collection">
      {/* View switcher */}
      <div
        className="mb-4 inline-flex rounded-lg border border-zinc-800 bg-zinc-900/40 p-1"
        role="tablist"
        aria-label="Switch view"
      >
        <button
          role="tab"
          aria-selected={view === "all"}
          onClick={() => setView("all")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
            view === "all"
              ? "bg-amber-500/15 text-amber-300"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <LayoutGrid className="size-4" />
          All resources
        </button>
        <button
          role="tab"
          aria-selected={view === "playlist"}
          onClick={() => setView("playlist")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
            view === "playlist"
              ? "bg-amber-500/15 text-amber-300"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <ListMusic className="size-4" />
          Safe playlist
        </button>
      </div>

      {view === "playlist" ? (
        <PlaylistView />
      ) : (
      <>
      {/* Availability stat tabs */}
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
        role="tablist"
        aria-label="Filter by availability"
      >
        {AVAILABILITY_TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={availability === tab.key}
            onClick={() => setAvailability(tab.key)}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              availability === tab.key
                ? "border-amber-500/50 bg-amber-500/10"
                : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70"
            )}
          >
            <p className="font-mono text-2xl font-semibold text-zinc-100">{tab.count}</p>
            <p className="text-xs text-zinc-500">{tab.label}</p>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search names, descriptions, tags, or domains…"
              className="border-zinc-800 bg-zinc-900/60 pl-9 text-zinc-100 placeholder:text-zinc-600"
              aria-label="Search resources"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger
              className="w-full border-zinc-800 bg-zinc-900/60 text-zinc-300 sm:w-44"
              aria-label="Sort order"
            >
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="border-zinc-800 bg-zinc-950 text-zinc-200">
              <SelectItem value="featured">Featured first</SelectItem>
              <SelectItem value="score">Highest rated</SelectItem>
              <SelectItem value="newest">Newest added</SelectItem>
              <SelectItem value="name">By name</SelectItem>
            </SelectContent>
          </Select>
          <Select value={risk} onValueChange={(v) => setRisk(v as RiskFilter)}>
            <SelectTrigger
              className="w-full border-zinc-800 bg-zinc-900/60 text-zinc-300 sm:w-40"
              aria-label="Filter by copyright risk"
            >
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent className="border-zinc-800 bg-zinc-950 text-zinc-200">
              <SelectItem value="all">All risks</SelectItem>
              <SelectItem value="high">High risk</SelectItem>
              <SelectItem value="medium">Medium risk</SelectItem>
              <SelectItem value="low">Low risk</SelectItem>
            </SelectContent>
          </Select>
          <Select value={verification} onValueChange={(v) => setVerification(v as VerificationFilter)}>
            <SelectTrigger
              className="w-full border-zinc-800 bg-zinc-900/60 text-zinc-300 sm:w-44"
              aria-label="Filter by verification status"
            >
              <SelectValue placeholder="Verification" />
            </SelectTrigger>
            <SelectContent className="border-zinc-800 bg-zinc-950 text-zinc-200">
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="recommended">Recommended</SelectItem>
              <SelectItem value="caution">Use with caution</SelectItem>
              <SelectItem value="removed">Removed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by category">
          <CategoryChip
            active={category === "all"}
            onClick={() => setCategory("all")}
            label="All"
            icon={<Clapperboard className="size-3.5" />}
            count={allItems.length}
          />
          {Object.keys(categories).map((cat) => (
            <CategoryChip
              key={cat}
              active={category === cat}
              onClick={() => setCategory(cat)}
              label={categoryLabel(cat)}
              icon={CATEGORY_ICONS[cat] ?? <Clapperboard className="size-3.5" />}
              count={meta.categoryCounts[cat] ?? 0}
            />
          ))}
        </div>

        {/* Result row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-zinc-500" aria-live="polite">
            Showing <span className="font-mono text-zinc-300">{filtered.length}</span> of{" "}
            <span className="font-mono text-zinc-300">{allItems.length}</span> resources
          </p>
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
              <Switch
                checked={featuredOnly}
                onCheckedChange={setFeaturedOnly}
                aria-label="Featured only"
              />
              Featured only
            </label>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <ResourceCard key={item.id} item={item} onDetails={openDetails} />
          ))}
        </div>
      ) : (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-800 py-14 text-center">
          <SearchX className="size-10 text-zinc-700" />
          <p className="text-sm text-zinc-500">No resources match the current filters.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <RotateCcw className="size-3.5" />
            Clear all filters
          </Button>
        </div>
      )}
      </>
      )}

      <ResourceDialog item={detail} open={dialogOpen} onOpenChange={setDialogOpen} />
    </section>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
  icon,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
          : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-200"
      )}
    >
      {icon}
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-px font-mono text-[10px]",
          active ? "bg-amber-500/20 text-amber-200" : "bg-zinc-800 text-zinc-500"
        )}
      >
        {count}
      </span>
    </button>
  );
}
