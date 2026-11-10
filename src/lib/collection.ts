import raw from "@/data/collection.json";

export type AvailabilityStatus = "reachable" | "restricted" | "unreachable";
export type RiskLevel = "high" | "medium" | "low" | "unknown";
export type VerificationStatus = "recommended" | "caution" | "removed";

export interface Availability {
  status: AvailabilityStatus;
  httpStatus: number | null;
  finalUrl: string | null;
  responseMs: number | null;
  checkedAt: string | null;
  error: string | null;
}

export interface ResourceItem {
  id: string;
  name: string;
  url: string;
  category: string;
  summary: string;
  summaryShort: string;
  tags: string[];
  requiresLogin: boolean;
  freeLevel: string;
  regions: string[];
  scores: { more?: number; speed?: number; clean?: number; stable?: number; ease?: number };
  avgScore: number | null;
  risks: { copyright?: RiskLevel; safety?: RiskLevel; privacy?: RiskLevel; payment?: RiskLevel };
  verification: {
    status: VerificationStatus;
    lastChecked: string | null;
    method: string | null;
    notes: string;
  };
  submittedBy: string | null;
  addedAt: string | null;
  featured: boolean;
  availability: Availability | null;
  /** English localization overlay (translated from the original Chinese source data). */
  en?: {
    name: string;
    summary: string;
    summaryShort: string;
    notes: string;
    tags: string[];
    regions: string[];
  };
}

export interface CategoryMeta {
  zh: string;
  en: string;
  icon: string;
}

interface Dataset {
  meta: {
    repo: string;
    repoUrl: string;
    site: string;
    license: string;
    resourcesUpdatedAt: string;
    availabilityGeneratedAt: string;
    total: number;
    categoryCounts: Record<string, number>;
  };
  categories: Record<string, CategoryMeta>;
  items: ResourceItem[];
}

export const dataset = raw as unknown as Dataset;
export const items: ResourceItem[] = dataset.items;
export const meta = dataset.meta;
export const categories = dataset.categories;

export const SCORE_LABELS: Record<string, string> = {
  more: "Content library",
  speed: "Speed",
  clean: "Ad cleanliness",
  stable: "Stability",
  ease: "Ease of use",
};

export function categoryLabel(cat: string): string {
  return categories[cat]?.en ?? cat;
}

export const AVAILABILITY_LABELS: Record<string, string> = {
  reachable: "Reachable",
  restricted: "Restricted",
  unreachable: "Unreachable",
  unchecked: "Not checked",
};

export const REGION_LABELS: Record<string, string> = {
  GLOBAL: "Global",
  CN: "Mainland China",
};

export function regionLabel(region: string): string {
  return REGION_LABELS[region] ?? region;
}

export function formatResponseTime(ms: number | null): string {
  if (ms == null) return "—";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export function formatCheckedAt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
