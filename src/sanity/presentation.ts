import { presentationTool, defineDocuments, defineLocations } from 'sanity/presentation';
import { HUBS } from '../lib/hubs';

/**
 * The Preview tab in the Studio.
 *
 * It frames the site's `/preview/…` pages - rendered on demand from drafts -
 * beside the document being edited, refreshes them as the editor types, and
 * lets a click on any text open the field it came from. It can also make a
 * share link, which is how a page goes to a partner for approval before it
 * is published.
 *
 * `mainDocuments` tells the tool which document a preview URL belongs to;
 * `locations` tells it, for a document, which URLs show it. Both mirror the
 * routes under src/pages/[lang]/.
 */

const P = '/preview';
const LANG = '(en|fr|nl)';

/** URL pattern → the document that page is made from. */
const mainDocuments = defineDocuments([
  { route: `${P}/:lang${LANG}`, filter: `_type == "homepage"` },

  // Hub tabs: the first tab is the hub root, the others carry their slug.
  ...Object.values(HUBS).flatMap((hub) => [
    {
      route: `${P}/:lang${LANG}/${hub.route}/:tab`,
      filter: `_type == "page" && section == $section && slug.en.current == $tab`,
      params: { section: hub.route },
    },
    {
      route: `${P}/:lang${LANG}/${hub.route}`,
      filter: `_type == "page" && section == $section && slug.en.current == $tab`,
      params: { section: hub.route, tab: hub.tabs[0].slug },
    },
  ]),

  { route: `${P}/:lang${LANG}/artists/:slug`, filter: `_type == "artist" && slug.current == $slug` },
  { route: `${P}/:lang${LANG}/exhibitors/:slug`, filter: `_type == "exhibitor" && slug.current == $slug` },
  { route: `${P}/:lang${LANG}/news/:slug`, filter: `_type == "newsItem" && slug.current == $slug` },
  { route: `${P}/:lang${LANG}/editions`, filter: `_type == "edition" && isCurrent == true` },

  // Standalone pages, with a slug in whichever language the URL is in.
  {
    route: `${P}/:lang${LANG}/:slug`,
    filter: `_type == "page" && !defined(section) && (slug.en.current == $slug || slug.fr.current == $slug || slug.nl.current == $slug)`,
  },
]);

/** Document → the preview URLs that show it. */
const locations = {
  homepage: defineLocations({
    locations: [{ title: 'Homepage', href: `${P}/en` }],
  }),
  page: defineLocations({
    select: { title: 'title.en', section: 'section', en: 'slug.en.current', fr: 'slug.fr.current', nl: 'slug.nl.current' },
    resolve: (doc) => {
      if (!doc) return null;
      const title = doc.title ?? 'Page';
      if (doc.section) {
        const hub = HUBS[doc.section];
        const first = hub?.tabs[0]?.slug;
        const path = !doc.en || doc.en === first ? doc.section : `${doc.section}/${doc.en}`;
        return { locations: [{ title, href: `${P}/en/${path}` }] };
      }
      return {
        locations: (['en', 'fr', 'nl'] as const)
          .filter((l) => doc[l])
          .map((l) => ({ title: `${title} (${l.toUpperCase()})`, href: `${P}/${l}/${doc[l]}` })),
      };
    },
  }),
  artist: defineLocations({
    select: { name: 'name', slug: 'slug.current' },
    resolve: (doc) =>
      doc?.slug
        ? { locations: [{ title: doc.name ?? 'Artist', href: `${P}/en/artists/${doc.slug}` }, { title: 'Guest of honour page', href: `${P}/en/guest-of-honour` }] }
        : null,
  }),
  exhibitor: defineLocations({
    select: { name: 'name', slug: 'slug.current' },
    resolve: (doc) => (doc?.slug ? { locations: [{ title: doc.name ?? 'Exhibitor', href: `${P}/en/exhibitors/${doc.slug}` }] } : null),
  }),
  newsItem: defineLocations({
    select: { title: 'title.en', slug: 'slug.current' },
    resolve: (doc) => (doc?.slug ? { locations: [{ title: doc.title ?? 'News', href: `${P}/en/news/${doc.slug}` }, { title: 'News list', href: `${P}/en/news` }] } : null),
  }),
  edition: defineLocations({
    locations: [
      { title: 'Homepage', href: `${P}/en` },
      { title: 'Visitors info', href: `${P}/en/visit` },
      { title: 'Past editions', href: `${P}/en/editions` },
    ],
  }),
  siteSettings: defineLocations({ locations: [{ title: 'Homepage', href: `${P}/en` }, { title: 'Visitors info', href: `${P}/en/visit` }] }),
  navigation: defineLocations({ locations: [{ title: 'Homepage', href: `${P}/en` }] }),
  person: defineLocations({ locations: [{ title: 'About – team', href: `${P}/en/about/team` }, { title: 'Art prize – jury', href: `${P}/en/art-prize/jury` }] }),
  partner: defineLocations({ locations: [{ title: 'Partners', href: `${P}/en/partners` }] }),
  programmeEvent: defineLocations({ locations: [{ title: 'Programme', href: `${P}/en/programme` }] }),
  laureate: defineLocations({ locations: [{ title: 'Art prize – laureates', href: `${P}/en/art-prize/laureates` }] }),
};

export const presentation = presentationTool({
  name: 'preview',
  title: 'Preview',
  previewUrl: {
    initial: `${P}/en`,
    previewMode: {
      enable: '/api/preview/enable',
      disable: '/api/preview/disable',
    },
  },
  resolve: { mainDocuments, locations },
});
