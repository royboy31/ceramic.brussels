/**
 * The menu from the Figma the client signed off.
 *
 * TEMPORARY. The editable navigation document in Sanity does not carry these
 * groups yet - Kamindu is adding them. Until it does this is what the menu
 * shows, so the site matches what the client approved rather than the demo
 * menu that happens to be in the dataset.
 *
 * To retire it: set USE_DESIGN_MENU to false, check the Studio menu reads the
 * way this does, then delete this file and the branch in Base.astro. Nothing
 * else refers to it.
 */
import type { LocaleId } from './locales';

export const USE_DESIGN_MENU = true;

export interface DesignMenuEntry {
  /** STRINGS key for the label. */
  label: string;
  /** STRINGS key for the line underneath, when the design has one. */
  sub?: string;
  /** A built-in section... */
  route?: string;
  /** ...or an editor page, found by its English slug so translations follow. */
  page?: string;
}

export const DESIGN_MENU: DesignMenuEntry[] = [
  { label: 'nav.exhibitors', sub: 'nav.sub.exhibitors', route: 'exhibitors' },
  { label: 'nav.guestOfHonour', route: 'guest-of-honour' },
  { label: 'nav.artPrize', sub: 'nav.sub.awards', route: 'awards' },
  { label: 'nav.programme', sub: 'nav.sub.programme', route: 'programme' },
  { label: 'nav.partners', route: 'partners' },
  { label: 'nav.visitorsInfo', sub: 'nav.sub.visitorsInfo', page: 'visit' },
  { label: 'nav.about', sub: 'nav.sub.about', page: 'about' },
];

/**
 * Resolves an entry to a path. Editor pages have a slug per language, so the
 * English one is used to find the document and the requested language's slug
 * is what gets linked - the menu never sends a French visitor to /fr/visit.
 */
export function resolveDesignEntry(
  entry: DesignMenuEntry,
  lang: LocaleId,
  pages: { slugs: Record<string, string | undefined> }[],
): string | null {
  if (entry.route !== undefined) return entry.route;
  if (!entry.page) return null;

  const match = pages.find((page) => page.slugs.en === entry.page);
  return match?.slugs[lang] ?? match?.slugs.en ?? null;
}
