import { LOCALE_IDS, type LocaleId } from './locales';
import { localePath } from './i18n';
import { HUBS, hubFromSegment, hubTabPath, tabFromSegment } from './hubs';

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
export function pagePath(doc: { section?: string; tab?: string; slug?: string }, lang?: LocaleId): string {
  if (!doc.section) return doc.slug ?? '';
  if (LISTINGS.includes(doc.section)) return doc.section;
  return hubTabPath(doc.section, doc.tab, lang);
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
            ? pagePath(doc, lang)
            : [base, doc.slug].filter(Boolean).join('/');
    return { href: localePath(lang, path), label, external: false, arrow: '→' };
  }

  // 'route', and anything unset, points at a page of this site: `path` as
  // picked or typed in the Studio, or the older section + tab pair.
  const href = link.path ? sitePath(link.path, lang) : localePath(lang, routePath(link.route ?? '', link.anchor, lang));
  return href ? { href, label, external: false, arrow: '→' } : null;
}

/**
 * A "link to this site" mark in rich text: a document, whose place `targets`
 * (from getLinkTargets) knows, or a path the editor picked from the Studio's
 * list or typed. Null when neither leads anywhere - an unset mark, a deleted
 * or unpublished document - so the text renders without a dead anchor.
 */
export function resolveTextLink(lang: LocaleId, mark: any, targets?: Map<string, any>): ResolvedLink | null {
  const ref = mark?.internal?._ref;
  if (ref) {
    const internal = targets?.get(ref);
    return internal ? resolveLink(lang, { kind: 'internal', internal }) : null;
  }
  const href = sitePath(mark?.path, lang);
  return href ? { href, label: '', external: false, arrow: '→' } : null;
}

const OWN_HOST = /^https?:\/\/([\w-]+\.)*ceramic(\.brussels|-brussels\.pages\.dev)(?=\/|$|#|\?)/i;

/**
 * A path on this site as an editor gives it, as the same page's path in
 * `lang`. It may come from the Studio's list ("art-prize/laureates",
 * "exhibitors/2025") or be typed in any language, with or without the
 * address in front ("https://ceramic.brussels/fr/a-propos/equipe"). Hub and
 * tab segments are read back to their identifiers in whichever language they
 * are written and put out in `lang`, so a French address in an English text
 * lands on the English page. The rest is kept as typed. Null for another
 * site's address - that is an External link.
 */
export function sitePath(input: string | undefined, lang: LocaleId): string | null {
  if (typeof input !== 'string' || !input.trim()) return null;
  const own = input.trim().replace(OWN_HOST, '');
  if (/^[a-z][a-z\d+.-]*:/i.test(own) || own.startsWith('//')) return null;

  const hashAt = own.indexOf('#');
  const hash = hashAt === -1 ? '' : own.slice(hashAt);
  const segments = (hashAt === -1 ? own : own.slice(0, hashAt)).split('?')[0].split('/').filter(Boolean);
  if ((LOCALE_IDS as readonly string[]).includes(segments[0])) segments.shift();

  const [first, second, ...rest] = segments;
  const hub = first && (HUBS[first] ? first : LOCALE_IDS.map((l) => hubFromSegment(first, l)).find(Boolean));
  let path = segments.join('/');
  if (hub) {
    const tab = second
      ? (LOCALE_IDS.map((l) => tabFromSegment(hub, second, l)).find((t) => HUBS[hub].tabs.some((x) => x.slug === t)) ??
        second)
      : undefined;
    path = [hubTabPath(hub, tab, lang), ...rest].join('/');
  }
  return localePath(lang, path) + hash;
}

/**
 * A built-in route with its "tab or anchor": a hub's tab, or on a route
 * without tabs a sub-page - "exhibitors" + "2026" is the 2026 exhibitor list.
 */
function routePath(route: string, anchor?: string, lang?: LocaleId): string {
  if (HUBS[route]) return hubTabPath(route, anchor, lang);
  if (!anchor) return route;
  return `${route}/${anchor}`;
}

/** Same for navigation items, which use `page`/`url` rather than `internal`/`external`. */
export function resolveNavItem(lang: LocaleId, item: any): ResolvedLink | null {
  if (!item?.label) return null;
  if (item.kind === 'external') {
    return item.url ? { href: item.url, label: item.label, external: true, arrow: '↗' } : null;
  }
  if (item.kind === 'page') {
    if (!item.pageSlug && !item.pageSection) return null;
    const path = pagePath({ section: item.pageSection, tab: item.pageTab, slug: item.pageSlug }, lang);
    return { href: localePath(lang, path), label: item.label, external: false, arrow: '→' };
  }
  const href = item.path ? sitePath(item.path, lang) : localePath(lang, routePath(item.route ?? '', item.anchor, lang));
  return href ? { href, label: item.label, external: false, arrow: '→' } : null;
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
  // A page of this site typed as a path ("/en/art-prize"): give it the
  // trailing slash Pages serves, so the link is not a redirect (see localePath).
  if (/^\/(en|fr|nl)(\/|$)/.test(h)) return h.replace(/^([^#?]*?)\/?(?=[#?]|$)/, '$1/');
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(h)) return h;
  if (/^[^\s@/]+@[^\s@/]+\.[a-z]{2,}$/i.test(h)) return `mailto:${h}`;
  if (/^[\w-]+(\.[\w-]+)+(\/|$|\?)/.test(h)) return `https://${h}`;
  return h;
}
