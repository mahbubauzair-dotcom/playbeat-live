/* Monetag + Adsterra slot. Paste each network's snippet into the matching
   env var — the slot renders nothing (zero layout shift) until then.
   Env vars (all optional):
     NEXT_PUBLIC_AD_HEADER    — leaderboard under the header (hubs + home)
     NEXT_PUBLIC_AD_FOOTER    — above the footer
     NEXT_PUBLIC_AD_PLAYER    — below the VOD player page
   Values are full <script>/<ins> snippets copied from Monetag / Adsterra. */

const SLOTS = {
  header: process.env.NEXT_PUBLIC_AD_HEADER,
  footer: process.env.NEXT_PUBLIC_AD_FOOTER,
  player: process.env.NEXT_PUBLIC_AD_PLAYER,
} as const;

export type AdSlotName = keyof typeof SLOTS;

export function AdSlot({
  slot,
  className,
}: {
  slot: AdSlotName;
  className?: string;
}) {
  const code = SLOTS[slot];
  if (!code) return null;
  return (
    <div
      className={`w-full overflow-hidden text-center ${className ?? ""}`}
      data-ad-slot={slot}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
