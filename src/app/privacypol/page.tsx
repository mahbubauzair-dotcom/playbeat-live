import { permanentRedirect } from "next/navigation";

/** Alias for /privacy-policy (short form kept for convenience). */
export default function PrivacyPolAliasPage() {
  permanentRedirect("/privacy-policy");
}
