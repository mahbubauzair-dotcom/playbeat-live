import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "You're offline — Playbeat Live",
  description:
    "Playbeat Live is unavailable right now because your device is offline.",
  robots: { index: false },
};

export default function OfflineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
