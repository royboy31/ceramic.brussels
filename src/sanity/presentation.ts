import { presentationTool, defineDocuments, defineLocations } from 'sanity/presentation';
import { HUBS } from '../lib/hubs';
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
