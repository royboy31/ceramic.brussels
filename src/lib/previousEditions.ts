import type { StringKey } from './i18n';
import { DEFAULT_LOCALE, LOCALE_IDS, type LocaleId } from './locales';

/**
 * The previous-editions section and its tabs (Figma, Léonie 2026-09-28;
 * `docs/previous-editions-plan.md`). One past edition per year page, seven
 * tabs across it, at `/[lang]/previous-editions/<year>/<tab>` - the first tab
 * collapsing onto the year root, the way a hub's first tab collapses onto the
 * hub.
 *
 * **This is not a `HUBS` entry, for one reason: the tabs are not a constant.**
 * A hub's pills are the same on every render; a previous edition's depend on
 * what that year actually had - 2024 has no country focus and no awards, 2026
 * may have no publication. So the list here is a template and `tabsFor()`
 * decides which of it a given edition gets. Everything else follows the hub
 * rules exactly: `slug` is the stable English identifier, `segment` is the
 * translated URL, and a missing segment falls back to the slug.
 *
 * **The section's own word is "previous editions", not "past editions".** The
 * old site had `/{lang}/pasteditions`, untranslated in all three languages, so
 * no URL is preserved by any choice here - `/{lang}/editions` was this build's
 * own invention and is a 404 on the live site. The design, the client's
 * comments and the footer button all say *previous editions*, so that is the
 * segment, and French and Dutch get real words for once.
 * `scripts/legacy-redirects.mjs` sends every old address onto these paths.
 */
export interface EditionTab {
  /** Stable English identifier, used in code and in the URL when untranslated. */
  slug: string;
  /** What the URL says, per locale. Falls back to `slug`. */
  segment?: Partial<Record<LocaleId, string>>;
  label: StringKey;
  /**
   * A pill that leads somewhere else instead of to a tab of this route. The
   * exhibitors tab is one: a past edition's list already lives at
   * `/[lang]/exhibitors/<year>`, an address the old site had in all three
   * languages and which `/exhibitors/<year>/<slug>` hangs off, so the pill
   * goes there rather than to a second copy of the list.
   */
  /**
   * No tab is external any more - exhibitors was the only one, until its list
   * moved inside the section. Kept so a future tab can leave the section
   * without rediscovering `editionRouteParams`' filter.
   */
  external?: true;
}

export const SECTION = 'previous-editions';

/** The section's URL segment in one language. */
export const SEGMENTS: Partial<Record<LocaleId, string>> = {
  fr: 'editions-precedentes',
  nl: 'vorige-edities',
};

/**
 * Every tab a previous edition can have, in the designer's order. `focus` is
 * labelled with the country, which changes per year, so its label is built in
 * `focusLabel()` rather than read from STRINGS - but its *segment* stays
 * `focus` in every year and language, because a segment that moved with the
 * country would give one tab a different URL in each edition.
 */
export const TABS: EditionTab[] = [
  { slug: 'overview', segment: { fr: 'apercu', nl: 'overzicht' }, label: 'prevEd.overview' },
  {
    slug: 'guest-of-honour',
    segment: { fr: 'invitee-d-honneur' },
    label: 'prevEd.guestOfHonour',
  },
  { slug: 'exhibitors', segment: { fr: 'exposants', nl: 'exposanten' }, label: 'prevEd.exhibitors' },
  { slug: 'art-prize', label: 'prevEd.artPrize' },
  { slug: 'focus', label: 'prevEd.focus' },
  { slug: 'programme', segment: { nl: 'programma' }, label: 'prevEd.programme' },
  { slug: 'publication', segment: { fr: 'publication', nl: 'publicatie' }, label: 'prevEd.publication' },
];

/* ------------------------------------------------------------ segments */

/** The section's URL segment in one language; the identifier if untranslated. */
export function sectionSegment(lang: LocaleId = DEFAULT_LOCALE): string {
  return SEGMENTS[lang] ?? SECTION;
}

/** A tab's URL segment in one language; the identifier if untranslated. */
export function tabSegment(tab: string, lang: LocaleId = DEFAULT_LOCALE): string {
  const found = TABS.find((x) => x.slug === tab);
  return found?.segment?.[lang] ?? found?.slug ?? tab;
}

/** The section identifier for a URL segment, for the dynamic route. */
export function sectionFromSegment(segment: string, lang: LocaleId): boolean {
  return sectionSegment(lang) === segment;
}

/** Tab identifier for a URL segment. No segment means the year root, which is the first tab. */
export function tabFromSegment(segment: string | undefined, lang: LocaleId): string {
  if (!segment) return TABS[0].slug;
  return TABS.find((x) => tabSegment(x.slug, lang) === segment)?.slug ?? segment;
}

/* --------------------------------------------------------------- paths */

/**
 * Path of one tab of one year, the first tab collapsing onto the year root.
 * Locale-less, so `localePath` adds the language prefix and the trailing
 * slash - never hand-write one of these.
 */
export function editionTabPath(year: number | string, tab?: string, lang: LocaleId = DEFAULT_LOCALE): string {
  const base = `${sectionSegment(lang)}/${year}`;
  if (!tab || TABS[0].slug === tab) return base;
  return `${base}/${tabSegment(tab, lang)}`;
}

/** Every locale's path for one tab, for the `altPaths` that drive hreflang. */
export function editionAltPaths(year: number | string, tab?: string): Partial<Record<LocaleId, string>> {
  return Object.fromEntries(LOCALE_IDS.map((l) => [l, editionTabPath(year, tab, l)])) as Partial<
    Record<LocaleId, string>
  >;
}

/**
 * Where a tab's pill points. Every tab is inside the section now, including
 * exhibitors: it used to lead out to `exhibitors/<year>`, the address the old
 * site gave that list, which left two shapes of URL for one year's content and
 * two sets of year links on the same page (Kamindu, 2026-10-01). The old
 * addresses 301 onto this one from `scripts/legacy-redirects.mjs`.
 */
export function editionTabHref(year: number | string, tab: EditionTab, lang: LocaleId = DEFAULT_LOCALE): string {
  return editionTabPath(year, tab.slug, lang);
}

/* ---------------------------------------------------------------- tabs */

/**
 * What a year page holds, as the route and `tabsFor` read it. Filled by
 * `getPreviousEdition` in queries.ts; the counts are what decide whether a
 * tab exists at all.
 */
export interface EditionSummary {
  year: number;
  ordinal?: string;
  countryFocus?: string;
  guestOfHonour?: { name?: string } | null;
  exhibitorCount?: number;
  laureateCount?: number;
  eventCount?: number;
  /** Focus galleries + focus talks. A country focus with neither earns no pill. */
  focusCount?: number;
  hasFocusLead?: boolean;
  publication?: { url?: string } | null;
}

/**
 * The tabs one edition actually gets. A pill onto an empty page is worse than
 * no pill - the same rule that keeps "exhibition pass (coming up)" out of the
 * programme hub - so each tab has to be paid for by content:
 *
 * - **overview** always: it is the year's own address.
 * - **guest of honour** when the edition names one.
 * - **exhibitors** when that year has any (all three past years do).
 * - **art prize** when that year has laureates.
 * - **focus** when the edition has a country focus *and something to say
 *   about it* - a lead, its galleries or its talks. 2024 has no focus at all;
 *   2025 and 2026 have one but nothing filled under it yet (#35), so the pill
 *   appears with the content and not before.
 * - **programme** when that year has events.
 * - **publication** when a reader URL is set (request #36).
 */
export function tabsFor(edition: EditionSummary): EditionTab[] {
  const has: Record<string, boolean> = {
    overview: true,
    'guest-of-honour': !!edition.guestOfHonour?.name,
    exhibitors: (edition.exhibitorCount ?? 0) > 0,
    'art-prize': (edition.laureateCount ?? 0) > 0,
    focus: !!edition.countryFocus && (!!edition.hasFocusLead || (edition.focusCount ?? 0) > 0),
    programme: (edition.eventCount ?? 0) > 0,
    publication: !!edition.publication?.url,
  };
  return TABS.filter((tab) => has[tab.slug]);
}

/**
 * The focus tab's pill: the country, the way the design writes it -
 * "norway focus", "españa focus". `countryFocus` is stored as the exhibitor
 * badge ("focus Norway"), which reads the other way round, so the two words
 * are swapped when it is in that shape and left alone otherwise. An editor
 * who writes something that is not two words gets it back untouched.
 */
export function focusLabel(countryFocus: string | undefined, fallback: string): string {
  const raw = (countryFocus ?? '').trim();
  if (!raw) return fallback;
  const match = raw.match(/^focus\s+(.+)$/i);
  return (match ? `${match[1]} focus` : raw).toLowerCase();
}

/** A tab's pill label: the focus tab's country, otherwise its STRINGS label. */
export function tabLabel(
  tab: EditionTab,
  edition: EditionSummary,
  t: (key: StringKey) => string,
): string {
  return tab.slug === 'focus' ? focusLabel(edition.countryFocus, t(tab.label)) : t(tab.label);
}

/* ------------------------------------------------------- ordinal wording */

/**
 * The year band spells the edition out - "2025, SECOND EDITION" - where the
 * title band on the same frame writes "2nd edition". Both are `edition.ordinal`
 * ("2nd edition" / "2e édition" / "2de editie"), rendered two ways, so the
 * words live here rather than being a second field for an editor to keep in
 * step. A lookup table like `countries.ts`, not a UI label, which is why it is
 * not in STRINGS - only the frame around it ("{word} edition") is.
 */
const ORDINAL_WORDS: Record<LocaleId, string[]> = {
  en: ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'],
  fr: ['première', 'deuxième', 'troisième', 'quatrième', 'cinquième', 'sixième', 'septième', 'huitième', 'neuvième', 'dixième'],
  nl: ['eerste', 'tweede', 'derde', 'vierde', 'vijfde', 'zesde', 'zevende', 'achtste', 'negende', 'tiende'],
};

/**
 * The number an ordinal string leads with: "2nd edition" → 2, "2e édition" → 2,
 * "2de editie" → 2. Null when there is none, so an editor who writes something
 * else gets their own words back rather than a wrong guess.
 */
export function ordinalNumber(ordinal: string | undefined): number | null {
  const match = (ordinal ?? '').trim().match(/^(\d{1,2})/);
  const n = match ? Number(match[1]) : NaN;
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/**
 * A year band cell: "2025, SECOND EDITION". Falls back to the stored ordinal
 * when it does not start with a number or the fair has run longer than the
 * word list, and to the year alone when there is no ordinal at all - never to
 * a half-written label.
 */
export function editionBandLabel(
  edition: EditionSummary,
  lang: LocaleId,
  t: (key: StringKey, vars?: Record<string, string | number>) => string,
): string {
  const n = ordinalNumber(edition.ordinal);
  const word = n ? ORDINAL_WORDS[lang]?.[n - 1] : undefined;
  const phrase = word ? t('prevEd.editionNo', { word }) : edition.ordinal;
  return phrase ? `${edition.year}, ${phrase}` : String(edition.year);
}

/* --------------------------------------------------------------- routes */

/**
 * Static paths for the shared `[hub]/[...tab]` route. Previous editions ride
 * on that route for the same reason the hubs do: the section segment is
 * translated (`/fr/editions-precedentes/2025`), so it cannot be a folder on
 * disk, and `[...tab]` is a rest param that happily carries `2025/art-prize`.
 *
 * `props` hands the route the identifiers - the year and the tab slug -
 * so nothing downstream has to translate a segment back.
 */
export function editionRouteParams(locales: readonly LocaleId[], editions: EditionSummary[]) {
  return locales.flatMap((lang) => [
    // The section root. There is no index frame - the year band makes one
    // unnecessary - so it sends the reader to the newest past edition. It is
    // built because the old site's `/{lang}/pasteditions` and this build's own
    // `/{lang}/editions` both redirect onto it, and because a `link` an editor
    // made with the route "Past editions" and no year points here.
    ...(editions.length
      ? [{ params: { lang, hub: sectionSegment(lang), tab: undefined }, props: { previousEdition: true, root: true } }]
      : []),
    ...editions.flatMap((edition) =>
      tabsFor(edition)
        .filter((tab) => !tab.external)
        .map((tab, i) => ({
          params: {
            lang,
            hub: sectionSegment(lang),
            tab: i === 0 ? String(edition.year) : `${edition.year}/${tabSegment(tab.slug, lang)}`,
          },
          props: { previousEdition: true, year: edition.year, tab: tab.slug },
        })),
    ),
  ]);
}

/**
 * The year and tab a `[...tab]` rest param spells, for the preview runtime and
 * the VIP-style on-demand renders that have no static props: `"2025"` → the
 * overview, `"2025/art-prize"` → that tab. Null when the first segment is not
 * a four-digit year, so the hub route can fall through to a 404.
 */
export function editionFromRest(rest: string | undefined, lang: LocaleId): { year: number; tab: string } | null {
  const [year, segment, ...extra] = (rest ?? '').split('/').filter(Boolean);
  if (!/^\d{4}$/.test(year ?? '') || extra.length) return null;
  return { year: Number(year), tab: tabFromSegment(segment, lang) };
}

/** Whether a rest param is the section root - no year, nothing after it. */
export function isSectionRoot(rest: string | undefined): boolean {
  return (rest ?? '').split('/').filter(Boolean).length === 0;
}
