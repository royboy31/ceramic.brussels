// @ts-check
import { defineConfig } from 'astro/config';
import sanity from '@sanity/astro';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';
import path from 'node:path';

// astro.config runs in Node before Astro loads .env, so pull the vars manually.
const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET, PUBLIC_SITE_URL } = loadEnv(
  process.env.NODE_ENV ?? 'development',
  process.cwd(),
  '',
);

/**
 * Windows fix for @sanity/astro 3.5.1.
 *
 * Its `sanity:module-dedupe` plugin aliases `sanity` and `styled-components` to
 * their package directories by stripping `/package.json` off a require.resolve()
 * result with a forward-slash regex. On Windows require.resolve() returns
 * backslashes, so the regex never matches and the alias points at package.json
 * itself — every `import ... from 'sanity'` then resolves to a JSON file. That
 * is what left /studio blank and made the dep optimizer fail with hundreds of
 * "X is not exported by node_modules/sanity/package.json" errors.
 *
 * enforce: 'post' so this config hook runs after theirs and can repair the
 * alias entries they added.
 */
function fixSanityWindowsAlias() {
  return {
    name: 'fix-sanity-windows-alias',
    enforce: 'post',
    config(cfg) {
      const alias = cfg.resolve?.alias;
      const entries = Array.isArray(alias)
        ? alias
        : Object.entries(alias ?? {}).map(([find, replacement]) => ({ find, replacement }));
      for (const entry of entries) {
        if (typeof entry.replacement === 'string' && entry.replacement.endsWith('package.json')) {
          entry.replacement = path.dirname(entry.replacement);
        }
      }
      return { resolve: { alias: entries } };
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: PUBLIC_SITE_URL || 'https://www.ceramic.brussels',

  // Deliberately NOT using Astro's built-in `i18n` config. Enabling it makes the
  // dev server 404 the /studio route that @sanity/astro injects (the static
  // build still emits it, so the breakage only shows up in dev). Locale routing
  // is handled by the [lang] segment plus src/lib/locales.ts instead, which is
  // all this site needed from it.
  redirects: {
    '/': '/en',
  },

  integrations: [
    sanity({
      projectId: PUBLIC_SANITY_PROJECT_ID,
      dataset: PUBLIC_SANITY_DATASET,
      // false = always hit the live API. Switch to true once content is stable
      // and you want the cached CDN edge (faster, ~60s staleness).
      useCdn: false,
      // Studio is served from this route.
      studioBasePath: '/studio',
      // Log every server-side Sanity request during `astro dev`.
      logClientRequests: 'dev',
    }),
    react(),
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', fr: 'fr', nl: 'nl' },
      },
      filter: (page) => !page.includes('/studio'),
    }),
  ],
  vite: {
    plugins: [fixSanityWindowsAlias()],
    optimizeDeps: {
      // The Studio lazy-loads its panes. Without this, Vite only discovers those
      // chunks when you first click into one, re-optimises, and changes the dep
      // hash under a page that is already holding the old one - which shows up
      // as "Failed to fetch dynamically imported module .../deps/pane-*.js" and
      // an endless reload loop. Pre-bundling them at server start avoids the
      // mid-session re-optimise entirely.
      include: ['sanity', 'sanity/structure', '@sanity/client', 'styled-components', 'react-is'],
    },
  },
});
