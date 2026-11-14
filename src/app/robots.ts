import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/* Dynamic robots.txt — Sitemap URL always derives from SITE_URL so the
   canonical host stays consistent (never a hardcoded domain). The /api and
   /admin surfaces are management-only and stay out of search. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
