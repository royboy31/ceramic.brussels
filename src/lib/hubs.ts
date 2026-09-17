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
 * **Where a segment comes from: the live site first.** Wherever
 * www.ceramic.brussels already has a French or Dutch address for a page, that
 * is the segment, word for word - including where its French is inclusive
 * (`laureat-es`) or its wording has since been superseded
 * (`comite-strategique`, still the tab labelled "comité consultatif"). Only a
 * page the old site never had, or never translated, is translated here. The
 * slugs were read out of `legacy-export/normalized/pages.json`, which carries
 * all 47 old pages per locale.
 *
 * That rule pays off twice at a *hub root*, because the new hub root is the
 * same page as the old one: `/fr/infos-pratiques`, `/fr/invitee-d-honneur`,
 * `/nl/visitors-info`, `/nl/guest-of-honour` and `/fr|nl/art-prize` are built
 * here exactly as the old site spells them and need no redirect at all. The
 * last three keep an English word in a French or Dutch URL for that reason
 * alone - the URL survives, which is worth more than the reading.
 *
 * A *tab* is nested where the old site was flat, so `/fr/equipe` becomes
 * `/fr/a-propos/equipe` and a 301 fires whatever the word is: no URL survives
 * either way. The old wording is still copied where it exists, so the word an
 * editor knows stays the word; but where the old site left the tab in English
 * it is translated here (`prix`/`prijzen`, `laureaten`, `medias`,
 * `adviesraad`), since keeping the English bought no redirect.
 *
 * The one page not taken from the old site is the *about* hub, whose old slug
 * is `ceramic-brussels` in all three languages - the site's own name, and the
 * English has moved to `/en/about` regardless, so there was nothing to
 * preserve.
 *
 * Accents and spaces are dropped. Nothing else is invented, and a missing
 * segment falls back to the English identifier, so adding a tab cannot break
 * a build.
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
  /**
   * Built and reachable, but no pill: a tab the design no longer shows whose
   * address must keep working (the old site's URLs redirect onto it).
   */
  hidden?: boolean;
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
    // Both the old site's own addresses. Its Dutch was never translated, and
    // keeping it means /nl/guest-of-honour survives the move untouched.
    segment: { fr: 'invitee-d-honneur' },
    title: 'nav.guestOfHonour',
    tabs: [
      { slug: 'about', segment: { fr: 'a-propos', nl: 'over' }, label: 'tabs.about' },
      { slug: 'interview', segment: { fr: 'entretien' }, label: 'tabs.interview' },
    ],
  },
  'art-prize': {
    route: 'art-prize',
    // The old site published this page as /fr/art-prize and /nl/art-prize; it
    // never translated either, and leaving them be keeps both URLs alive.
    title: 'nav.artPrize',
    tabs: [
      { slug: 'about', segment: { fr: 'a-propos', nl: 'over' }, label: 'tabs.about' },
      // French as the old site writes it, inclusive hyphen and all.
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
      { slug: 'awards', label: 'tabs.awardCeremony' },
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
      { slug: 'media', segment: { fr: 'medias' }, label: 'tabs.media' },
    ],
  },
  visit: {
    route: 'visit',
    // Both the old site's own addresses, French translated and Dutch not.
    segment: { fr: 'infos-pratiques', nl: 'visitors-info' },
    title: 'nav.visit',
    tabs: [
      { slug: 'practical-info', segment: { fr: 'infos-pratiques', nl: 'visitors-info' }, label: 'tabs.practicalInfo' },
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
      // The old site's French, superseded by the "comité consultatif" label
      // but still the address people have; its Dutch was never translated.
      { slug: 'advisory-board', segment: { fr: 'comite-strategique', nl: 'adviesraad' }, label: 'tabs.advisoryBoard' },
      // The design's "contact" tab (Figma about frames, 2026-09-17): the
      // directors and the team. Slug and address stay `team`, which the page
      // document and the old site's redirects use.
      { slug: 'team', segment: { fr: 'equipe' }, label: 'tabs.contact' },
      // Not in the design's three tabs; still built for the redirects onto them.
      { slug: 'press', segment: { fr: 'presse', nl: 'pers' }, label: 'tabs.press', hidden: true },
      { slug: 'images', segment: { nl: 'beelden' }, label: 'tabs.images', hidden: true },
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
