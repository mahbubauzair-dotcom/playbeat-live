/* Client-safe stream helpers — NO static JSON import here.
   The heavy catalog is injected via props (server) or fetched from /api/catalog (client).
   Server-side access lives in lib/stream.server.ts. */

/* ---------- types ---------- */

export interface StreamSource {
  u: string;
  q: number; // numeric quality (0 = unknown)
}

export interface StreamChannel {
  id: string;
  name: string;
  country: string;
  flag: string;
  cats: string[];
  logo: string;
  srcs: StreamSource[];
}

export interface CountryMeta {
  code: string;
  name: string;
  flag: string;
}

export interface CategoryMeta {
  id: string;
  name: string;
}

export interface StreamCatalog {
  meta: {
    generatedAt: string;
    source: string;
    sourceUrl: string;
    api: string;
    criteria: string[];
    channels: number;
    countries: number;
    categories: number;
  };
  countries: CountryMeta[];
  categories: CategoryMeta[];
  channels: StreamChannel[];
}

/* ---------- pure helpers ---------- */

export function qualityLabel(ch: StreamChannel): string {
  const q = ch.srcs[0]?.q ?? 0;
  if (q >= 1080) return "1080p";
  if (q >= 720) return "HD";
  if (q >= 480) return "480p";
  if (q > 0) return `${q}p`;
  return "SD";
}

export interface ChannelQuery {
  q?: string;
  category?: string; // category id or "all"
  country?: string; // country code or "all"
  ids?: string[]; // explicit id list (favorites / recents)
}

export function filterChannels(
  channels: StreamChannel[],
  query: ChannelQuery
): StreamChannel[] {
  const q = query.q?.trim().toLowerCase() ?? "";
  const idSet = query.ids ? new Set(query.ids) : null;
  return channels.filter((c) => {
    if (idSet && !idSet.has(c.id)) return false;
    if (query.category && query.category !== "all" && !c.cats.includes(query.category))
      return false;
    if (query.country && query.country !== "all" && c.country !== query.country)
      return false;
    if (q && !c.name.toLowerCase().includes(q) && !c.id.toLowerCase().includes(q))
      return false;
    return true;
  });
}

/* ---------- viewer region (privacy-safe: browser timezone only) ----------
   Used to surface channels from the viewer's own country first — local
   free-to-air channels are the ones most likely to play in their region,
   since national broadcasters commonly geo-block viewers abroad. */

type Listener = () => void;

const TZ_TO_COUNTRY: Record<string, string> = {
  /* South & Central Asia */
  "Asia/Dhaka": "BD", "Asia/Karachi": "PK", "Asia/Kolkata": "IN",
  "Asia/Colombo": "LK", "Asia/Kathmandu": "NP", "Asia/Thimphu": "BT",
  "Asia/Kabul": "AF", "Asia/Tashkent": "UZ", "Asia/Almaty": "KZ",
  "Asia/Bishkek": "KG", "Asia/Dushanbe": "TJ", "Asia/Ashgabat": "TM",
  "Asia/Yangon": "MM",
  /* Middle East */
  "Asia/Dubai": "AE", "Asia/Riyadh": "SA", "Asia/Qatar": "QA",
  "Asia/Kuwait": "KW", "Asia/Bahrain": "BH", "Asia/Muscat": "OM",
  "Asia/Baghdad": "IQ", "Asia/Tehran": "IR", "Asia/Jerusalem": "IL",
  "Asia/Amman": "JO", "Asia/Beirut": "LB", "Asia/Damascus": "SY",
  "Europe/Istanbul": "TR", "Asia/Aden": "YE",
  /* East & SE Asia */
  "Asia/Singapore": "SG", "Asia/Kuala_Lumpur": "MY", "Asia/Jakarta": "ID",
  "Asia/Manila": "PH", "Asia/Bangkok": "TH", "Asia/Ho_Chi_Minh": "VN",
  "Asia/Phnom_Penh": "KH", "Asia/Vientiane": "LA",
  "Asia/Shanghai": "CN", "Asia/Hong_Kong": "HK", "Asia/Macau": "MO",
  "Asia/Taipei": "TW", "Asia/Seoul": "KR", "Asia/Tokyo": "JP",
  "Asia/Ulaanbaatar": "MN", "Asia/Hovd": "MN",
  /* Europe */
  "Europe/London": "GB", "Europe/Dublin": "IE", "Europe/Paris": "FR",
  "Europe/Berlin": "DE", "Europe/Madrid": "ES", "Europe/Lisbon": "PT",
  "Europe/Rome": "IT", "Europe/Amsterdam": "NL", "Europe/Brussels": "BE",
  "Europe/Vienna": "AT", "Europe/Zurich": "CH", "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO", "Europe/Copenhagen": "DK", "Europe/Helsinki": "FI",
  "Europe/Reykjavik": "IS", "Europe/Athens": "GR", "Europe/Kyiv": "UA",
  "Europe/Warsaw": "PL", "Europe/Prague": "CZ", "Europe/Budapest": "HU",
  "Europe/Bucharest": "RO", "Europe/Sofia": "BG", "Europe/Belgrade": "RS",
  "Europe/Zagreb": "HR", "Europe/Sarajevo": "BA", "Europe/Skopje": "MK",
  "Europe/Tirane": "AL", "Europe/Chisinau": "MD", "Europe/Minsk": "BY",
  "Europe/Moscow": "RU", "Europe/Riga": "LV", "Europe/Vilnius": "LT",
  "Europe/Tallinn": "EE", "Europe/Luxembourg": "LU", "Europe/Malta": "MT",
  "Europe/Nicosia": "CY", "Atlantic/Canary": "ES",
  /* Americas */
  "America/New_York": "US", "America/Detroit": "US", "America/Chicago": "US",
  "America/Denver": "US", "America/Phoenix": "US", "America/Los_Angeles": "US",
  "America/Anchorage": "US", "Pacific/Honolulu": "US", "America/Toronto": "CA",
  "America/Vancouver": "CA", "America/Edmonton": "CA", "America/Winnipeg": "CA",
  "America/Halifax": "CA", "America/St_Johns": "CA",
  "America/Mexico_City": "MX", "America/Bogota": "CO", "America/Lima": "PE",
  "America/Santiago": "CL", "America/Caracas": "VE", "America/Guayaquil": "EC",
  "America/La_Paz": "BO", "America/Montevideo": "UY", "America/Asuncion": "PY",
  "America/Guatemala": "GT", "America/Havana": "CU", "America/Santo_Domingo": "DO",
  "America/San_Juan": "PR", "America/Panama": "PA", "America/Costa_Rica": "CR",
  "America/Sao_Paulo": "BR", "America/Recife": "BR", "America/Manaus": "BR",
  "America/Argentina/Buenos_Aires": "AR",
  /* Africa */
  "Africa/Lagos": "NG", "Africa/Cairo": "EG", "Africa/Nairobi": "KE",
  "Africa/Accra": "GH", "Africa/Johannesburg": "ZA", "Africa/Casablanca": "MA",
  "Africa/Addis_Ababa": "ET", "Africa/Dar_es_Salaam": "TZ",
  "Africa/Kampala": "UG", "Africa/Algiers": "DZ", "Africa/Tunis": "TN",
  "Africa/Kinshasa": "CD", "Africa/Khartoum": "SD", "Africa/Abidjan": "CI",
  "Africa/Dakar": "SN", "Africa/Harare": "ZW", "Africa/Lusaka": "ZM",
  /* Oceania */
  "Australia/Sydney": "AU", "Australia/Melbourne": "AU",
  "Australia/Brisbane": "AU", "Australia/Perth": "AU",
  "Australia/Adelaide": "AU", "Pacific/Auckland": "NZ", "Pacific/Fiji": "FJ",
};

let viewerCountryCache: string | null | undefined;
const regionListeners = new Set<Listener>();

function computeViewerCountry(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return (tz && TZ_TO_COUNTRY[tz]) || null;
  } catch {
    return null;
  }
}

/** Hydration-safe snapshot: null during SSR + first (hydrating) render. */
export function getViewerCountrySnapshot(): string | null {
  return viewerCountryCache === undefined ? null : viewerCountryCache;
}

export function getViewerCountryServerSnapshot(): string | null {
  return null;
}

export function subscribeViewerCountry(cb: Listener): () => void {
  if (viewerCountryCache === undefined) {
    viewerCountryCache = computeViewerCountry();
  }
  regionListeners.add(cb);
  return () => {
    regionListeners.delete(cb);
  };
}

/** Stable reorder: channels from the viewer's country first. Pure fn. */
export function regionBoost<T extends StreamChannel>(
  list: T[],
  country: string | null
): T[] {
  if (!country) return list;
  return [...list].sort(
    (a, b) => Number(b.country === country) - Number(a.country === country)
  );
}

/* ---------- favorites / recents (localStorage-backed external store) ----------
   Implemented as a tiny external store so components can consume it via
   useSyncExternalStore — no setState-in-effect hydration patterns. */

const FAV_KEY = "playbeat:favorites";
const RECENT_KEY = "playbeat:recents";
/* Pre-rebrand keys — migrated once so returning visitors keep their list. */
const LEGACY_FAV_KEY = "openstream:favorites";
const LEGACY_RECENT_KEY = "openstream:recents";
const MAX_RECENTS = 12;

export interface RecentEntry {
  id: string;
  at: number;
}

function createStore<T>(key: string, initial: T) {
  let cache: T = initial;
  let hydrated = false;
  const listeners = new Set<Listener>();

  function hydrate() {
    if (hydrated || typeof window === "undefined") return;
    hydrated = true;
    try {
      let raw = window.localStorage.getItem(key);
      if (!raw) {
        const legacyKey = key === FAV_KEY ? LEGACY_FAV_KEY : LEGACY_RECENT_KEY;
        const legacy = window.localStorage.getItem(legacyKey);
        if (legacy) {
          raw = legacy;
          try {
            window.localStorage.setItem(key, legacy);
            window.localStorage.removeItem(legacyKey);
          } catch {
            /* migration is best-effort */
          }
        }
      }
      if (raw) cache = JSON.parse(raw) as T;
    } catch {
      /* keep initial */
    }
  }

  return {
    subscribe(cb: Listener): () => void {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    get(): T {
      hydrate();
      return cache;
    },
    set(next: T) {
      cache = next;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      listeners.forEach((l) => l());
    },
  };
}

export const favoritesStore = createStore<string[]>(FAV_KEY, []);
export const recentsStore = createStore<RecentEntry[]>(RECENT_KEY, []);

const EMPTY_FAVORITES: string[] = [];
const EMPTY_RECENTS: RecentEntry[] = [];

export function getFavoritesSnapshot(): string[] {
  return favoritesStore.get();
}

export function getFavoritesServerSnapshot(): string[] {
  return EMPTY_FAVORITES;
}

export function subscribeFavorites(cb: Listener): () => void {
  return favoritesStore.subscribe(cb);
}

export function toggleFavorite(id: string): void {
  const cur = favoritesStore.get();
  favoritesStore.set(cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur]);
}

export function getRecentsSnapshot(): RecentEntry[] {
  return recentsStore.get();
}

export function getRecentsServerSnapshot(): RecentEntry[] {
  return EMPTY_RECENTS;
}

export function subscribeRecents(cb: Listener): () => void {
  return recentsStore.subscribe(cb);
}

export function pushRecent(id: string): void {
  const cur = recentsStore.get().filter((r) => r.id !== id);
  recentsStore.set([{ id, at: Date.now() }, ...cur].slice(0, MAX_RECENTS));
}
