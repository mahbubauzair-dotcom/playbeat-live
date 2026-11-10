import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/stream/legal";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/stream/json-ld";

export const metadata: Metadata = pageMetadata({
  title: "Content Sourcing & Streaming Policy — Playbeat TV",
  description: "Understand the Playbeat TV content sourcing guidelines, excluded streams, copyright considerations and channel removal process.",
  path: "/content-policy",
});

export default function ContentPolicyPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd({
        path: `https://playbeattv.buzz/content-policy`,
        name: "Content Sourcing & Streaming Policy — Playbeat TV",
        description: "Understand the Playbeat TV content sourcing guidelines, excluded streams, copyright considerations and channel removal process.",
      })} />
      <LegalPage title="Content Policy">
      <LegalSection title="One sourcing principle">
        <p>
          Every channel on PlayBeat TV comes from a single, auditable source:
          the open-source{" "}
          <a
            href="https://github.com/iptv-org/iptv"
            target="_blank"
            rel="noopener noreferrer"
            className="text-theme/90 underline-offset-2 hover:underline"
          >
            iptv-org
          </a>{" "}
          index of publicly available, free-to-air television channels. No
          exceptions, no &quot;grey area&quot; additions. If a stream is not
          published there as freely and publicly available, it is not on
          PlayBeat TV.
        </p>
      </LegalSection>

      <LegalSection title="What we include">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Free-to-air channels that broadcasters publish for public access —
            news, sports, movies, series, music, kids, documentaries and more;
          </li>
          <li>
            only HTTPS HLS streams that play natively in a standard browser,
            with no special request headers required;
          </li>
          <li>
            channels that are active in the index and not blocked, mature-rated
            or flagged by the iptv-org maintainers.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="What we exclude">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            pay-TV, subscription-only or credentialed streams of any kind — we
            never index anything behind a login or a payment;
          </li>
          <li>
            pirated re-hosts, illegal IPTV resellers and streaming sites: the
            research catalog this project grew out of flags roughly 76% of its
            own listings as high copyright risk, and every one of those
            listings is excluded from PlayBeat TV;
          </li>
          <li>
            adult/NSFW content, and streams the upstream index has blocked or
            delisted;
          </li>
          <li>
            anything that requires circumvention — we do not touch geo-unlocking
            tools, header spoofing or DRM workarounds.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="No media hosting, ever">
        <p>
          We do not download, copy, store or re-transmit video. There is no
          PlayBeat TV server holding content — the player in your browser
          streams directly from each broadcaster&apos;s public servers. This
          is a structural choice, not just a policy: there is nothing on our
          infrastructure to take down except directory entries.
        </p>
      </LegalSection>

      <LegalSection title="Metadata and trademarks">
        <p>
          Channel names, logos and program artwork belong to their respective
          owners and are shown purely to identify the channels, in the same
          way a TV guide does. Brand presence in the catalog does not imply
          any affiliation with or endorsement by the broadcaster.
        </p>
      </LegalSection>

      <LegalSection title="Corrections and removal">
        <p>
          Rights holders can request removal through our{" "}
          <a href="/dmca" className="text-theme/90 underline-offset-2 hover:underline">
            DMCA &amp; Copyright
          </a>{" "}
          process. Anyone can report a broken, misplaced or inappropriate
          entry to{" "}
          <a
            href="mailto:playbeatdigital@gmail.com"
            className="text-theme/90 underline-offset-2 hover:underline"
          >
            playbeatdigital@gmail.com
          </a>{" "}
          or upstream at the{" "}
          <a
            href="https://github.com/iptv-org/iptv/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-theme/90 underline-offset-2 hover:underline"
          >
            iptv-org issue tracker
          </a>
          . Entries blocked upstream disappear from PlayBeat TV on the next
          data rebuild.
        </p>
      </LegalSection>
    </LegalPage>
    </>
  );
}
