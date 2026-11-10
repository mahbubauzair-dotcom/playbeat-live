/* Server component: the About & content-policy content shown on /about. */
import { Separator } from "@/components/ui/separator";
import { catalog } from "@/lib/stream.server";
import {
  CheckCircle2,
  Radio,
  ScrollText,
  ShieldCheck,
} from "lucide-react";

export function AboutSection({
  channels,
  generatedAt,
}: {
  channels: number;
  generatedAt: string;
}) {
  return (
    <section aria-label="About and content policy" className="mx-auto max-w-3xl space-y-6 pb-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        About Playbeat TV
      </h1>
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-100">
          <ScrollText className="size-5 text-theme" />
          What is Playbeat TV?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Playbeat TV is a free, open streaming guide: a player and directory
          for publicly available free-to-air television. Every channel comes
          from{" "}
          <a
            href={catalog.meta.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-theme/90 underline-offset-2 hover:underline"
          >
            iptv-org
          </a>
          , an open-source community index of publicly available free-to-air
          television channels, so what you watch here is the same signal any
          viewer with an antenna or IPTV app could receive — simply presented
          in the browser with no apps, accounts or fees.
        </p>
      </div>

      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-100">
          <ShieldCheck className="size-5 text-emerald-400" />
          Content policy
        </h2>
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-zinc-400">
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <span>
              <strong className="text-zinc-300">Only open, declared-safe sources.</strong>{" "}
              Channels come from the iptv-org index ({channels.toLocaleString()}{" "}
              playable entries as of {generatedAt}). Only channels from the
              public free-to-air index are included — no streaming sites, no
              pirated media.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <span>
              <strong className="text-zinc-300">Browser-playable only.</strong> Only HTTPS
              HLS (.m3u8) streams that play natively in a browser are indexed —
              no stream requiring special headers, and NSFW channels and streams
              the iptv-org maintainers have blocked are excluded.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <span>
              <strong className="text-zinc-300">No login, no tracking, no ads.</strong>{" "}
              Favorites and watch history live only in your browser&apos;s local
              storage. There is no account system and no analytics.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <span>
              <strong className="text-zinc-300">No media hosting.</strong> This app is a
              player and directory. All streams are served by third parties;
              nothing is downloaded, stored, or re-hosted here.
            </span>
          </li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Read the full{" "}
          <a href="/content-policy" className="text-theme/90 underline-offset-2 hover:underline">
            Content Policy
          </a>
          ,{" "}
          <a href="/privacy-policy" className="text-theme/90 underline-offset-2 hover:underline">
            Privacy Policy
          </a>
          ,{" "}
          <a href="/terms" className="text-theme/90 underline-offset-2 hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/dmca" className="text-theme/90 underline-offset-2 hover:underline">
            DMCA / Copyright
          </a>{" "}
          pages for details.
        </p>
      </div>

      <Separator className="bg-zinc-800" />

      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-100">
          <Radio className="size-5 text-zinc-400" />
          Availability &amp; copyright notes
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Public free-to-air streams frequently go offline, throttle, or apply
          geo-restrictions. When a signal fails, the player offers retry,
          alternate source, and the direct stream link. &quot;Copyright-risk-free&quot;
          reflects iptv-org&apos;s public-index policy — it is not a legal
          guarantee, and
          broadcast rights differ by country. If you believe a stream indexed by
          iptv-org infringes your rights, report it via the{" "}
          <a
            href="https://github.com/iptv-org/iptv/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-theme/90 underline-offset-2 hover:underline"
          >
            iptv-org issue tracker
          </a>{" "}
          or our{" "}
          <a href="/dmca" className="text-theme/90 underline-offset-2 hover:underline">
            DMCA page
          </a>
          ; blocked entries disappear from this catalog on the next data rebuild.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-bold text-zinc-100">Credits</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          <a
            href={catalog.meta.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-theme/90 underline-offset-2 hover:underline"
          >
            iptv-org
          </a>{" "}
          — channel &amp; stream data ·{" "}
          <a
            href="https://github.com/video-dev/hls.js"
            target="_blank"
            rel="noopener noreferrer"
            className="text-theme/90 underline-offset-2 hover:underline"
          >
            hls.js
          </a>{" "}
          — adaptive streaming playback · built with Next.js.
        </p>
      </div>
    </section>
  );
}
