import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './src/sanity/schemaTypes';
import { structure } from './src/sanity/structure';
import { StudioNavbar } from './src/sanity/components/StudioNavbar';
import { UsersTool, UsersToolIcon } from './src/sanity/components/UsersTool';
import { duplicateAction } from './src/sanity/components/DuplicateAction';
import { templates } from './src/sanity/templates';
import { applyTemplateAction, saveAsTemplateAction } from './src/sanity/components/TemplateActions';
import { presentation } from './src/sanity/presentation';
import { openPreviewAction } from './src/sanity/components/OpenPreviewAction';
import { PREVIEWABLE_TYPES } from './src/sanity/previewPaths';

// Singletons must not be creatable or deletable from the Studio.
const SINGLETONS = new Set(['siteSettings', 'navigation', 'homepage']);

// Types with a section stack, which get "Apply template…" and "Save as template".
const BUILDER_TYPES = new Set(['page', 'homepage', 'artist']);

// The drafts preview only exists on a build with the Cloudflare adapter
// (PREVIEW_RUNTIME=1 sets both, see wrangler.toml). Without it the Preview
// tab would frame a 404, and "Open preview" would open one.
const PREVIEW = import.meta.env.PUBLIC_PREVIEW_ENABLED === 'true';

/**
 * "Open in Studio" on a preview page opened in its own tab carries the page
 * it came from as `preview=`. On a hash-routed Studio like this one,
 * @sanity/visual-editing puts it into the query *inside* the hash
 * (`/studio/#/intent/edit/…?preview=…`), but the Preview tool reads it only
 * from the real query string, so it opened the right field beside the site
 * root instead of that page. Move it out before the Studio's router reads the
 * URL - as a same-origin path, which is what the tool frames.
 */
if (typeof window !== 'undefined') {
  const [route, query] = window.location.hash.split('?');
  const wanted = route.startsWith('#/intent/') && query ? new URLSearchParams(query).get('preview') : null;
  const search = new URLSearchParams(window.location.search);
  if (wanted && !search.has('preview')) {
    try {
      const url = new URL(wanted, window.location.origin);
      if (url.origin === window.location.origin) {
        search.set('preview', url.pathname + url.search);
        window.history.replaceState(window.history.state, '', `${window.location.pathname}?${search}${window.location.hash}`);
      }
    } catch {
      // Not a URL: leave it to the tool's own fallback.
    }
  }
}

export default defineConfig({
  name: 'ceramic-brussels',
  title: 'Ceramic Brussels',
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  plugins: [structureTool({ structure }), ...(PREVIEW ? [presentation] : [])],

  /**
   * Site accounts get their own button on the Studio's login screen, pointing
   * at /login. The function form adds to the providers Sanity returns rather
   * than replacing them - a static array would drop Google and GitHub, and
   * lock out the project's actual members.
   *
   * The Studio appends ?origin=<the page that was wanted> to this URL, and
   * /login sends the person back there once it has a token for them.
   */
  auth: {
    providers: (prev) => [...prev, { name: 'site', title: 'Ceramic Brussels account', url: '/login' }],
  },

  /**
   * Site accounts, managed from inside the Studio.
   *
   * They are not Sanity project members: they live in D1 and are administered
   * over /api/users on this same origin. They cannot be documents, because
   * this dataset is ACL-public - it answers queries with no credentials, so a
   * password hash stored in it would be world-readable.
   */
  tools: (prev) => [
    ...prev,
    {
      name: 'users',
      title: 'Users',
      // Without an icon the navbar renders the tool as bare text next to
      // Structure, which is easy to miss entirely.
      icon: UsersToolIcon,
      component: UsersTool,
    },
  ],

  // Language selector lives in the Studio chrome, so one choice applies to
  // every localised field in every document.
  studio: {
    components: { navbar: StudioNavbar },
  },

  schema: {
    types: schemaTypes,
    // Singletons cannot be created at all; everything else gets the starting
    // points in templates.ts alongside Sanity's bare "new document".
    templates: (prev) => [...prev.filter((t) => !SINGLETONS.has(t.schemaType)), ...templates],
  },
  document: {
    actions: (prev, { schemaType }) => {
      const base = SINGLETONS.has(schemaType)
        ? prev.filter(({ action }) => action !== 'unpublish' && action !== 'delete' && action !== 'duplicate')
        : // Our duplicate in place of the built-in, which copies the slug too and
          // leaves two documents claiming one URL. See DuplicateAction.tsx.
          prev.map((action) => (action.action === 'duplicate' ? duplicateAction : action));
      // The page builder's template actions, on every type that has a
      // sections stack. The components return null elsewhere, so listing
      // them broadly is harmless; the set keeps the menu short.
      const withTemplates = BUILDER_TYPES.has(schemaType) ? [...base, applyTemplateAction, saveAsTemplateAction] : base;
      // "Open preview" - the page this document makes, from its draft, in a
      // new tab. Same routes as the Preview tab; see OpenPreviewAction.tsx.
      return PREVIEW && PREVIEWABLE_TYPES.has(schemaType) ? [...withTemplates, openPreviewAction] : withTemplates;
    },
  },
});
