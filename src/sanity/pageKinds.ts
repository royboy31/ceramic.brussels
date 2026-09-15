import { HUBS } from '../lib/hubs';

/**
 * Which fields of a `page` document the site reads, by the kind of page it is.
 *
 * One `page` type serves three roles - a hub tab, the main page behind a
 * listing (exhibitors, artists, news, contact), a standalone page - and each
 * route reads a different part of it: the exhibitors page never shows Body, a
 * laureates tab shows only its lead paragraph, a guest-of-honour tab only its
 * label. The page form hides every field the page being edited does not read
 * (page.ts), so an editor never fills in something that changes nothing, and
 * the placement fields that tie a main page to its URL are out of reach.
 *
 * Mirrors the routes under src/pages/[lang]/ - change both together.
 */
export type PageField =
  | 'title'
  | 'tabLabel'
  | 'navLabel'
  | 'slug'
  | 'section'
  | 'order'
  | 'intro'
  | 'cover'
  | 'sections'
  | 'body'
  | 'images'
  | 'seo';

/** A standalone page (no hub) is drawn from all of it. */
const STANDALONE: PageField[] = ['title', 'slug', 'order', 'navLabel', 'intro', 'cover', 'sections', 'body', 'images', 'seo'];

/** Every hub tab: its name, the pill label, the hub it belongs to (read-only), SEO. */
const TAB: PageField[] = ['title', 'tabLabel', 'section', 'seo'];

const FULL: PageField[] = ['intro', 'cover', 'sections', 'body', 'images'];
const TEXT: PageField[] = ['intro', 'sections', 'body', 'images'];

/** What each hub tab adds to TAB. `*` covers every tab of the hub. */
const HUB_TABS: Record<string, Record<string, PageField[]>> = {
  about: { 'the-fair': FULL, '*': TEXT },
  'art-prize': { about: FULL, laureates: ['intro'], awards: ['intro'], jury: ['intro'] },
  programme: { '*': FULL },
  partners: { '*': TEXT },
  visit: {
    'practical-info': ['intro', 'images'],
    'food-drinks': ['intro', 'body'],
    '*': ['intro', 'sections', 'body'],
  },
};

/** The listing routes' main pages: the lead and blocks around a generated list. */
const LISTING: Record<string, PageField[]> = {
  exhibitors: ['title', 'section', 'intro', 'sections', 'seo'],
  artists: ['title', 'section', 'intro', 'sections', 'seo'],
  news: ['title', 'section', 'intro', 'sections', 'seo'],
  contact: ['title', 'section', 'intro', 'sections', 'body', 'seo'],
};

export function pageFields(section?: string | null, slug?: string | null): Set<PageField> {
  if (!section) return new Set(STANDALONE);
  if (LISTING[section]) return new Set(LISTING[section]);
  const hub = HUBS[section];
  if (!hub) return new Set(STANDALONE);
  const tabSlug = slug || hub.tabs[0]?.slug;
  const tab = hub.tabs.find((t) => t.slug === tabSlug);
  // The guest of honour is an artist document; its tab pages only name the pills.
  if (section === 'guest-of-honour') return new Set(['title', 'tabLabel', 'section']);
  // A tab that links to another hub (programme → awards, about → partners)
  // has no page of its own, so nothing on the document is ever shown.
  if (tab?.link) return new Set(['title', 'section']);
  const extra = HUB_TABS[section]?.[tabSlug ?? ''] ?? HUB_TABS[section]?.['*'] ?? [];
  return new Set([...TAB, ...extra]);
}

/** For the `hidden` callbacks in page.ts. */
export const pageHides =
  (field: PageField) =>
  ({ document }: { document?: Record<string, any> }) =>
    !pageFields(document?.section, document?.slug?.en?.current).has(field);
