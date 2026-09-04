import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './src/sanity/schemaTypes';
import { structure } from './src/sanity/structure';
import { StudioNavbar } from './src/sanity/components/StudioNavbar';
import { UsersTool, UsersToolIcon } from './src/sanity/components/UsersTool';

// Singletons must not be creatable or deletable from the Studio.
const SINGLETONS = new Set(['siteSettings', 'navigation', 'homepage']);

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
    templates: (prev) => prev.filter((t) => !SINGLETONS.has(t.schemaType)),
  },
  document: {
    actions: (prev, { schemaType }) =>
      SINGLETONS.has(schemaType)
        ? prev.filter(({ action }) => action !== 'unpublish' && action !== 'delete' && action !== 'duplicate')
        : prev,
  },
});
