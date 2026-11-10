// OpenNext for Cloudflare — PlayBeat TV
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default config: the Worker serves SSR + static assets.
// Storefront ISR works via the default incremental cache per-isolate;
// swap in a KV/Durable-object cache later if cross-isolate ISR is needed.
export default defineCloudflareConfig({});
