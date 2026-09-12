import type { StringKey } from './i18n';
import { DEFAULT_LOCALE, LOCALE_IDS, type LocaleId } from './locales';

/**
 * The hub pages of the site and their pill tabs, as laid out in the Figma
 * design. A hub lives at `/[lang]/<segment>`; its first tab is the hub itself
 * and every other tab is `/[lang]/<segment>/<tab segment>`.
 *
 * **`slug` and `route` are identifiers, `segment` is the URL.** The English
 * identifiers are shared by three things - the Sanity navigation `anchor`
 * field, the `slug.en` of the `page` document carrying a tab's text (see
 * `pageForTab`), and the internal keys used throughout the code - so they
 * must stay put. `segment` is the only thing a visitor sees, and it is
 * translated, which is what gives French and Dutch real URLs
 * (`/fr/a-propos/equipe`, not `/fr/about/team`) without a content migration.
 *
 * **Where a segment comes from.** If the live ceramic.brussels already has a
 * translated address for that page, it is kept verbatim, so the old URL and
 * the new one agree and the 301 stays one hop: `invitee-d-honneur`,
 * `infos-pratiques`, `partenaires`, `partenaire-principal`, `equipe`,
 * `comite-strategique`, `laureat-es`, `institutions`/`instellingen`,
 * `hoofdpartner`, `programma`, `entretien`. Where the live site never
 * translated one - it left `art-prize`, `media`, `photos`, `faq` and every
 * Dutch page in English - the segment is taken from the tab label in
 * `i18n.ts`, so the URL says what the pill said. Nothing else is invented,
 * and a missing segment falls back to the English identifier, so adding a
 * tab cannot break a build.
 *
 * Labels come from STRINGS so they are translated with the build; an editor
 * can override a label through the page's `tabLabel`.
 */
export type Segment = Partial<Record<LocaleId, string>>;

export interface HubTab {
  /** Stable English identifier: Sanity `anchor`, `page.slug.en`, internal keys. */
  slug: string;
  /** What the URL says, per locale. Falls back to `slug`. */
  segment?: Segment;
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
  /** Stable English identifier for the hub. */
  route: string;
  /** What the URL says, per locale. Falls back to `route`. */
  segment?: Segment;
  title: StringKey;
  tabs: HubTab[];
}

export const HUBS: Record<string, Hub> = {
  'guest-of-honour': {
    route: 'guest-of-honour',
    // The old site used "invitee-d-honneur"; kept, so its 301s stay one hop.
    segment: { fr: 'invitee-d-honneur', nl: 'eregast' },
    title: 'nav.guestOfHonour',
    tabs: [
      { slug: 'about', segment: { fr: 'a-propos', nl: 'over' }, label: 'tabs.about' },
      { slug: 'interview', segment: { fr: 'entretien' }, label: 'tabs.interview' },
    ],
  },
  'art-prize': {
    route: 'art-prize',
    // Not the bare label "prix"/"prijs": the hub has an "awards" tab whose
    // label is also "prix", and /fr/prix/prix reads as a mistake.
    segment: { fr: 'prix-art', nl: 'kunstprijs' },
    title: 'nav.artPrize',
    tabs: [
      { slug: 'about', segment: { fr: 'a-propos', nl: 'over' }, label: 'tabs.about' },
      { slug: 'laureates', segment: { fr: 'laureat-es', nl: 'laureaten' }, label: 'tabs.laureates' },
      { slug: 'awards', segment: { fr: 'prix', nl: 'prijzen' }, label: 'tabs.awards' },
      { slug: 'jury', label: 'tabs.jury' },
    ],
  },
  programme: {
    route: 'programme',
    segment: { nl: 'programma' },
    title: 'nav.programme',
    tabs: [
      { slug: 'la-cambre', label: 'tabs.laCambre' },
      { slug: 'talks', segment: { fr: 'conferences' }, label: 'tabs.talks' },
      { slug: 'awards', label: 'tabs.awards', link: { route: 'art-prize', tab: 'awards' } },
      { slug: 'vip', label: 'tabs.vip' },
    ],
  },
  partners: {
    route: 'partners',
    segment: { fr: 'partenaires' },
    title: 'nav.partners',
    tabs: [
      { slug: 'main', segment: { fr: 'partenaire-principal', nl: 'hoofdpartner' }, label: 'tabs.mainPartner' },
      { slug: 'institutions', segment: { nl: 'instellingen' }, label: 'tabs.institutions' },
      { slug: 'hotel', label: 'tabs.hotel' },
      { slug: 'event', segment: { fr: 'partenaires-evenement', nl: 'eventpartners' }, label: 'tabs.eventPartners' },
      { slug: 'media', label: 'tabs.media' },
    ],
  },
  visit: {
    route: 'visit',
    // The old site's own French address for this page.
    segment: { fr: 'infos-pratiques', nl: 'praktische-info' },
    title: 'nav.visit',
    tabs: [
      { slug: 'practical-info', segment: { fr: 'infos-pratiques', nl: 'praktische-info' }, label: 'tabs.practicalInfo' },
      // "food & drinks" is the label in all three locales; the URL follows it.
      { slug: 'food-drinks', label: 'tabs.foodDrinks' },
      { slug: 'floor-plan', segment: { fr: 'plan', nl: 'plattegrond' }, label: 'tabs.floorPlan' },
      { slug: 'faq', label: 'tabs.faq' },
    ],
  },
  about: {
    route: 'about',
    segment: { fr: 'a-propos', nl: 'over' },
    title: 'nav.about',
    tabs: [
      { slug: 'the-fair', label: 'tabs.theFair' },
      { slug: 'advisory-board', segment: { fr: 'comite-strategique', nl: 'adviesraad' }, label: 'tabs.advisoryBoard' },
      { slug: 'team', segment: { fr: 'equipe' }, label: 'tabs.team' },
      { slug: 'partners', label: 'tabs.partners', link: { route: 'partners' } },
      { slug: 'press', segment: { fr: 'presse', nl: 'pers' }, label: 'tabs.press' },
      { slug: 'images', segment: { nl: 'beelden' }, label: 'tabs.images' },
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

/* ------------------------------------------------------------ segments */

/** The URL segment for a hub in one language; the identifier if untranslated. */
export function hubSegment(route: string, lang: LocaleId = DEFAULT_LOCALE): string {
  const hub = HUBS[route];
  return hub?.segment?.[lang] ?? hub?.route ?? route;
}

/** The URL segment for a tab in one language; the identifier if untranslated. */
export function tabSegment(route: string, tab: string, lang: LocaleId = DEFAULT_LOCALE): string {
  const found = HUBS[route]?.tabs.find((x) => x.slug === tab);
  return found?.segment?.[lang] ?? found?.slug ?? tab;
}

/** Hub identifier for a URL segment in one language, for the `[hub]` route. */
export function hubFromSegment(segment: string, lang: LocaleId): string | null {
  return Object.keys(HUBS).find((route) => hubSegment(route, lang) === segment) ?? null;
}

/** Tab identifier for a URL segment in one language. The hub root is its first tab. */
export function tabFromSegment(route: string, segment: string | undefined, lang: LocaleId): string {
  const hub = HUBS[route];
  if (!segment) return hub.tabs[0].slug;
  return hub.tabs.find((x) => !x.link && tabSegment(route, x.slug, lang) === segment)?.slug ?? segment;
}

/* --------------------------------------------------------------- paths */

/**
 * Path of a tab inside a hub, with the first tab collapsing onto the hub
 * root. Locale-less, so `localePath` adds the language prefix.
 */
export function hubTabPath(route: string, tab?: string, lang: LocaleId = DEFAULT_LOCALE): string {
  const hub = HUBS[route];
  const base = hubSegment(route, lang);
  if (!hub || !tab || hub.tabs[0]?.slug === tab) return base;
  return `${base}/${tabSegment(route, tab, lang)}`;
}

/** Every locale's path for one tab, for the `altPaths` that drive hreflang. */
export function hubAltPaths(route: string, tab?: string): Partial<Record<LocaleId, string>> {
  return Object.fromEntries(LOCALE_IDS.map((l) => [l, hubTabPath(route, tab, l)])) as Partial<
    Record<LocaleId, string>
  >;
}

/** Where a tab's pill points: its own page, or, for a link tab, the other hub. */
export function hubTabHref(route: string, tab: HubTab, lang: LocaleId = DEFAULT_LOCALE): string {
  return tab.link ? hubTabPath(tab.link.route, tab.link.tab, lang) : hubTabPath(route, tab.slug, lang);
}

/**
 * Static paths for the shared `[hub]/[...tab]` route: every hub, every own
 * tab, every locale, each carrying that locale's segments. Link tabs have no
 * page of their own. `props` hands the route the identifiers, so nothing
 * downstream has to translate a segment back.
 */
export function hubRouteParams(locales: readonly LocaleId[]) {
  return locales.flatMap((lang) =>
    Object.keys(HUBS).flatMap((route) =>
      HUBS[route].tabs
        .filter((tab) => !tab.link)
        .map((tab, i) => ({
          params: {
            lang,
            hub: hubSegment(route, lang),
            tab: i === 0 ? undefined : tabSegment(route, tab.slug, lang),
          },
          props: { route, tab: tab.slug },
        })),
    ),
  );
}

/** The `page` document that carries a tab's text, matched on its English slug. */
export function pageForTab(pages: any[], slug: string) {
  return pages.find((p) => p?.slugs?.en === slug) ?? null;
}
