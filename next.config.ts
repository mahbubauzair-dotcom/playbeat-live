import type { NextConfig } from "next";

/* Pages that must never be indexed: the VOD (movies / series) section, players,
 * APIs and utility pages. A header is used (not robots.txt) so crawlers can
 * still fetch the page and see the instruction. */
const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    return [
      "/movies", "/series", "/movie/:path*", "/series/:path*", "/watch/:path*",
      "/api/:path*", "/admin", "/offline", "/privacypol", "/privacypolicy",
    ].map((source) => ({ source, headers: noindex }));
  },
};

export default nextConfig;
