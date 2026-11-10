/* Client-safe: the "always-something-healthy" channel chain.
 *
 * Every id below is a 24/7, multi-source channel that passed the full
 * stream health probe (scripts/check-stream-health.ts: manifest + variant
 * playlist + segment). Order is the auto-advance priority:
 *   - global news first (widest geo availability)
 *   - then sports / movies / kids as flavour fallbacks
 *
 * Used for:
 *   1. Instant autoplay when a client opens the site (muted, once/session)
 *   2. Automatic cross-channel fallback when a stream dies mid-watch
 */

export const STARTER_CHANNEL_IDS = [
  "AlJazeera.qa",
  "France24.fr",
  "TRTWorld.tr",
  "BloombergTV.us",
  "NBCNewsNOW.us",
  "RedBullTV.at",
  "CricketGold.au",
  "ARTFLIXMovieClassics.us",
  "CBSNews247.us",
  "NickelodeonLatinAmerica.us",
] as const;

/** sessionStorage flag — the welcome autoplay runs once per browser session. */
export const AUTOPLAY_SESSION_KEY = "pb:autoplay-v1";

/** Resolve the starter chain against a catalog channel list, preserving order. */
export function resolveStarterChannels<T extends { id: string }>(
  channels: T[]
): T[] {
  const byId = new Map(channels.map((c) => [c.id, c]));
  return STARTER_CHANNEL_IDS.map((id) => byId.get(id)).filter(
    (c): c is T => !!c
  );
}
