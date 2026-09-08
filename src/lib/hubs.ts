import type { StringKey } from './i18n';

/**
 * The hub pages of the site and their pill tabs, as laid out in the Figma
 * design. A hub lives at `/[lang]/<route>`; its first tab is the hub itself
 * and every other tab is `/[lang]/<route>/<tab>`.
 *
 * Tab slugs are stable English identifiers shared by the routes, the
 * navigation `anchor` field in Sanity, and the `slug.en` of the `page`
 * document that carries a tab's text. Labels come from STRINGS so they are
 * translated with the build; an editor can override a label through the
 * page's `tabLabel`.
 */
export interface HubTab {
  slug: string;
  label: StringKey;
  /**
   * A pill that leads to another hub instead of to a page of this one: the
   * programme's "awards" goes to the art prize awards, the about hub's
   * "partners" to the partners hub, as the design draws them. No route is
   * generated for a link tab and it is never the active one.
   */
  link?: { route: string; tab?: string };
}

export interface Hub {
  route: string;
  title: StringKey;
  tabs: HubTab[];
}

export const HUBS: Record<string, Hub> = {
  'guest-of-honour': {
    route: 'guest-of-honour',
    title: 'nav.guestOfHonour',
    tabs: [
      { slug: 'about', label: 'tabs.about' },
      { slug: 'interview', label: 'tabs.interview' },
    ],
  },
  'art-prize': {
    route: 'art-prize',
    title: 'nav.artPrize',
    tabs: [
      { slug: 'about', label: 'tabs.about' },
      { slug: 'laureates', label: 'tabs.laureates' },
      { slug: 'awards', label: 'tabs.awards' },
      { slug: 'jury', label: 'tabs.jury' },
    ],
  },
  programme: {
    route: 'programme',
    title: 'nav.programme',
    tabs: [
      { slug: 'la-cambre', label: 'tabs.laCambre' },
      { slug: 'talks', label: 'tabs.talks' },
      { slug: 'awards', label: 'tabs.awards', link: { route: 'art-prize', tab: 'awards' } },
      { slug: 'vip', label: 'tabs.vip' },
    ],
  },
  partners: {
    route: 'partners',
    title: 'nav.partners',
    tabs: [
      { slug: 'main', label: 'tabs.mainPartner' },
      { slug: 'institutions', label: 'tabs.institutions' },
      { slug: 'hotel', label: 'tabs.hotel' },
      { slug: 'event', label: 'tabs.eventPartners' },
      { slug: 'media', label: 'tabs.media' },
    ],
  },
  visit: {
    route: 'visit',
    title: 'nav.visit',
    tabs: [
      { slug: 'practical-info', label: 'tabs.practicalInfo' },
      { slug: 'food-drinks', label: 'tabs.foodDrinks' },
      { slug: 'floor-plan', label: 'tabs.floorPlan' },
      { slug: 'faq', label: 'tabs.faq' },
    ],
  },
  about: {
    route: 'about',
    title: 'nav.about',
    tabs: [
      { slug: 'the-fair', label: 'tabs.theFair' },
      { slug: 'advisory-board', label: 'tabs.advisoryBoard' },
      { slug: 'team', label: 'tabs.team' },
      { slug: 'partners', label: 'tabs.partners', link: { route: 'partners' } },
      { slug: 'press', label: 'tabs.press' },
      { slug: 'images', label: 'tabs.images' },
    ],
  },
};

/** Partner tab → partner tier(s) it lists. */
export const PARTNER_TABS: Record<string, string[]> = {
  main: ['main'],
  // The design's institutions tab lists the institutional tier alone.
  institutions: ['institutional'],
  hotel: ['hotel'],
  event: ['event', 'supplier', 'exhibition-pass'],
  media: ['media'],
};

/** Path of a tab inside a hub, with the first tab collapsing onto the hub root. */
export function hubTabPath(route: string, tab?: string): string {
  const hub = HUBS[route];
  if (!hub || !tab || hub.tabs[0]?.slug === tab) return route;
  return `${route}/${tab}`;
}

/** Where a tab's pill points: its own page, or, for a link tab, the other hub. */
export function hubTabHref(route: string, tab: HubTab): string {
  return tab.link ? hubTabPath(tab.link.route, tab.link.tab) : hubTabPath(route, tab.slug);
}

/** Static paths for a hub's `[...tab]` route: one per locale per tab. Link tabs have none. */
export function hubTabParams(route: string, locales: readonly string[]) {
  const hub = HUBS[route];
  const own = hub.tabs.filter((tab) => !tab.link);
  return locales.flatMap((lang) =>
    own.map((tab, i) => ({ params: { lang, tab: i === 0 ? undefined : tab.slug } })),
  );
}

/** The `page` document that carries a tab's text, matched on its English slug. */
export function pageForTab(pages: any[], slug: string) {
  return pages.find((p) => p?.slugs?.en === slug) ?? null;
}
