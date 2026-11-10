# ebuzz integration

Source: uzzirulzz-cyber/ebuzz app/data/channels-all.js blob 8dbcd13490e44197de59c13a9d0034a34f7fc05b. Parsed as JSON, never evaluated. Actual source has 19,679 entries; README's 20,048 count is stale.

Merged with playbeat-tv snapshot: 10,904 unique channel IDs, 182 countries, 209 sports channels. Duplicate IDs are normalized case-insensitively and source URLs combined. Only HTTPS HLS URLs retained; non-HLS/http/provider-page entries excluded from this browser catalog. Existing source categories used when matched; remaining entries use name-based classification. Added URLs have format validation, not current playback verification.

Frontend: studio-web/ deployed through playbeat-tv-web Worker. API: playbeat-tv-catalog Worker, versioned static data at cloudflare/assets/catalog.json. No media is hosted or proxied. All streams are requested directly from their upstream providers.

MagXTV repository src/App.tsx now reads this API and uses only sports-category entries with HLS playback. Live MagXTV deployment still requires access to its hosting account; its zone is not in the two connected Cloudflare accounts.
