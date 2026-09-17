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
   * Behind the VIP gate (docs/vip-access.md). A locked tab is never
   * prerendered: the Worker renders it on request once src/middleware.ts has
   * found a VIP session, and sends everyone else to the hub's access page.
   * In `astro dev` there is no Worker and it renders like any other tab.
   */
  locked?: boolean;
  /** A page of the hub with no pill: the VIP access page, which the gate redirects to. */
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
      // The award ceremony: a tab of its own since the client's mock-up of
      // 2026-09-16 (backend request #3), no longer a link to the art prize
      // awards - that page carries the link as a button. The old site never
      // had this page, so the segments are simply translated.
      { slug: 'awards', segment: { fr: 'remise-des-prix', nl: 'prijsuitreiking' }, label: 'tabs.awardCeremony' },
      // VIP left this hub for one of its own (Figma VIP frames, 2026-09-17).
    ],
  },
  /**
   * The VIP hub: the about tab is public and carries the "enter your code"
   * box; the three others are locked (docs/vip-access.md). `access` is the
   * locked state the gate redirects to - "VIP already? / not a VIP yet?" -
   * and has no pill. The hub segment stays "vip" in every language: the
   * on-demand route the Worker serves the locked tabs from is
   * `/[lang]/vip/[tab]`, which needs a fixed word there.
   */
  vip: {
    route: 'vip',
    title: 'nav.vip',
    tabs: [
      { slug: 'about', segment: { fr: 'a-propos', nl: 'over' }, label: 'tabs.about' },
      { slug: 'programme', segment: { nl: 'programma' }, label: 'tabs.vipProgramme', locked: true },
      { slug: 'lounge', label: 'tabs.vipLounge', locked: true },
      { slug: 'hotel-deal', segment: { fr: 'offre-hotel', nl: 'hotelaanbod' }, label: 'tabs.hotelDeal', locked: true },
      { slug: 'access', segment: { fr: 'acces', nl: 'toegang' }, label: 'tabs.vipAccess', hidden: true },
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
 *
 * Locked tabs are left out of a production build: a static file would be
 * served to anyone, gate or no gate. The Worker renders them on request
 * (src/integrations/vip-routes.mjs). `astro dev` has no Worker, so there
 * they are built like any other tab and open without a code.
 */
export function hubRouteParams(locales: readonly LocaleId[], { includeLocked = !import.meta.env.PROD } = {}) {
  return locales.flatMap((lang) =>
    Object.keys(HUBS).flatMap((route) =>
      HUBS[route].tabs
        .filter((tab) => !tab.link && (includeLocked || !tab.locked))
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

/* ----------------------------------------------------------------- VIP */

/** The locked tab a locale-prefixed pathname points at, or null: `/fr/vip/programme/` → "programme". */
export function lockedTabFromPath(pathname: string): { lang: LocaleId; tab: string } | null {
  const [lang, hub, segment, ...rest] = pathname.split('/').filter(Boolean);
  if (!lang || !(LOCALE_IDS as readonly string[]).includes(lang) || rest.length) return null;
  if (hub !== hubSegment('vip', lang as LocaleId) || !segment) return null;
  const tab = HUBS.vip.tabs.find((x) => x.locked && tabSegment('vip', x.slug, lang as LocaleId) === segment);
  return tab ? { lang: lang as LocaleId, tab: tab.slug } : null;
}

/**
 * Every locked tab's path in every language, with and without the trailing
 * slash - what `_routes.json` sends to the Worker and robots.txt disallows.
 */
export function lockedPaths(): string[] {
  return LOCALE_IDS.flatMap((lang) =>
    HUBS.vip.tabs
      .filter((tab) => tab.locked)
      .flatMap((tab) => {
        const path = `/${lang}/${hubTabPath('vip', tab.slug, lang)}`;
        return [path, `${path}/`];
      }),
  );
}

/** The access page's path in every language, for robots.txt. */
export function accessPaths(): string[] {
  return LOCALE_IDS.map((lang) => `/${lang}/${hubTabPath('vip', 'access', lang)}/`);
}
