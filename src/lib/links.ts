import type { LocaleId } from './locales';
import { localePath } from './i18n';
import { HUBS, hubTabPath } from './hubs';

/**
 * Turns a `link` object from Sanity (see src/sanity/schemaTypes/objects/link.ts)
 * into something a template can drop into an <a>. Internal links get "→",
 * external ones "↗", as in the design.
 */
export interface ResolvedLink {
  href: string;
  label: string;
  external: boolean;
  arrow: '→' | '↗';
}

const DOC_ROUTES: Record<string, string> = {
  exhibitor: 'exhibitors',
  artist: 'artists',
  newsItem: 'news',
  page: '',
  partner: 'partners',
};

const LISTINGS = ['exhibitors', 'artists', 'news', 'contact'];

/**
 * Where an exhibitor's page is: the current edition's at /exhibitors/<slug>,
 * a past edition's under its year, as the old site's year lists had them.
 */
export function exhibitorPath(ex: { slug?: string; year?: number; current?: boolean }): string {
  return ex.current || !ex.year ? `exhibitors/${ex.slug}` : `exhibitors/${ex.year}/${ex.slug}`;
}

/**
 * Where a `page` document is shown: a hub tab at its hub's path, a listing's
 * main page at the listing, a standalone page at its own slug. Linking to a
 * tab's page by its slug alone gave /en/the-fair, which no route builds.
 */
export function pagePath(doc: { section?: string; tab?: string; slug?: string }): string {
  if (!doc.section) return doc.slug ?? '';
  if (LISTINGS.includes(doc.section)) return doc.section;
  return hubTabPath(doc.section, doc.tab);
}

export function resolveLink(lang: LocaleId, link: any): ResolvedLink | null {
  if (!link) return null;
  const label = link.label ?? '';

  if (link.kind === 'external') {
    if (!link.external) return null;
    return { href: link.external, label, external: true, arrow: '↗' };
  }

  if (link.kind === 'internal') {
    const doc = link.internal;
    if (!doc) return null;
    const base = DOC_ROUTES[doc._type];
    if (base === undefined) return null;
    const path =
      doc._type === 'partner'
        ? base
        : doc._type === 'exhibitor'
          ? exhibitorPath(doc)
          : doc._type === 'page'
            ? pagePath(doc)
            : [base, doc.slug].filter(Boolean).join('/');
    return { href: localePath(lang, path), label, external: false, arrow: '→' };
  }

  // 'route', and anything unset, points at a built-in section.
  return { href: localePath(lang, routePath(link.route ?? '', link.anchor)), label, external: false, arrow: '→' };
}

/**
 * A built-in route with its "tab or anchor": a hub's tab, or on a route
 * without tabs a sub-page - "exhibitors" + "2026" is the 2026 exhibitor list.
 */
function routePath(route: string, anchor?: string): string {
  if (!anchor) return route;
  return HUBS[route] ? hubTabPath(route, anchor) : `${route}/${anchor}`;
}

/** Same for navigation items, which use `page`/`url` rather than `internal`/`external`. */
export function resolveNavItem(lang: LocaleId, item: any): ResolvedLink | null {
  if (!item?.label) return null;
  if (item.kind === 'external') {
    return item.url ? { href: item.url, label: item.label, external: true, arrow: '↗' } : null;
  }
  if (item.kind === 'page') {
    if (!item.pageSlug && !item.pageSection) return null;
    const path = pagePath({ section: item.pageSection, tab: item.pageTab, slug: item.pageSlug });
    return { href: localePath(lang, path), label: item.label, external: false, arrow: '→' };
  }
  return { href: localePath(lang, routePath(item.route ?? '', item.anchor)), label: item.label, external: false, arrow: '→' };
}

/** "Artist, *Title*, 2024" from a figure's caption parts, as plain strings. */
export function captionParts(image: any): { caption?: string; workTitle?: string; year?: string; credit?: string } {
  if (!image) return {};
  return { caption: image.caption, workTitle: image.workTitle, year: image.year, credit: image.credit };
}

export function instagramUrl(handle: string | undefined): string | undefined {
  if (!handle) return undefined;
  const h = handle.trim();
  if (/^https?:\/\//.test(h)) return h;
  // "instagram.com/name" and "www.instagram.com/name/" as well as "@name" and "name".
  const name = h.replace(/^(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/+$/, '');
  return `https://www.instagram.com/${name}/`;
}

/**
 * A link typed into rich text as it would be typed into a browser:
 * "www.art-sc.com", "instagram.com/jules_bouteleux/", "vip@ceramic.brussels",
 * with stray spaces. Without a scheme the browser reads such an href as a
 * path on this site and lands on a 404 (the laureates page did), so bare
 * domains get https:// and bare addresses mailto:. Anything else is kept.
 */
export function normalizeHref(href: string | undefined): string | undefined {
  const h = href?.trim();
  if (!h) return undefined;
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(h)) return h;
  if (/^[^\s@/]+@[^\s@/]+\.[a-z]{2,}$/i.test(h)) return `mailto:${h}`;
  if (/^[\w-]+(\.[\w-]+)+(\/|$|\?)/.test(h)) return `https://${h}`;
  return h;
}
