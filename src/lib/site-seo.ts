/* Server-only SEO text built from the bundled catalog, so the numbers in
 * titles/descriptions always match what the site really lists. */
import { catalog } from "@/lib/stream.server";
import { SITE } from "@/lib/site";

export const totalChannels = () => catalog.channels.length;
export const totalCountries = () => catalog.countries.length;

export function homeTitle(): string {
  return `${SITE.homeHeadline} | ${SITE.name}`;
}

export function homeDescription(): string {
  const n = totalChannels().toLocaleString("en-US");
  return `Watch ${n} free live TV channels from ${SITE.coverage}: ${SITE.topics}. No sign-up, free in your browser.`.slice(0, 160);
}

/** one-line description of the site used in page intros */
export function siteIntro(): string {
  return `${SITE.name} is a free directory of live TV from ${SITE.coverage}.`;
}
