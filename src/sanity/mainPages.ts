import { HUBS } from '../lib/hubs';
import { LISTING_SECTIONS, PAGE_SECTIONS } from './schemaTypes/objects/routes';

/**
 * The main pages of the site, as the Studio's sidebar lists them next to
 * Homepage: one entry per top-level route, opening the document that page is
 * made from - the way Homepage opens its singleton.
 *
 * For a hub (about, art prize…) that document is the first tab's page: the
 * hub URL is the first tab, so /en/about and "the fair" are one page and
 * there is no separate parent. For a listing (exhibitors, artists, news) it
 * is the one page in that section, whose lead, SEO and section stack wrap the
 * list the route generates; the list stays code.
 *
 * No document is hard-wired. structure.ts looks the current one up when the
 * sidebar is built (a hub's root is whichever page carries the first tab's
 * slug), and when a section has none yet the entry opens a fresh document
 * with a fixed id and the `page-main` template, so the first click creates
 * it in the right place. Every main page has a stack of its own; applying a
 * template copies blocks in, so editing one page never changes another.
 */
export interface MainPage {
  title: string;
  section: string;
  /** English slug the document must carry: the hub's first tab, or the route itself. */
  slug: string;
  /** Document id used when the section has no page yet. */
  fallbackId: string;
}

/** Sidebar order: the site's own, as the menu reads. */
const ORDER = ['exhibitors', 'artists', 'guest-of-honour', 'art-prize', 'programme', 'partners', 'visit', 'about', 'news', 'contact'];

export const MAIN_PAGES: MainPage[] = ORDER.map((section) => {
  const entry = PAGE_SECTIONS.find((s) => s.value === section);
  if (!entry) throw new Error(`mainPages: "${section}" is not in PAGE_SECTIONS`);
  return {
    title: entry.title,
    section,
    slug: HUBS[section]?.tabs[0]?.slug ?? section,
    fallbackId: `main-${section}`,
  };
});

export const isListingSection = (section: string) => (LISTING_SECTIONS as readonly string[]).includes(section);
