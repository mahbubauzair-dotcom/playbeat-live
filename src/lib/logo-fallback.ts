import type { SyntheticEvent } from "react";

/* Shared <img onError> handler for channel/brand logos. imgur and similar
 * image hosts rate-limit hotlinks (HTTP 429), which left broken images across
 * the directory. Instead of hiding the <img>, we swap in a neutral initials
 * tile rendered as an inline SVG data URI — viewers always see something. */
export function logoFallback(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.src.startsWith("data:")) return;
  const name = (img.alt || "TV").replace(/\s*logo\s*$/i, "").trim();
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "TV";
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120">' +
    '<rect width="160" height="120" rx="12" fill="#18181b"/>' +
    '<rect x="52" y="36" width="56" height="42" rx="7" fill="none" stroke="#52525b" stroke-width="3"/>' +
    '<path d="M66 28l14 9 14-9" stroke="#52525b" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="80" cy="57" r="7" fill="#52525b"/>' +
    "</svg>";
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
