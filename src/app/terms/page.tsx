import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/stream/legal";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/stream/json-ld";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service — Playbeat Live",
  description: "Review the Playbeat Live Terms of Service, acceptable-use conditions, third-party broadcasting policies and service limitations.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd({
        path: `https://playbeat.live/terms`,
        name: "Terms of Service — Playbeat Live",
        description: "Review the Playbeat Live Terms of Service, acceptable-use conditions, third-party broadcasting policies and service limitations.",
      })} />
      <LegalPage title="Terms of Service">
      <LegalSection title="1. Acceptance">
        <p>
          By accessing or using Playbeat Live (the &quot;Service&quot;), you
          agree to these Terms of Service. If you do not agree with any part
          of them, please do not use the Service. The Service is provided free
          of charge, requires no account, and is intended for personal,
          non-commercial use.
        </p>
      </LegalSection>

      <LegalSection title="2. What the Service is">
        <p>
          Playbeat Live is a searchable directory and player front-end for
          publicly available, free-to-air television channels indexed by the
          open-source{" "}
          <a
            href="https://github.com/iptv-org/iptv"
            target="_blank"
            rel="noopener noreferrer"
            className="text-theme/90 underline-offset-2 hover:underline"
          >
            iptv-org
          </a>{" "}
          project. We do not own, operate, upload, store, or control any
          video stream. When you select a channel, your browser connects
          directly to a third-party streaming server; we act solely as a
          convenient remote control.
        </p>
      </LegalSection>

      <LegalSection title="3. Third-party content">
        <p>
          All channels, streams, logos and trademarks belong to their
          respective owners. We make no representations about the ownership,
          licensing, legality, availability or quality of any third-party
          stream. Your use of any channel may additionally be governed by the
          broadcaster&apos;s own terms. If you believe a channel listed here
          infringes your rights, see our{" "}
          <a href="/dmca" className="text-theme/90 underline-offset-2 hover:underline">
            DMCA &amp; Copyright
          </a>{" "}
          page — we will remove reported channels from the catalog.
        </p>
      </LegalSection>

      <LegalSection title="4. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            use the Service for any unlawful purpose or to view content you are
            not legally permitted to view in your jurisdiction;
          </li>
          <li>
            attempt to access paywalled, private or credentialed streams
            through the Service — none are indexed, and circumvention attempts
            are prohibited;
          </li>
          <li>
            scrape, overload, or disrupt the Service, or use automated tooling
            in a way that degrades it for others;
          </li>
          <li>
            misrepresent the Service as being affiliated with, endorsed by, or
            operated by any broadcaster; or
          </li>
          <li>
            re-host, resell or rebrand the Service or its catalog as your own
            product without complying with the underlying open-source licenses.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Availability">
        <p>
          The Service is provided &quot;as is&quot; and &quot;as
          available&quot;. Free-to-air streams frequently go offline, change
          address, throttle, or apply geographic restrictions — often without
          warning. We do not guarantee that any particular channel will be
          available at any particular time or place, and channels may be
          removed from the catalog at any time, including in response to
          rights-holder reports.
        </p>
      </LegalSection>

      <LegalSection title="6. Disclaimer of warranties and limitation of liability">
        <p>
          To the maximum extent permitted by law, the Service is provided
          without warranties of any kind, express or implied, including
          merchantability, fitness for a particular purpose and
          non-infringement. To the maximum extent permitted by law, PlayBeat
          TV and its operators will not be liable for any indirect,
          incidental, special, consequential or punitive damages, or for any
          loss of data, profits or enjoyment arising from your use of — or
          inability to use — the Service or any third-party stream accessed
          through it.
        </p>
      </LegalSection>

      <LegalSection title="7. Intellectual property">
        <p>
          The Service&apos;s own source code is open source and published on
          GitHub. Catalog data is provided by iptv-org under its own open
          terms. Channel names, logos and broadcasts remain the property of
          their respective owners, and nothing in the Service transfers any
          ownership or licensed broadcast rights to you.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes and termination">
        <p>
          We may modify, suspend or discontinue any part of the Service at any
          time, and may update these Terms from time to time by posting a new
          version on this page with an updated date. Continued use after
          changes are posted constitutes acceptance of the revised Terms.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact">
        <p>
          Questions about these Terms? Email{" "}
          <a
            href="mailto:playbeatdigital@gmail.com"
            className="text-theme/90 underline-offset-2 hover:underline"
          >
            playbeatdigital@gmail.com
          </a>
          . These Terms are provided for the Service only and do not
          constitute legal advice.
        </p>
      </LegalSection>
    </LegalPage>
    </>
  );
}
