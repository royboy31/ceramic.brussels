import { HUBS } from '../lib/hubs';
import { useTranslations } from '../lib/i18n';
import { exhibitorPath, partnerPath } from '../lib/links';

/**
 * What the "link to this site" search box offers (components/SiteLinkInput.tsx).
 *
 * Two kinds of destination. Pages the code builds - the homepage, every hub
 * tab, the listings, a past year's lists - are offered as a path, in the
 * same "hub/tab" identifiers the site's routes use, so links.ts `sitePath`
 * can write each one out in the reading page's language. Documents with a
 * page of their own are offered as themselves and stored as a reference,
 * which keeps following the document when its slug changes.
 *
 * Labels are the English ones the site shows, taken from the same STRINGS,
 * so the list reads like the menu and the tabs.
 */

export interface SiteLinkOption {
  /** "path:<path>" or "doc:<id>" - what the Autocomplete selects. */
  value: string;
  title: string;
  /** What kind of thing it is, shown beside the title. */
  group: string;
  /** The English path, shown under the title. */
  path: string;
}

const t = useTranslations('en');

const pathOption = (path: string, title: string, group = 'Page'): SiteLinkOption => ({
  value: `path:${path}`,
  title,
  group,
  path: `/${path}`,
});

/** Every page built from code, for the years that have an archive. */
export function pageOptions(pastYears: number[]): SiteLinkOption[] {
  const options: SiteLinkOption[] = [pathOption('', 'Homepage')];

  for (const hub of Object.values(HUBS)) {
    const hubTitle = t(hub.title);
    // A tab that leads to another hub has no page of its own.
    hub.tabs
      .filter((tab) => !tab.link)
      .forEach((tab, i) => {
        options.push(
          i === 0 ? pathOption(hub.route, hubTitle) : pathOption(`${hub.route}/${tab.slug}`, `${hubTitle} – ${t(tab.label)}`),
        );
      });
  }

  options.push(
    pathOption('exhibitors', t('nav.exhibitors')),
    pathOption('exhibitors/awards', `${t('nav.exhibitors')} – ${t('nav.awards')}`),
    pathOption('artists', t('nav.artists')),
    pathOption('news', t('nav.news')),
    pathOption('editions', t('nav.editions')),
  );

  for (const year of pastYears) {
    options.push(
      pathOption(`editions/${year}`, `${t('nav.editions')} – ${year}`, 'Past year'),
      pathOption(`exhibitors/${year}`, `${t('nav.exhibitors')} – ${year}`, 'Past year'),
    );
  }

  return options;
}

/** The documents the box lists: those with a page, less a hub's own tab pages (listed above as paths). */
export const DOCUMENTS_QUERY = `{
  // No artists: they have no page since 2026-09-22 - link the gallery instead.
  "docs": *[_type in ["page", "exhibitor", "newsItem", "partner"]
    && !(_id in path("drafts.**"))
    && !(_type == "page" && defined(section))]{
    _id,
    _type,
    "title": coalesce(name, title.en, title),
    "slug": coalesce(slug.current, slug.en.current),
    tier,
    "year": edition->year,
    "current": edition->isCurrent == true
  } | order(_type asc, title asc),
  "years": *[_type == "edition" && isCurrent != true && !(_id in path("drafts.**"))] | order(year desc).year
}`;

const DOC_GROUPS: Record<string, string> = {
  exhibitor: 'Exhibitor',
  newsItem: 'News',
  page: 'Page',
  partner: 'Partner',
};

/** One document as an option, or null when it has no address yet (no slug). */
export function documentOption(doc: any): SiteLinkOption | null {
  const title = typeof doc.title === 'string' && doc.title ? doc.title : '(untitled)';
  const option = (path: string, group = DOC_GROUPS[doc._type]): SiteLinkOption => ({
    value: `doc:${doc._id}`,
    title,
    group,
    path,
  });
  if (doc._type === 'partner') return option(`/${partnerPath(doc)}`);
  if (!doc.slug) return null;
  switch (doc._type) {
    case 'exhibitor':
      return option(`/${exhibitorPath(doc)}`, doc.year ? `Exhibitor ${doc.year}` : 'Exhibitor');
    case 'newsItem':
      return option(`/news/${doc.slug}`);
    case 'page':
      return option(`/${doc.slug}`);
    default:
      return null;
  }
}
