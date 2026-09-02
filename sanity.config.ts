import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './src/sanity/schemaTypes';
import { structure } from './src/sanity/structure';
import { StudioNavbar } from './src/sanity/components/StudioNavbar';

// Singletons must not be creatable or deletable from the Studio.
const SINGLETONS = new Set(['siteSettings', 'navigation', 'homepage']);

export default defineConfig({
  name: 'ceramic-brussels',
  title: 'Ceramic Brussels',
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  plugins: [structureTool({ structure })],

  // Language selector lives in the Studio chrome, so one choice applies to
  // every localised field in every document.
  studio: {
    components: { navbar: StudioNavbar },
  },

  schema: {
    types: schemaTypes,
    templates: (prev) => prev.filter((t) => !SINGLETONS.has(t.schemaType)),
  },
  document: {
    actions: (prev, { schemaType }) =>
      SINGLETONS.has(schemaType)
        ? prev.filter(({ action }) => action !== 'unpublish' && action !== 'delete' && action !== 'duplicate')
        : prev,
  },
});
