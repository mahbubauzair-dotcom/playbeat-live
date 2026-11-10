"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  AVAILABILITY_META,
  AvailabilityBadge,
  FeaturedStar,
  RiskBadge,
  VerificationBadge,
} from "@/components/collection/status";
import {
  categoryLabel,
  formatResponseTime,
  hostOf,
  type ResourceItem,
} from "@/lib/collection";
import { ExternalLink, Globe, Info } from "lucide-react";
import { cn } from "@/lib/utils";

function ScoreDots({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-[3px]" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn(
            "size-1.5 rounded-full",
            i <= Math.round(value) ? "bg-amber-400" : "bg-zinc-700"
          )}
        />
      ))}
    </span>
  );
}

export function ResourceCard({
  item,
  onDetails,
}: {
  item: ResourceItem;
  onDetails: (item: ResourceItem) => void;
}) {
  const avStatus = item.availability?.status ?? "unchecked";
  const avMeta = AVAILABILITY_META[avStatus];
  const copyright = item.risks.copyright ?? "unknown";
  const tags = (item.en?.tags ?? item.tags).slice(0, 4);
  const extraTags = item.tags.length - tags.length;

  return (
    <Card
      className={cn(
        "group flex h-full flex-col gap-3 border-zinc-800 bg-zinc-900/60 p-0 transition-colors hover:border-zinc-700 hover:bg-zinc-900",
        item.verification.status === "removed" && "opacity-70"
      )}
    >
      <CardHeader className="gap-1.5 p-4 pb-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 truncate text-base font-semibold text-zinc-100">
              {item.featured && <FeaturedStar className="shrink-0" />}
              <span className="truncate">{item.en?.name ?? item.name}</span>
            </h3>
            <p className="mt-0.5 truncate font-mono text-xs text-zinc-500">
              {hostOf(item.url)}
            </p>
          </div>
          <span
            className={cn("mt-1.5 size-2 shrink-0 rounded-full", avMeta.dot)}
            title={avMeta.label}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="secondary"
            className="border-zinc-700/60 bg-zinc-800/80 text-[11px] text-zinc-300"
          >
            {categoryLabel(item.category)}
          </Badge>
          {item.avgScore != null && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
              <ScoreDots value={item.avgScore} />
              <span className="font-mono">{item.avgScore.toFixed(1)}</span>
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-0">
        <p className="line-clamp-2 text-sm leading-relaxed text-zinc-400">
          {item.en?.summaryShort || item.en?.summary || item.summaryShort || item.summary}
        </p>

        <div className="flex flex-wrap gap-1.5">
          <AvailabilityBadge
            status={avStatus}
            httpStatus={item.availability?.httpStatus}
          />
          <VerificationBadge status={item.verification.status} />
          {copyright !== "unknown" && <RiskBadge level={copyright} />}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded bg-zinc-800/70 px-1.5 py-0.5 text-[11px] text-zinc-400"
              >
                {t}
              </span>
            ))}
            {extraTags > 0 && (
              <span className="px-1 py-0.5 text-[11px] text-zinc-600">
                +{extraTags}
              </span>
            )}
          </div>
        )}

        {item.availability?.responseMs != null && (
          <p className="text-[11px] text-zinc-600">
            Response {formatResponseTime(item.availability.responseMs)} · Checked{" "}
            {item.availability.checkedAt?.slice(0, 10) ?? "—"}
          </p>
        )}
      </CardContent>

      <CardFooter className="gap-2 border-t border-zinc-800/80 p-3">
        <Button
          variant="outline"
          size="sm"
          className="h-8 flex-1 border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          onClick={() => onDetails(item)}
        >
          <Info className="size-3.5" />
          Details
        </Button>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="h-8 flex-1 border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <a href={item.url} target="_blank" rel="noopener noreferrer nofollow">
            <ExternalLink className="size-3.5" />
            Visit
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
