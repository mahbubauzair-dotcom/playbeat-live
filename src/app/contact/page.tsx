import type { Metadata } from "next";
import { LEGAL_CONTACT_EMAIL, LegalPage, LegalSection } from "@/components/stream/legal";
import { pageMetadata, webPageJsonLd, SITE_NAME, SITE_URL } from "@/lib/seo";
import { JsonLd } from "@/components/stream/json-ld";

export const metadata: Metadata = pageMetadata({
  title: `Contact Us — ${SITE_NAME}`,
  description: `Get in touch with the ${SITE_NAME} team — broken channels, corrections, copyright notices, partnerships or general feedback. We read every message.`,
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={webPageJsonLd({
          path: `${SITE_URL}/contact`,
          name: `Contact Us — ${SITE_NAME}`,
          description: `Get in touch with the ${SITE_NAME} team — broken channels, corrections, copyright notices, partnerships or general feedback.`,
        })}
      />
      <LegalPage title="Contact Us">
        <LegalSection title="Email us">
          <p>
            The fastest way to reach the {SITE_NAME} team is by email. We read
            every message and usually reply within two business days.
          </p>
          <p>
            <a
              href={`mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent(SITE_NAME)}%20website%20contact`}
              className="text-theme/90 underline-offset-2 hover:underline"
            >
              {LEGAL_CONTACT_EMAIL}
            </a>
          </p>
        </LegalSection>

        <LegalSection title="What to contact us about">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Broken or mislabeled channels — tell us the channel name and
              country and we will fix the listing in the next catalog rebuild.
            </li>
            <li>
              Copyright or takedown requests — see our{" "}
              <a href="/dmca" className="text-theme/90 underline-offset-2 hover:underline">
                DMCA &amp; Copyright
              </a>{" "}
              page for the required notice format.
            </li>
            <li>
              Listing and content questions — see the{" "}
              <a href="/content-policy" className="text-theme/90 underline-offset-2 hover:underline">
                Content Policy
              </a>{" "}
              page.
            </li>
            <li>Partnerships, advertising and general feedback.</li>
          </ul>
        </LegalSection>

        <LegalSection title="Getting your message to the right team">
          <p>
            Rights holders: use the subject line &quot;DMCA takedown
            request&quot; and include the channel name, the URL of the listing
            on this site and proof of ownership. Everything else: just write to
            the email above and we will point you to the right person.
          </p>
        </LegalSection>

        <LegalSection title="A note on scams">
          <p>
            {SITE_NAME} is a free directory of publicly available free-to-air
            television streams. We do not sell subscriptions and we never ask
            for payment details — any message asking for money in our name is
            not from us.
          </p>
        </LegalSection>
      </LegalPage>
    </>
  );
}
