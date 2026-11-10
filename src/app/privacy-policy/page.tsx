import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/stream/legal";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/stream/json-ld";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy — Playbeat TV",
  description: "Read the Playbeat TV Privacy Policy to understand local browser preferences, hosting-related data handling and third-party streams.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd({
        path: `https://playbeattv.buzz/privacy-policy`,
        name: "Privacy Policy — Playbeat TV",
        description: "Read the Playbeat TV Privacy Policy to understand local browser preferences, hosting-related data handling and third-party streams.",
      })} />
      <LegalPage title="Privacy Policy">
      <LegalSection title="The short version">
        <p>
          PlayBeat TV has no accounts, no sign-up and no sign-in. We do not
          collect, store or share personal information, we do not use cookies
          or advertising identifiers, and we do not run analytics or tracking
          scripts. Your favorite channels and watch history never leave your
          device — they live only in your own browser&apos;s local storage.
        </p>
      </LegalSection>

      <LegalSection title="What we do not collect">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>No names, email addresses, phone numbers or payment details</li>
          <li>No account credentials — there is nothing to register for</li>
          <li>No analytics, telemetry, session recording or fingerprinting</li>
          <li>No advertising cookies, pixels or third-party ad networks</li>
          <li>No watch history on our servers — we could not see it if we tried</li>
        </ul>
      </LegalSection>

      <LegalSection title="What stays in your browser">
        <p>
          When you favorite a channel or watch something, PlayBeat TV stores
          those preferences locally in your browser using the{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-300">
            localStorage
          </code>{" "}
          API under keys prefixed with{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-300">
            playbeat:
          </code>
          . This data is accessible only to your own browser on your own
          device; it is never transmitted to us. Clearing your browser&apos;s
          site data removes it permanently. Because there is no account, we
          cannot recover it for you either.
        </p>
      </LegalSection>

      <LegalSection title="Third-party streams">
        <p>
          PlayBeat TV is a directory and player for publicly available
          free-to-air television. When you press play, your browser connects
          <strong className="text-zinc-300"> directly </strong> to the
          broadcaster&apos;s or the public index&apos;s streaming servers — we
          never proxy, transcode or relay the video. Those third parties may
          log your IP address and request details under their own privacy
          policies, exactly as they would if you visited their channels
          through any other player. We have no access to, and no control over,
          their logging.
        </p>
        <p>
          Channel names and logos shown in the catalog are served from the
          open-source{" "}
          <a
            href="https://github.com/iptv-org/iptv"
            target="_blank"
            rel="noopener noreferrer"
            className="text-theme/90 underline-offset-2 hover:underline"
          >
            iptv-org
          </a>{" "}
          index and the broadcasters&apos; public servers for identification
          purposes only.
        </p>
      </LegalSection>

      <LegalSection title="Hosting and server logs">
        <p>
          This website is hosted on Vercel Inc. Like any web host, Vercel
          processes standard request data (such as IP address, user agent and
          requested URL) to deliver pages, protect against abuse and comply
          with law. That data is governed by{" "}
          <a
            href="https://vercel.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-theme/90 underline-offset-2 hover:underline"
          >
            Vercel&apos;s privacy policy
          </a>
          , and PlayBeat TV does not use it to profile you.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          PlayBeat TV is a general-audience service and does not knowingly
          collect any personal information from anyone, including children
          under 13. Since no personal information is collected at all, none is
          stored from any age group.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          If this policy changes, the revised version will be posted on this
          page with a new &quot;Last updated&quot; date. Material changes that
          would affect what little data handling exists will be highlighted on
          the home page for a reasonable period.
        </p>
      </LegalSection>
    </LegalPage>
    </>
  );
}
