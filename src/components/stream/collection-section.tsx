/* Server component: the curated 119-resource collection browser on /collection. */
import { Badge } from "@/components/ui/badge";
import { CollectionPanel } from "@/components/collection/collection-panel";
import { meta } from "@/lib/collection";
import { Database } from "lucide-react";

export function CollectionSection() {
  const availabilityDate = meta.availabilityGeneratedAt.slice(0, 10);

  return (
    <section aria-label="Curated collection browser" className="flex-1">
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className="border-zinc-800 bg-zinc-900/60 font-mono text-zinc-400"
        >
          {meta.total} resources
        </Badge>
        <Badge
          variant="outline"
          className="border-zinc-800 bg-zinc-900/60 font-mono text-zinc-400"
        >
          {Object.keys(meta.categoryCounts).length} categories
        </Badge>
        <Badge
          variant="outline"
          className="border-zinc-800 bg-zinc-900/60 font-mono text-zinc-400"
        >
          <Database className="size-3" />
          List updated {meta.resourcesUpdatedAt}
        </Badge>
        <Badge
          variant="outline"
          className="border-zinc-800 bg-zinc-900/60 font-mono text-zinc-400"
        >
          Availability checked {availabilityDate}
        </Badge>
        <Badge
          variant="outline"
          className="border-zinc-800 bg-zinc-900/60 text-zinc-500"
        >
          {meta.license}
        </Badge>
      </div>
      <CollectionPanel />
    </section>
  );
}
