import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './src/sanity/schemaTypes';
import { structure } from './src/sanity/structure';
import { StudioNavbar } from './src/sanity/components/StudioNavbar';
import { UsersTool, UsersToolIcon } from './src/sanity/components/UsersTool';
import { duplicateAction } from './src/sanity/components/DuplicateAction';
import { templates } from './src/sanity/templates';
import { applyTemplateAction, saveAsTemplateAction } from './src/sanity/components/TemplateActions';
import { PreviewLauncher, PreviewIcon } from './src/sanity/components/PreviewLauncher';
import { openPreviewAction } from './src/sanity/components/OpenPreviewAction';
import { PREVIEWABLE_TYPES } from './src/sanity/previewPaths';

// Singletons must not be creatable or deletable from the Studio.
const SINGLETONS = new Set(['siteSettings', 'navigation', 'homepage']);

// Types with a section stack, which get "Apply template…" and "Save as template".
const BUILDER_TYPES = new Set(['page', 'homepage', 'artist']);

// The drafts preview only exists on a build with the Cloudflare adapter
// (PREVIEW_RUNTIME=1 sets both, see wrangler.toml). Without it Preview in the
// top bar and "Open preview" would open a 404.
const PREVIEW = import.meta.env.PUBLIC_PREVIEW_ENABLED === 'true';

export default defineConfig({
  name: 'ceramic-brussels',
  title: 'Ceramic Brussels',
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  plugins: [structureTool({ structure })],

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

  tools: (prev) => [
    ...prev,
    /**
     * Preview: the page being edited, from its draft, in a new tab - what
     * "Open preview" in the document's ⋯ menu does, for whatever is open -
     * then back to the editor. It replaced the Presentation tool (editing
     * beside the page in a frame) on 2026-09-11. See PreviewLauncher.tsx.
     */
    ...(PREVIEW ? [{ name: 'preview', title: 'Preview', icon: PreviewIcon, component: PreviewLauncher }] : []),
    /**
     * Site accounts, managed from inside the Studio.
     *
     * They are not Sanity project members: they live in D1 and are administered
     * over /api/users on this same origin. They cannot be documents, because
     * this dataset is ACL-public - it answers queries with no credentials, so a
     * password hash stored in it would be world-readable.
     */
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
      // new tab; it also tells the top bar's Preview what is open. See
      // OpenPreviewAction.tsx.
      return PREVIEW && PREVIEWABLE_TYPES.has(schemaType) ? [...withTemplates, openPreviewAction] : withTemplates;
    },
  },
});
