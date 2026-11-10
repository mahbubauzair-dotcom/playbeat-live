/* Client-safe metadata for the dedicated category discovery pages.
   Taglines/blurbs/hues per category id; art reuses the generated
   hero backdrops in /public/hero. No catalog import here. */

export interface CategoryPageMeta {
  tagline: string;
  blurb: string;
  hue: string; // tailwind gradient stops for the banner
  art?: string; // optional backdrop image
}

const META: Record<string, CategoryPageMeta> = {
  general: {
    tagline: "Everything, everywhere",
    blurb:
      "A mixed bag of general-interest channels covering news, entertainment and everyday television from around the world — the easiest place to channel-surf.",
    hue: "from-surface-2 via-surface-1 to-canvas",
  },
  news: {
    tagline: "The world, live",
    blurb:
      "Round-the-clock breaking news, market coverage and world affairs from broadcasters on every continent. When a story breaks, it breaks here first.",
    hue: "from-surface-2 via-surface-1 to-canvas",
    art: "/hero/hero-news.png",
  },
  religious: {
    tagline: "Faith & worship",
    blurb:
      "Services, devotionals, gospel music and faith-based teaching from channels of every tradition, streaming free and ungated.",
    hue: "from-surface-2 via-surface-1 to-canvas",
  },
  entertainment: {
    tagline: "Pure entertainment",
    blurb:
      "Talk shows, variety formats, celebrity programming and general entertainment — the channels people leave on all day.",
    hue: "from-surface-2 via-surface-1 to-canvas",
  },
  music: {
    tagline: "Non-stop music",
    blurb:
      "Music video loops, live concerts and genre stations from the '80s to today. Press play and turn it up — no playlist required.",
    hue: "from-surface-2 via-surface-1 to-canvas",
    art: "/hero/hero-music.png",
  },
  movies: {
    tagline: "Cinema, un-gated",
    blurb:
      "Free-to-air movie channels running classics, cult favorites and mainstream cinema around the clock. Popcorn optional.",
    hue: "from-surface-2 via-surface-1 to-canvas",
  },
  series: {
    tagline: "Binge the serial world",
    blurb:
      "Drama, telenovelas, sitcoms and serialized storytelling — dedicated series channels streaming live, no subscription and no account.",
    hue: "from-surface-2 via-surface-1 to-canvas",
  },
  sports: {
    tagline: "Live from the arena",
    blurb:
      "Match coverage, action sports and outdoor adventure from channels built for fans. The whistle never stops here.",
    hue: "from-surface-2 via-surface-1 to-canvas",
    art: "/hero/hero-sports.png",
  },
  kids: {
    tagline: "For the little ones",
    blurb:
      "Cartoons, educational shows and family-safe programming that parents can leave on without a second thought.",
    hue: "from-surface-2 via-surface-1 to-canvas",
  },
  animation: {
    tagline: "Anime & animated worlds",
    blurb:
      "Anime networks, classic cartoons and modern animation — drawn worlds that keep running twenty-four seven.",
    hue: "from-surface-2 via-surface-1 to-canvas",
  },
  legislative: {
    tagline: "Civic proceedings",
    blurb:
      "Parliaments, congresses and public-affairs sessions broadcast live — democracy, unedited.",
    hue: "from-surface-2 via-surface-1 to-canvas",
  },
  education: {
    tagline: "Learn something new",
    blurb:
      "Lectures, language courses and skill-building channels that turn the television into a classroom.",
    hue: "from-surface-2 via-surface-1 to-canvas",
  },
  culture: {
    tagline: "Arts & heritage",
    blurb:
      "Museums, performing arts and cultural programming from broadcasters preserving local heritage around the globe.",
    hue: "from-surface-2 via-surface-1 to-canvas",
  },
  documentary: {
    tagline: "The world, in focus",
    blurb:
      "Nature, history, science and human stories — documentary channels for the endlessly curious.",
    hue: "from-surface-2 via-surface-1 to-canvas",
    art: "/hero/hero-docs.png",
  },
  comedy: {
    tagline: "Laugh out loud",
    blurb:
      "Sitcom reruns, stand-up specials and sketch-comedy channels stuck on a permanent laugh track.",
    hue: "from-surface-2 via-surface-1 to-canvas",
  },
  lifestyle: {
    tagline: "Living well",
    blurb:
      "Home, fashion, wellness and reality formats that make everyday life feel a little more aspirational.",
    hue: "from-surface-2 via-surface-1 to-canvas",
  },
  classic: {
    tagline: "Golden-age television",
    blurb:
      "Vintage series, retro cinema and nostalgia channels keeping broadcast history alive, one rerun at a time.",
    hue: "from-surface-2 via-surface-1 to-canvas",
  },
  shop: {
    tagline: "Live retail",
    blurb:
      "Teleshopping and auction channels streaming deals around the clock — window shopping for the couch-bound.",
    hue: "from-surface-2 via-surface-1 to-canvas",
  },
  outdoor: {
    tagline: "Into the wild",
    blurb:
      "Hunting, fishing, hiking and adventure channels for people who would rather be outside right now.",
    hue: "from-surface-2 via-surface-1 to-canvas",
  },
  business: {
    tagline: "Markets & money",
    blurb:
      "Business news, market analysis and entrepreneurship from the world's financial broadcasters. The ticker never sleeps.",
    hue: "from-surface-2 via-surface-1 to-canvas",
    art: "/hero/hero-city.png",
  },
  cooking: {
    tagline: "Kitchen television",
    blurb:
      "Cook-along shows, chef competitions and food trails covering every cuisine on the map.",
    hue: "from-surface-2 via-surface-1 to-canvas",
    art: "/hero/hero-food.png",
  },
  travel: {
    tagline: "Departures everywhere",
    blurb:
      "Travel guides, destination documentaries and wanderlust programming for the permanently homesick-at-home.",
    hue: "from-surface-2 via-surface-1 to-canvas",
  },
  family: {
    tagline: "Together time",
    blurb:
      "All-ages programming designed for watching as a family — game shows, movies and gentle comedy.",
    hue: "from-surface-2 via-surface-1 to-canvas",
  },
  public: {
    tagline: "Public broadcasting",
    blurb:
      "Publicly funded channels delivering news, culture and civic programming as a public service.",
    hue: "from-neutral-900 via-[#17171a] to-[#0b0819]",
  },
  auto: {
    tagline: "Motoring TV",
    blurb:
      "Car shows, motorsport coverage and everything else that happens on four wheels.",
    hue: "from-surface-2 via-surface-1 to-canvas",
  },
  weather: {
    tagline: "Forecast, always",
    blurb:
      "Live weather channels and radar loops for planners, pilots and storm watchers.",
    hue: "from-surface-2 via-surface-1 to-canvas",
  },
  science: {
    tagline: "How the world works",
    blurb:
      "Science and discovery channels covering space, nature and the technology shaping tomorrow.",
    hue: "from-surface-2 via-surface-1 to-canvas",
  },
  relax: {
    tagline: "Slow television",
    blurb:
      "Ambient scenery, fireplace loops and calming visuals for background viewing while you do everything else.",
    hue: "from-surface-2 via-surface-1 to-canvas",
  },
};

const FALLBACK: CategoryPageMeta = {
  tagline: "Live, free and open",
  blurb:
    "Live free-to-air channels in this category, streamed straight to your browser.",
  hue: "from-surface-2 via-surface-1 to-canvas",
};

export function categoryPageMeta(categoryId: string): CategoryPageMeta {
  return META[categoryId] ?? FALLBACK;
}
