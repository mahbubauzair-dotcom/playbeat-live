import { permanentRedirect } from "next/navigation";

/** Alias for /privacy-policy (kept for convenience and old links). */
export default function PrivacyPolicyAliasPage() {
  permanentRedirect("/privacy-policy");
}
