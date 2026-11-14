/* Server components: shared layout for all legal/static pages. */
import { AppShell } from "@/components/stream/app-shell";
import { shellStats } from "@/lib/shell-data";

export const LEGAL_CONTACT_EMAIL = "playbeatdigital@gmail.com";
export const LEGAL_UPDATED = "October 14, 2026";

export function LegalPage({
  title,
  updated = LEGAL_UPDATED,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <AppShell view="legal" {...shellStats()}>
      <article className="mx-auto max-w-3xl px-3 py-6 pb-12 sm:px-5">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-theme/80">
          Playbeat Live · Legal
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-xs text-zinc-500">Last updated: {updated}</p>
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-zinc-400">
          {children}
        </div>
        <div className="mt-12 rounded-2xl border border-white/5 bg-white/[0.03] p-5">
          <p className="text-xs leading-relaxed text-zinc-500">
            Questions about this page? Contact us at{" "}
            <a
              href={`mailto:${LEGAL_CONTACT_EMAIL}`}
              className="text-theme/90 underline-offset-2 hover:underline"
            >
              {LEGAL_CONTACT_EMAIL}
            </a>
            . See also our{" "}
            <a href="/about" className="text-theme/90 underline-offset-2 hover:underline">
              About
            </a>{" "}
            and{" "}
            <a href="/content-policy" className="text-theme/90 underline-offset-2 hover:underline">
              Content Policy
            </a>{" "}
            pages.
          </p>
        </div>
      </article>
    </AppShell>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-bold text-zinc-100">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}
