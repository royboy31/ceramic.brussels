import { presentationTool, defineDocuments, defineLocations } from 'sanity/presentation';
import { HUBS } from '../lib/hubs';
import { LISTING_SECTIONS } from './schemaTypes/objects/routes';
import { PREVIEWABLE_TYPES, PREVIEW_ROOT, PREVIEW_SELECT, previewLocations, type PreviewFields } from './previewPaths';

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

const P = PREVIEW_ROOT;
const LANG = '(en|fr|nl)';

/** URL pattern → the document that page is made from. */
const mainDocuments = defineDocuments([
  { route: `${P}/:lang${LANG}`, filter: `_type == "homepage"` },

  // The guest of honour's page is the artist the current edition names.
  {
    route: [`${P}/:lang${LANG}/guest-of-honour`, `${P}/:lang${LANG}/guest-of-honour/:tab`],
    filter: `_type == "artist" && _id == *[_type == "edition" && isCurrent == true][0].guestOfHonour._ref`,
  },

  // Hub tabs: the first tab is the hub root, the others carry their slug.
  ...Object.values(HUBS).filter((hub) => hub.route !== 'guest-of-honour').flatMap((hub) => [
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

  // Listings: the page in that section is the main page wrapping the list.
  ...LISTING_SECTIONS.map((section) => ({
    route: `${P}/:lang${LANG}/${section}`,
    filter: `_type == "page" && section == $section`,
    params: { section },
  })),

  { route: `${P}/:lang${LANG}/artists/:slug`, filter: `_type == "artist" && slug.current == $slug` },
  // A past edition's exhibitor under its year; the current edition's at its slug.
  {
    route: `${P}/:lang${LANG}/exhibitors/:year(\\d{4})/:slug`,
    filter: `_type == "exhibitor" && slug.current == $slug && string(edition->year) == $year`,
  },
  {
    route: `${P}/:lang${LANG}/exhibitors/:slug`,
    filter: `_type == "exhibitor" && slug.current == $slug && edition->isCurrent == true`,
  },
  { route: `${P}/:lang${LANG}/news/:slug`, filter: `_type == "newsItem" && slug.current == $slug` },
  { route: `${P}/:lang${LANG}/editions`, filter: `_type == "edition" && isCurrent == true` },

  // Standalone pages, with a slug in whichever language the URL is in.
  {
    route: `${P}/:lang${LANG}/:slug`,
    filter: `_type == "page" && !defined(section) && (slug.en.current == $slug || slug.fr.current == $slug || slug.nl.current == $slug)`,
  },
]);

/** Document → the preview URLs that show it. The mapping itself lives in
 *  previewPaths.ts, shared with the "Open preview" document action. */
const locations = Object.fromEntries(
  [...PREVIEWABLE_TYPES].map((type) => [
    type,
    defineLocations({
      select: PREVIEW_SELECT,
      resolve: (doc) => {
        const found = previewLocations(type, doc as PreviewFields | null);
        return found.length ? { locations: found } : null;
      },
    }),
  ]),
);

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
