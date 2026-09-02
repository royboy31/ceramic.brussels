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
      { slug: 'awards', label: 'tabs.awards' },
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
      { slug: 'press', label: 'tabs.press' },
      { slug: 'images', label: 'tabs.images' },
    ],
  },
};

/** Partner tab → partner tier(s) it lists. */
export const PARTNER_TABS: Record<string, string[]> = {
  main: ['main'],
  institutions: ['institutional', 'exhibition-pass', 'art-prize'],
  hotel: ['hotel'],
  event: ['event', 'supplier'],
  media: ['media'],
};

/** Path of a tab inside a hub, with the first tab collapsing onto the hub root. */
export function hubTabPath(route: string, tab?: string): string {
  const hub = HUBS[route];
  if (!hub || !tab || hub.tabs[0]?.slug === tab) return route;
  return `${route}/${tab}`;
}

/** Static paths for a hub's `[...tab]` route: one per locale per tab. */
export function hubTabParams(route: string, locales: readonly string[]) {
  const hub = HUBS[route];
  return locales.flatMap((lang) =>
    hub.tabs.map((tab, i) => ({ params: { lang, tab: i === 0 ? undefined : tab.slug } })),
  );
}

/** The `page` document that carries a tab's text, matched on its English slug. */
export function pageForTab(pages: any[], slug: string) {
  return pages.find((p) => p?.slugs?.en === slug) ?? null;
}
