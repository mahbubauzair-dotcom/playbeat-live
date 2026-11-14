/* Server-only SEO text built from the bundled catalog, so the numbers in
 * titles/descriptions always match what the site really lists. */
import { catalog } from "@/lib/stream.server";
import { SITE } from "@/lib/site";

export const totalChannels = () => catalog.channels.length;
export const totalCountries = () => catalog.countries.length;

export function homeTitle(): string {
  /* Regional GSC title (exact copy per SEO spec) — replaces the generic
     catalog-generated headline so playbeat.live ranks for USA/NA keywords. */
  return "Playbeat Live — Watch Free USA & North America 24/7 Live TV & News";
}

export function homeDescription(): string {
  /* Regional GSC description (exact copy per SEO spec). */
  return "Watch 860+ free live TV channels from the United States, Canada and Mexico. 24/7 breaking news, live sports, sitcoms and FAST movie channels with no cable or login.";
}

/** one-line description of the site used in page intros */
export function siteIntro(): string {
  return `${SITE.name} is a free directory of live TV from ${SITE.coverage}.`;
}
