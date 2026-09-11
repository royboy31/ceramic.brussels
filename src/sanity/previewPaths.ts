import { HUBS } from '../lib/hubs';
import type { LocaleId } from '../lib/locales';
import { LISTING_SECTIONS } from './schemaTypes/objects/routes';

/**
 * Which `/preview/…` pages show a given document.
 *
 * Shared by the Presentation tool (its "Used on" banner and the page it opens
 * a document on, see presentation.ts) and the "Open preview" document action,
 * so the two can never disagree. Every entry mirrors a route under
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
 * The fields the resolver needs, flattened. Presentation's `select` produces
 * exactly this shape; `previewFields()` derives most of it from a whole
 * document (the edition's year and current flag need a lookup, see
 * OpenPreviewAction.tsx).
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

/** `select` for defineLocations, matching PreviewFields. */
export const PREVIEW_SELECT = {
  title: 'title.en',
  name: 'name',
  section: 'section',
  en: 'slug.en.current',
  fr: 'slug.fr.current',
  nl: 'slug.nl.current',
  slug: 'slug.current',
  tier: 'tier',
  groups: 'groups',
  family: 'family',
  startsAt: 'startsAt',
  year: 'edition.year',
  current: 'edition.isCurrent',
  ownYear: 'year',
  isCurrent: 'isCurrent',
} as const;

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

/** The partners tab (or other page) each tier is listed on. */
const TIER_PAGES: Record<string, PreviewLocation> = {
  main: { title: 'Partners – main partner', href: '/partners' },
  institutional: { title: 'Partners – institutions', href: '/partners/institutions' },
  hotel: { title: 'Partners – hotel', href: '/partners/hotel' },
  event: { title: 'Partners – event partners', href: '/partners/event' },
  supplier: { title: 'Partners – event partners', href: '/partners/event' },
  'exhibition-pass': { title: 'Partners – event partners', href: '/partners/event' },
  media: { title: 'Partners – media', href: '/partners/media' },
  'food-drinks': { title: 'Visitors info – food & drinks', href: '/visit/food-drinks' },
  'art-prize': { title: 'Art prize', href: '/art-prize' },
};

const EVENT_TABS: Record<string, PreviewLocation> = {
  talks: { title: 'Programme – talks', href: '/programme/talks' },
  vip: { title: 'Programme – VIP', href: '/programme/vip' },
  project: { title: 'Programme – La Cambre', href: '/programme' },
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
]);

/**
 * The preview pages for a document of `type`, in `lang`. The first entry is
 * the page the document most directly is; the rest are lists it appears in.
 * Empty when no page shows the document.
 */
export function previewLocations(type: string, doc: PreviewFields | null | undefined, lang: LocaleId = 'en'): PreviewLocation[] {
  const at = (path: string, l: LocaleId = lang) => `${PREVIEW_ROOT}/${l}${path}`;
  const loc = (title: string, path: string): PreviewLocation => ({ title, href: at(path) });
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
        loc('Visitors info', '/visit'),
        loc('Visitors info – FAQ', '/visit/faq'),
        loc('Contact', '/contact'),
        loc('About – press', '/about/press'),
        loc('Footer (homepage)', ''),
      ];
    case 'edition':
      return d.isCurrent
        ? [loc('Homepage', ''), loc('Visitors info', '/visit'), loc('Floor plan', '/visit/floor-plan'), loc('Exhibitors', '/exhibitors')]
        : [
            ...(d.ownYear ? [loc(`Edition ${d.ownYear}`, `/editions/${d.ownYear}`)] : []),
            loc('Past editions', '/editions'),
            loc('About – images', '/about/images'),
            ...(d.ownYear ? [loc(`Exhibitors ${d.ownYear}`, `/exhibitors/${d.ownYear}`)] : []),
          ];
    case 'person': {
      if (past) return [];
      const groups = d.groups ?? [];
      return [
        ...(groups.includes('advisory-board') ? [loc('About – advisory board', '/about/advisory-board')] : []),
        ...(groups.includes('team') || groups.includes('collaborator') ? [loc('About – team', '/about/team')] : []),
        ...(groups.includes('team') ? [loc('Contact', '/contact')] : []),
        ...(groups.includes('jury') ? [loc('Art prize – jury', '/art-prize/jury')] : []),
      ];
    }
    case 'partner': {
      const page = d.tier ? TIER_PAGES[d.tier] : undefined;
      return page ? [loc(page.title, page.href)] : [];
    }
    case 'programmeEvent': {
      // Any year: until the current edition has a programme, the tabs show
      // the newest edition's (getProgramme), so a past event can be the one shown.
      const tab = d.section ? EVENT_TABS[d.section] : undefined;
      return tab && d.startsAt ? [loc(tab.title, tab.href)] : [];
    }
    case 'laureate':
      return past ? [] : [loc('Art prize – laureates', '/art-prize/laureates')];
    case 'award':
      return d.family === 'art-prize' ? [loc('Art prize – awards', '/art-prize/awards')] : [];
    case 'pressClip':
      return [loc('About – press', '/about/press')];
    case 'artist':
      return d.slug ? [loc(d.name ?? 'Artist', `/artists/${d.slug}`)] : [];
    case 'exhibitor': {
      if (!d.slug) return [];
      const name = d.name ?? 'Exhibitor';
      return past
        ? [loc(`${name} (${d.year})`, `/exhibitors/${d.year}/${d.slug}`), loc(`Exhibitors ${d.year}`, `/exhibitors/${d.year}`)]
        : [loc(name, `/exhibitors/${d.slug}`), loc('Exhibitors', '/exhibitors')];
    }
    case 'newsItem':
      return d.slug ? [loc(d.title ?? 'News', `/news/${d.slug}`), loc('News list', '/news'), loc('Homepage – latest news', '')] : [];
    case 'page':
      return pageLocations(d, at);
    default:
      return [];
  }
}

function pageLocations(d: PreviewFields, at: (path: string, l?: LocaleId) => string): PreviewLocation[] {
  const title = d.title ?? 'Page';
  if (d.section) {
    // A listing's main page is the listing itself.
    if ((LISTING_SECTIONS as readonly string[]).includes(d.section)) return [{ title, href: at(`/${d.section}`) }];
    const hub = HUBS[d.section];
    if (!hub) return [];
    const first = hub.tabs[0]?.slug;
    const tab = hub.tabs.find((t) => t.slug === (d.en ?? first));
    // A tab that links to another hub has no page of its own.
    if (tab?.link) return [];
    // The guest of honour's tab pages only label the pills; the page is the artist's.
    if (d.section === 'guest-of-honour') return [{ title: 'Guest of honour', href: at('/guest-of-honour') }];
    // Hub tabs: the first tab is the hub root, the others carry their
    // English slug whatever the language of the page.
    const path = !d.en || d.en === first ? d.section : `${d.section}/${d.en}`;
    return [{ title, href: at(`/${path}`) }];
  }
  // Standalone pages have a slug per language, so the URL is translated too.
  return (['en', 'fr', 'nl'] as const)
    .filter((l) => d[l])
    .map((l) => ({ title: `${title} (${l.toUpperCase()})`, href: at(`/${d[l]}`, l) }));
}
