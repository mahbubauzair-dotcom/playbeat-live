/* Central SEO helpers for Playbeat Live.
 *
 * Every indexable page builds its metadata here so that titles,
 * descriptions, canonical URLs and social tags stay unique, consistent
 * and free of duplicates. Structured data (JSON-LD) helpers live here too.
 */
import type { Metadata } from "next";

export const SITE_NAME = "Playbeat Live";
export const SITE_URL = "https://www.playbeat.live";

/** Branded Open Graph image (official logo artwork — never regenerated). */
export const OG_IMAGE = {
  url: `${SITE_URL}/brand/logo-full.png`,
  width: 1200,
  height: 630,
  alt: "Playbeat Live — free live TV",
};

interface PageSeoInput {
  /** Unique page title, incl. branding (45–60 chars recommended). */
  title: string;
  /** Unique description summarising THIS page (140–160 chars recommended). */
  description: string;
  /**
   * Canonical path for this page ("/live-tv") or absolute URL when the
   * exact production origin matters (homepage trailing slash).
   */
  path: string;
  /** Open Graph type — "website" for pages, "profile"/"article" etc. rarely needed. */
  ogType?: "website" | "article";
}

/**
 * Build complete, self-consistent page metadata:
 * title + description + canonical + page-specific Open Graph + Twitter card.
 */
export function pageMetadata({
  title,
  description,
  path,
  ogType = "website",
}: PageSeoInput): Metadata {
  const canonical = path.startsWith("http") ? path : new URL(path, SITE_URL).toString();
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: ogType,
      siteName: SITE_NAME,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}

/* ------------------------------ JSON-LD ------------------------------ */

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    description:
      "Discover public free-to-air TV channels worldwide on Playbeat Live. Explore live news, sports, movies, music, kids' channels and more.",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: {
        "@type": "ImageObject",
        url: OG_IMAGE.url,
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
      },
    },
  };
}

export function webPageJsonLd(opts: {
  path: string;
  name: string;
  description: string;
  /** CollectionPage for channel directories, WebPage for everything else */
  type?: "WebPage" | "CollectionPage";
}) {
  const url = opts.path.startsWith("http")
    ? opts.path
    : new URL(opts.path, SITE_URL).toString();
  return {
    "@context": "https://schema.org",
    "@type": opts.type ?? "WebPage",
    name: opts.name,
    description: opts.description,
    url,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: `${SITE_URL}/` },
  };
}
