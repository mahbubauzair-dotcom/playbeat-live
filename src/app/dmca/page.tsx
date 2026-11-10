import type { Metadata } from "next";
import { LEGAL_CONTACT_EMAIL, LegalPage, LegalSection } from "@/components/stream/legal";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/stream/json-ld";

export const metadata: Metadata = pageMetadata({
  title: "DMCA & Copyright Policy — Playbeat TV",
  description: "Learn how copyright owners can report concerns about television channels listed in the Playbeat TV directory.",
  path: "/dmca",
});

export default function DmcaPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd({
        path: `https://playbeattv.buzz/dmca`,
        name: "DMCA & Copyright Policy — Playbeat TV",
        description: "Learn how copyright owners can report concerns about television channels listed in the Playbeat TV directory.",
      })} />
      <LegalPage title="DMCA &amp; Copyright Policy">
      <LegalSection title="Our role">
        <p>
          PlayBeat TV is a directory and player — not a host. We do not
          upload, store, cache, transcode or re-transmit any video or audio.
          Every channel listed here is a publicly available, free-to-air
          stream indexed by the open-source{" "}
          <a
            href="https://github.com/iptv-org/iptv"
            target="_blank"
            rel="noopener noreferrer"
            className="text-theme/90 underline-offset-2 hover:underline"
          >
            iptv-org
          </a>{" "}
          project. When you press play, your browser connects directly to the
          third-party server that publishes that stream. If a stream is removed
          at its source, it stops working here automatically on the next
          catalog rebuild.
        </p>
      </LegalSection>

      <LegalSection title="How to report infringement">
        <p>
          If you are a rights holder (or an authorized agent) and believe a
          channel indexed by PlayBeat TV infringes your copyright, send a
          notice to{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}?subject=DMCA%20takedown%20request`}
            className="text-theme/90 underline-offset-2 hover:underline"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>{" "}
          with the subject line &quot;DMCA takedown request&quot;. To be
          actionable, your notice should include:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            identification of the copyrighted work you claim has been
            infringed;
          </li>
          <li>
            the exact channel name as shown on PlayBeat TV, and the page URL
            or deep link where it appears (for example{" "}
            <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-300">
              /live-tv#watch=&lt;channel-id&gt;
            </code>
            );
          </li>
          <li>
            the URL of the underlying stream, if you know it (you can usually
            find it via the &quot;Copy stream link&quot; button in our player);
          </li>
          <li>
            your full name, mailing address, telephone number and email
            address;
          </li>
          <li>
            a statement that you have a good-faith belief that the use is not
            authorized by the copyright owner, its agent, or the law;
          </li>
          <li>
            a statement, under penalty of perjury, that the information in
            your notice is accurate and that you are the copyright owner or
            authorized to act on their behalf; and
          </li>
          <li>your physical or electronic signature.</li>
        </ul>
      </LegalSection>

      <LegalSection title="What we will do">
        <p>
          For valid, complete notices we will remove or disable the reported
          channel from the PlayBeat TV catalog, normally within{" "}
          <strong className="text-zinc-300">five business days</strong> of
          receipt. Because our catalog is generated data, removal also flows
          into every subsequent rebuild so the channel does not silently
          return. We may also report the stream to the iptv-org maintainers,
          who maintain the upstream public blocklist.
        </p>
      </LegalSection>

      <LegalSection title="Repeat sources">
        <p>
          Streams or stream publishers that are subject to repeated valid
          takedown notices are removed from our build pipeline permanently,
          regardless of whether individual instances reappear in the upstream
          index.
        </p>
      </LegalSection>

      <LegalSection title="Counter-notification">
        <p>
          If you believe a channel was removed as a result of a mistake or
          misidentification, you may send a counter-notice to the same email
          address with the subject &quot;DMCA counter-notice&quot;,
          identifying the removed channel and explaining why you believe it
          was wrongly removed, together with your contact details and a
          statement under penalty of perjury that you have a good-faith belief
          it was removed in error. We will review counter-notices on a
          case-by-case basis and may restore entries where appropriate.
        </p>
      </LegalSection>

      <LegalSection title="Abuse of this process">
        <p>
          Please note that under Section 512(f) of the DMCA, any person who
          knowingly materially misrepresents that material is infringing — or
          that material was removed by mistake — may be liable for damages,
          including costs and attorneys&apos; fees. Submit only reports made
          in good faith.
        </p>
      </LegalSection>
    </LegalPage>
    </>
  );
}
