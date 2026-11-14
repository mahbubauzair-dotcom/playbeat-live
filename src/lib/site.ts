/* Per-site identity. This is the ONE file to edit if you rebrand this domain.
 * Pure constants (safe to import from client components). */
export const SITE = {
  id: "live",
  /** full brand name used in titles, schema, manifest */
  name: "Playbeat Live",
  /** two-part wordmark in the header: PLAYBEAT + ACCENT */
  brandTop: "PLAYBEAT",
  brandAccent: "LIVE",
  tagline: "USA & North America",
  themeColor: "#090c13",
  /** what the site covers, used in titles/descriptions */
  coverage: "the USA, Canada & Mexico",
  /** home page <title> headline (brand is appended) */
  homeHeadline: "Free Live TV from the USA, Canada & Mexico",
  /** topics listed in meta descriptions */
  topics: "news, sports, music, kids and entertainment",
} as const;
