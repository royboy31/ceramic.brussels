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
 * The hub pages that carry pill tabs under their title in the design. A `page`
 * document assigned to one of these sections becomes a tab there.
 */
export const PAGE_SECTIONS = [
  { title: 'About', value: 'about' },
  { title: 'Art prize', value: 'art-prize' },
  { title: 'Programme', value: 'programme' },
  { title: 'Visitors info', value: 'visit' },
  { title: 'Partners', value: 'partners' },
  { title: 'Exhibitors', value: 'exhibitors' },
  { title: 'Guest of honour', value: 'guest-of-honour' },
] as const;
