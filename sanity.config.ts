import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './src/sanity/schemaTypes';
import { structure } from './src/sanity/structure';
import { StudioNavbar } from './src/sanity/components/StudioNavbar';
import { duplicateAction } from './src/sanity/components/DuplicateAction';
import { TAB_TEMPLATE_PREFIX, templates } from './src/sanity/templates';
import { applyTemplateAction, saveAsTemplateAction } from './src/sanity/components/TemplateActions';
import { PreviewLauncher, PreviewIcon } from './src/sanity/components/PreviewLauncher';
import { openPreviewAction } from './src/sanity/components/OpenPreviewAction';
import { VipTool, VipToolIcon } from './src/sanity/components/VipTool';
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
     * VIP guests: the requests the site's "not a VIP yet?" form files, and
     * the guest list behind the VIP hub's codes - in Cloudflare D1, never in
     * this public dataset. Sanity administrators only; the API checks, not
     * this list. It needs the Worker, like Preview. See VipTool.tsx.
     */
    ...(PREVIEW ? [{ name: 'vip', title: 'VIP guests', icon: VipToolIcon, component: VipTool }] : []),
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
    // The per-tab page templates belong to their hub's "Tab intros" pane,
    // not to the navbar's Create menu, where the hub would have to be guessed.
    newDocumentOptions: (prev) => prev.filter((item) => !item.templateId.startsWith(TAB_TEMPLATE_PREFIX)),
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
