"use client";

import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  ShieldAlert,
  ShieldX,
  CircleDashed,
  Star,
  ThumbsUp,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AvailabilityStatus, RiskLevel, VerificationStatus } from "@/lib/collection";

/* ---------- Availability ---------- */

export const AVAILABILITY_META: Record<
  AvailabilityStatus | "unchecked",
  { label: string; dot: string; badgeCls: string; icon: React.ReactNode }
> = {
  reachable: {
    label: "Reachable",
    dot: "bg-emerald-400",
    badgeCls:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15",
    icon: <CheckCircle2 className="size-3" />,
  },
  restricted: {
    label: "Restricted",
    dot: "bg-amber-400",
    badgeCls:
      "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15",
    icon: <ShieldAlert className="size-3" />,
  },
  unreachable: {
    label: "Unreachable",
    dot: "bg-rose-400",
    badgeCls: "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15",
    icon: <ShieldX className="size-3" />,
  },
  unchecked: {
    label: "Not checked",
    dot: "bg-zinc-500",
    badgeCls: "border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800",
    icon: <CircleDashed className="size-3" />,
  },
};

export function AvailabilityBadge({
  status,
  httpStatus,
}: {
  status: AvailabilityStatus | "unchecked";
  httpStatus?: number | null;
}) {
  const m = AVAILABILITY_META[status];
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", m.badgeCls)}>
      {m.icon}
      {m.label}
      {httpStatus != null && <span className="opacity-70">HTTP {httpStatus}</span>}
    </Badge>
  );
}

/* ---------- Risk ---------- */

export const RISK_META: Record<RiskLevel, { label: string; badgeCls: string }> = {
  high: {
    label: "High copyright risk",
    badgeCls: "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15",
  },
  medium: {
    label: "Medium risk",
    badgeCls: "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15",
  },
  low: {
    label: "Low risk",
    badgeCls:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15",
  },
  unknown: {
    label: "Unknown risk",
    badgeCls: "border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800",
  },
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  const m = RISK_META[level];
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", m.badgeCls)}>
      <AlertTriangle className="size-3" />
      {m.label}
    </Badge>
  );
}

/* ---------- Verification ---------- */

export const VERIFICATION_META: Record<
  VerificationStatus,
  { label: string; badgeCls: string; icon: React.ReactNode }
> = {
  recommended: {
    label: "Recommended",
    badgeCls:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15",
    icon: <ThumbsUp className="size-3" />,
  },
  caution: {
    label: "Use with caution",
    badgeCls: "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15",
    icon: <AlertTriangle className="size-3" />,
  },
  removed: {
    label: "Removed",
    badgeCls: "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15",
    icon: <Trash2 className="size-3" />,
  },
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const m = VERIFICATION_META[status];
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", m.badgeCls)}>
      {m.icon}
      {m.label}
    </Badge>
  );
}

/* ---------- Misc ---------- */

export function FeaturedStar({ className }: { className?: string }) {
  return (
    <Star
      className={cn("size-3.5 fill-amber-400 text-amber-400", className)}
      aria-label="Featured"
    />
  );
}
