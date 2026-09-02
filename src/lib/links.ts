import type { LocaleId } from './locales';
import { localePath } from './i18n';
import { hubTabPath } from './hubs';

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
    const path = doc._type === 'partner' ? base : [base, doc.slug].filter(Boolean).join('/');
    return { href: localePath(lang, path), label, external: false, arrow: '→' };
  }

  // 'route', and anything unset, points at a built-in section.
  const route = link.route ?? '';
  const path = link.anchor ? hubTabPath(route, link.anchor) : route;
  return { href: localePath(lang, path), label, external: false, arrow: '→' };
}

/** Same for navigation items, which use `page`/`url` rather than `internal`/`external`. */
export function resolveNavItem(lang: LocaleId, item: any): ResolvedLink | null {
  if (!item?.label) return null;
  if (item.kind === 'external') {
    return item.url ? { href: item.url, label: item.label, external: true, arrow: '↗' } : null;
  }
  if (item.kind === 'page') {
    return item.pageSlug
      ? { href: localePath(lang, item.pageSlug), label: item.label, external: false, arrow: '→' }
      : null;
  }
  const route = item.route ?? '';
  const path = item.anchor ? hubTabPath(route, item.anchor) : route;
  return { href: localePath(lang, path), label: item.label, external: false, arrow: '→' };
}

/** "Artist, *Title*, 2024" from a figure's caption parts, as plain strings. */
export function captionParts(image: any): { caption?: string; workTitle?: string; year?: string; credit?: string } {
  if (!image) return {};
  return { caption: image.caption, workTitle: image.workTitle, year: image.year, credit: image.credit };
}

export function instagramUrl(handle: string | undefined): string | undefined {
  if (!handle) return undefined;
  if (/^https?:\/\//.test(handle)) return handle;
  return `https://www.instagram.com/${handle.replace(/^@/, '')}/`;
}
