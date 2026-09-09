/**
 * The sections the site has routes for. Editors pick from this list in the
 * navigation and in links, so a menu item can never point at a path that does
 * not exist. Adding a route here means adding a page under src/pages/[lang]/.
 *
 * Sub-tabs (art prize → laureates, visitors info → food & drinks) are anchors
 * on these routes, chosen freely in the `anchor` field.
 */
export const BUILT_IN_ROUTES = [
  { title: 'Home', value: '' },
  { title: 'Exhibitors', value: 'exhibitors' },
  { title: 'Artists', value: 'artists' },
  { title: 'Guest of honour', value: 'guest-of-honour' },
  { title: 'Art prize', value: 'art-prize' },
  { title: 'Programme', value: 'programme' },
  { title: 'Partners', value: 'partners' },
  { title: 'Visitors info', value: 'visit' },
  { title: 'About', value: 'about' },
  { title: 'News', value: 'news' },
  { title: 'Awards', value: 'awards' },
  { title: 'Press', value: 'press' },
  { title: 'Past editions', value: 'editions' },
] as const;

export type RouteValue = (typeof BUILT_IN_ROUTES)[number]['value'];

/**
 * The sections a `page` can belong to. For a hub (the routes with pill tabs
 * under their title in the design) a page in the section becomes a tab, and
 * the first tab is the hub's main page. For a listing route the section holds
 * one page: the main page itself, whose lead, SEO and section stack wrap the
 * list the route generates. The Studio's "Main pages" entries open these
 * directly (see ../../mainPages.ts).
 */
export const PAGE_SECTIONS = [
  { title: 'About', value: 'about' },
  { title: 'Art prize', value: 'art-prize' },
  { title: 'Programme', value: 'programme' },
  { title: 'Visitors info', value: 'visit' },
  { title: 'Partners', value: 'partners' },
  { title: 'Guest of honour', value: 'guest-of-honour' },
  { title: 'Exhibitors', value: 'exhibitors' },
  { title: 'Artists', value: 'artists' },
  { title: 'News', value: 'news' },
] as const;

/** The listing routes: no tabs, one page per section, the list itself is code. */
export const LISTING_SECTIONS = ['exhibitors', 'artists', 'news'] as const;
