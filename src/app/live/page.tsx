import { permanentRedirect } from "next/navigation";

/** Alias for /live-tv (kept for convenience and old links). */
export default function LiveAliasPage() {
  permanentRedirect("/live-tv");
}
