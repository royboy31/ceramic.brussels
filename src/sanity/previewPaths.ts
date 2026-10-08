import { HUBS, hubTabPath } from '../lib/hubs';
import type { LocaleId } from '../lib/locales';
import { LISTING_SECTIONS } from './schemaTypes/objects/routes';
import { editionTabPath, sectionSegment } from '../lib/previousEditions';

/**
 * Which `/preview/…` pages show a given document.
 *
 * Used by "Open preview" in a document's menu and by Preview in the top bar,
 * both through openPreview.ts. Every entry mirrors a route under
 * src/pages/[lang]/ and what that route lists: a person opens on the tab of
 * their group, a partner on the tab of their tier, an event on its programme
 * tab, a past exhibitor under its year. A document no page shows - last
 * year's jury, an event without a date - has none, and the Studio says so.
 */

export const PREVIEW_ROOT = '/preview';

export interface PreviewLocation {
  title: string;
  href: string;
}

/**
 * The fields the resolver needs, flattened. `previewFields()` derives most
 * of it from a whole document (the edition's year and current flag need a
 * lookup, see openPreview.ts).
 */
export interface PreviewFields {
  title?: string | null;
  name?: string | null;
  section?: string | null;
  en?: string | null;
  fr?: string | null;
  nl?: string | null;
  slug?: string | null;
  tier?: string | null;
  groups?: string[] | null;
  family?: string | null;
  startsAt?: string | null;
  /** The referenced edition's year and current flag (exhibitors, people, events, laureates). */
  year?: number | null;
  current?: boolean | null;
  /** An edition document's own. */
  ownYear?: number | null;
  isCurrent?: boolean | null;
}

/** Flattens a raw document into PreviewFields. */
export function previewFields(doc: Record<string, any>): PreviewFields {
  const title = doc.title;
  const slug = doc.slug ?? {};
  return {
    title: typeof title === 'string' ? title : (title?.en ?? null),
    name: typeof doc.name === 'string' ? doc.name : null,
    section: doc.section ?? null,
    en: slug.en?.current ?? null,
    fr: slug.fr?.current ?? null,
    nl: slug.nl?.current ?? null,
    slug: typeof slug.current === 'string' ? slug.current : null,
    tier: doc.tier ?? null,
    groups: doc.groups ?? null,
    family: doc.family ?? null,
    startsAt: doc.startsAt ?? null,
    ownYear: doc._type === 'edition' ? (doc.year ?? null) : null,
    isCurrent: doc.isCurrent ?? null,
  };
}

/**
 * A hub tab, named the way `hubTabPath` wants it: the hub's identifier and the
 * tab's. Never a written-out path - the segments are translated, and the first
 * tab collapses onto the hub root, both of which that helper knows.
 */
interface TabRef {
  title: string;
  route: string;
  tab?: string;
}

/** The partners tab (or other page) each tier is listed on. */
const TIER_PAGES: Record<string, TabRef> = {
  main: { title: 'Partners – main partner', route: 'partners', tab: 'main' },
  institutional: { title: 'Partners – institutions', route: 'partners', tab: 'institutions' },
  hotel: { title: 'Partners – hotel', route: 'partners', tab: 'hotel' },
  event: { title: 'Partners – event partners', route: 'partners', tab: 'event' },
  supplier: { title: 'Partners – event partners', route: 'partners', tab: 'event' },
  'exhibition-pass': { title: 'Partners – event partners', route: 'partners', tab: 'event' },
  // Listed on press & media since request #10; the partners tab has no pill.
  media: { title: 'Press & media – media partners', route: 'press-media', tab: 'media-partners' },
  'food-drinks': { title: 'Visitors info – food & drinks', route: 'visit', tab: 'food-drinks' },
  'art-prize': { title: 'Art prize', route: 'art-prize' },
};

const EVENT_TABS: Record<string, TabRef> = {
  // Talks is the hub root since the designer's order of 2026-09-17 (#8).
  talks: { title: 'Programme – talks', route: 'programme', tab: 'talks' },
  vip: { title: 'VIP – VIP programme', route: 'vip', tab: 'programme' },
  awards: { title: 'Programme – award ceremony', route: 'programme', tab: 'awards' },
  project: { title: 'Programme – La Cambre', route: 'programme', tab: 'la-cambre' },
};

/** The types that have a preview at all. */
export const PREVIEWABLE_TYPES = new Set([
  'homepage',
  'navigation',
  'siteSettings',
  'edition',
  'page',
  'artist',
  'exhibitor',
  'newsItem',
  'person',
  'partner',
  'programmeEvent',
  'laureate',
  'award',
  'pressClip',
  'story',
]);

/**
 * The preview pages for a document of `type`, in `lang`. The first entry is
 * the page the document most directly is; the rest are lists it appears in.
 * Empty when no page shows the document.
 */
export function previewLocations(type: string, doc: PreviewFields | null | undefined, lang: LocaleId = 'en'): PreviewLocation[] {
  const at = (path: string, l: LocaleId = lang) => `${PREVIEW_ROOT}/${l}${path}`;
  const loc = (title: string, path: string): PreviewLocation => ({ title, href: at(path) });
  /**
   * A hub tab. **Always build one through here, never by writing the path
   * out.** A hub and its tabs have a translated segment per locale, so
   * `/about/team` is the English page and the French one is
   * `/fr/a-propos/equipe`: a path spelt with the English identifiers is a 404
   * in French and Dutch, which is what the editors kept opening (Félicie and
   * Léonie, 2026-10-07). The first tab collapses onto the hub root, which
   * `hubTabPath` also knows - so press is `/press-media`, not
   * `/press-media/press`.
   */
  const hubLoc = (title: string, route: string, tab?: string): PreviewLocation =>
    loc(title, `/${hubTabPath(route, tab, lang)}`);
  const d: PreviewFields = doc ?? {};
  // Edition-scoped documents: shown only while their edition is the current
  // one. Unknown (no edition yet, or not looked up) counts as current.
  const past = d.year != null && d.current !== true;

  switch (type) {
    case 'homepage':
      return [loc('Homepage', '')];
    case 'navigation':
      return [loc('Menu and footer (homepage)', '')];
    case 'siteSettings':
      return [
        hubLoc('Visitors info', 'visit'),
        hubLoc('Visitors info – FAQ', 'visit', 'faq'),
        hubLoc('About – contact & team', 'about', 'team'),
        hubLoc('Press & media – press', 'press-media', 'press'),
        hubLoc('Press & media – stories', 'press-media', 'stories'),
        hubLoc('VIP – access page', 'vip', 'access'),
        loc('Footer (homepage)', ''),
      ];
    case 'edition':
      return d.isCurrent
        ? [loc('Homepage', ''), hubLoc('Visitors info', 'visit'), hubLoc('Floor plan', 'visit', 'floor-plan'), loc('Exhibitors', '/exhibitors')]
        : [
            ...(d.ownYear ? [loc(`Edition ${d.ownYear}`, `/${editionTabPath(d.ownYear, undefined, lang)}`)] : []),
            loc('Previous editions', `/${sectionSegment(lang)}`),
            hubLoc('Press & media – photos & videos', 'press-media', 'photos-videos'),
            ...(d.ownYear ? [loc(`Exhibitors ${d.ownYear}`, `/${editionTabPath(d.ownYear, 'exhibitors', lang)}`)] : []),
          ];
    case 'person': {
      if (past) return [];
      const groups = d.groups ?? [];
      return [
        ...(groups.includes('advisory-board') ? [hubLoc('About – advisory board', 'about', 'advisory-board')] : []),
        ...(groups.includes('team') || groups.includes('collaborator') ? [hubLoc('About – contact & team', 'about', 'team')] : []),
        ...(groups.includes('jury') ? [hubLoc('Art prize – jury', 'art-prize', 'jury')] : []),
      ];
    }
    case 'partner': {
      const page = d.tier ? TIER_PAGES[d.tier] : undefined;
      return page ? [hubLoc(page.title, page.route, page.tab)] : [];
    }
    case 'programmeEvent': {
      // Any year: the tab only lists the current edition's events
      // (getProgramme), but a past event still previews on its tab.
      const tab = d.section ? EVENT_TABS[d.section] : undefined;
      return tab && d.startsAt ? [hubLoc(tab.title, tab.route, tab.tab)] : [];
    }
    case 'laureate':
      return past ? [] : [hubLoc('Art prize – laureates', 'art-prize', 'laureates')];
    case 'award':
      return d.family === 'art-prize' ? [hubLoc('Art prize – awards', 'art-prize', 'awards')] : [];
    case 'pressClip':
      return [hubLoc('Press & media – press', 'press-media', 'press')];
    case 'story':
      return [hubLoc('Press & media – stories', 'press-media', 'stories')];
    case 'artist':
      // No page of their own since 2026-09-22: the A–Z list, where the name leads to the gallery.
      return [loc('Artists (A–Z list)', '/artists')];
    case 'exhibitor': {
      if (!d.slug) return [];
      const name = d.name ?? 'Exhibitor';
      return past
        ? [
            loc(`${name} (${d.year})`, `/exhibitors/${d.year}/${d.slug}`),
            loc(`Exhibitors ${d.year}`, `/${editionTabPath(d.year, 'exhibitors', lang)}`),
          ]
        : [loc(name, `/exhibitors/${d.slug}`), loc('Exhibitors', '/exhibitors')];
    }
    case 'newsItem':
      return d.slug ? [loc(d.title ?? 'News', `/news/${d.slug}`), loc('News list', '/news'), loc('Homepage – latest news', '')] : [];
    case 'page':
      return pageLocations(d, at, hubLoc, lang);
    default:
      return [];
  }
}

function pageLocations(
  d: PreviewFields,
  at: (path: string, l?: LocaleId) => string,
  hubLoc: (title: string, route: string, tab?: string) => PreviewLocation,
  lang: LocaleId,
): PreviewLocation[] {
  const title = d.title ?? 'Page';
  if (d.section) {
    // A listing's main page is the listing itself; another page of the
    // section is a sub-page of it (exhibitors/awards).
    if ((LISTING_SECTIONS as readonly string[]).includes(d.section)) {
      const sub = d.en && d.en !== d.section ? `/${d.section}/${d.en}` : `/${d.section}`;
      return [{ title, href: at(sub) }];
    }
    const hub = HUBS[d.section];
    if (!hub) return [];
    const first = hub.tabs[0]?.slug;
    const tab = hub.tabs.find((t) => t.slug === (d.en ?? first));
    // A tab that links to another hub has no page of its own.
    if (tab?.link) return [];
    // The guest of honour's tab pages only label the pills; the page is the artist's.
    if (d.section === 'guest-of-honour') return [hubLoc('Guest of honour', 'guest-of-honour')];
    // Hub tabs: the page is filed under its English slug, and `hubTabPath`
    // turns that identifier into the segment this language's URL spells.
    return [hubLoc(title, d.section, d.en ?? first)];
  }
  // Standalone pages have a slug per language, so the URL is translated too.
  // The language being edited comes first: the caller opens the first entry,
  // and an editor working in French means the French page.
  const order = [lang, ...(['en', 'fr', 'nl'] as const).filter((l) => l !== lang)];
  return order
    .filter((l) => d[l])
    .map((l) => ({ title: `${title} (${l.toUpperCase()})`, href: at(`/${d[l]}`, l) }));
}
