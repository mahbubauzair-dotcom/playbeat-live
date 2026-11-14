import type { Metadata } from "next";
import { AppShell } from "@/components/stream/app-shell";
import { CollectionSection } from "@/components/stream/collection-section";
import { shellStats } from "@/lib/shell-data";

export const metadata: Metadata = {
  title: "Collection — Playbeat Live",
  description:
    "Research browser for the 119-resource curated index behind Playbeat Live — with maintainer risk flags, availability checks and safe-playlist groupings.",
};

export default function CollectionPage() {
  return (
    <AppShell
      view="collection"
      {...shellStats()}
      collection={<CollectionSection />}
    />
  );
}
