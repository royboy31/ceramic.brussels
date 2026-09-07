import { HUBS } from '../lib/hubs';
import type { LocaleId } from '../lib/locales';

/**
 * Which `/preview/…` pages show a given document.
 *
 * Shared by the Presentation tool (its "locations" banner, see
 * presentation.ts) and the "Open preview" document action, so the two can
 * never disagree about where a document is previewed. Both mirror the
 * routes under src/pages/[lang]/.
 */

export const PREVIEW_ROOT = '/preview';

export interface PreviewLocation {
  title: string;
  href: string;
}

/**
 * The fields the resolver needs, flattened. Presentation's `select` produces
 * exactly this shape; `previewFields()` derives it from a whole document.
 */
export interface PreviewFields {
  title?: string | null;
  name?: string | null;
  section?: string | null;
  en?: string | null;
  fr?: string | null;
  nl?: string | null;
  slug?: string | null;
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
} as const;

/** Flattens a raw document into PreviewFields. */
export function previewFields(doc: Record<string, any>): PreviewFields {
  const title = doc.title;
  const slug = doc.slug ?? {};
  return {
    title: typeof title === 'string' ? title : title?.en ?? null,
    name: typeof doc.name === 'string' ? doc.name : null,
    section: doc.section ?? null,
    en: slug.en?.current ?? null,
    fr: slug.fr?.current ?? null,
    nl: slug.nl?.current ?? null,
    slug: typeof slug.current === 'string' ? slug.current : null,
  };
}

/** Pages that do not depend on the document's own fields. */
const FIXED: Record<string, PreviewLocation[]> = {
  homepage: [{ title: 'Homepage', href: '' }],
  edition: [
    { title: 'Homepage', href: '' },
    { title: 'Visitors info', href: '/visit' },
    { title: 'Past editions', href: '/editions' },
  ],
  siteSettings: [
    { title: 'Homepage', href: '' },
    { title: 'Visitors info', href: '/visit' },
  ],
  navigation: [{ title: 'Homepage', href: '' }],
  person: [
    { title: 'About – team', href: '/about/team' },
    { title: 'Art prize – jury', href: '/art-prize/jury' },
  ],
  partner: [{ title: 'Partners', href: '/partners' }],
  programmeEvent: [{ title: 'Programme', href: '/programme' }],
  laureate: [{ title: 'Art prize – laureates', href: '/art-prize/laureates' }],
};

/** The types that have a preview at all. */
export const PREVIEWABLE_TYPES = new Set([...Object.keys(FIXED), 'page', 'artist', 'exhibitor', 'newsItem']);

/**
 * The preview pages for a document of `type`, in `lang`. The first entry is
 * the page the document most directly is; the rest are lists it appears in.
 * Empty when the document cannot be previewed yet, e.g. a page with no slug.
 */
export function previewLocations(type: string, doc: PreviewFields | null | undefined, lang: LocaleId = 'en'): PreviewLocation[] {
  const at = (path: string, l: LocaleId = lang) => `${PREVIEW_ROOT}/${l}${path}`;

  const fixed = FIXED[type];
  if (fixed) return fixed.map(({ title, href }) => ({ title, href: at(href) }));
  if (!doc) return [];

  switch (type) {
    case 'page': {
      const title = doc.title ?? 'Page';
      if (doc.section) {
        // Hub tabs: the first tab is the hub root, the others carry their
        // English slug whatever the language of the page.
        const hub = HUBS[doc.section];
        if (!hub) return [];
        const first = hub.tabs[0]?.slug;
        const path = !doc.en || doc.en === first ? doc.section : `${doc.section}/${doc.en}`;
        return [{ title, href: at(`/${path}`) }];
      }
      // Standalone pages have a slug per language, so the URL is translated
      // too. The wanted language first, when it has a slug.
      const order = [lang, ...(['en', 'fr', 'nl'] as const).filter((l) => l !== lang)];
      return order
        .filter((l) => doc[l])
        .map((l) => ({ title: `${title} (${l.toUpperCase()})`, href: at(`/${doc[l]}`, l) }));
    }
    case 'artist':
      return doc.slug
        ? [
            { title: doc.name ?? 'Artist', href: at(`/artists/${doc.slug}`) },
            { title: 'Guest of honour page', href: at('/guest-of-honour') },
          ]
        : [];
    case 'exhibitor':
      return doc.slug ? [{ title: doc.name ?? 'Exhibitor', href: at(`/exhibitors/${doc.slug}`) }] : [];
    case 'newsItem':
      return doc.slug
        ? [
            { title: doc.title ?? 'News', href: at(`/news/${doc.slug}`) },
            { title: 'News list', href: at('/news') },
          ]
        : [];
    default:
      return [];
  }
}
