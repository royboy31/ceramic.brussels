// @ts-check
import { defineConfig } from 'astro/config';
import sanity from '@sanity/astro';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import { loadEnv } from 'vite';
import path from 'node:path';
import { previewRoutes } from './src/integrations/preview-routes.mjs';

// astro.config runs in Node before Astro loads .env, so pull the vars manually.
const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET, PUBLIC_SITE_URL, PREVIEW_RUNTIME } = loadEnv(
  process.env.NODE_ENV ?? 'development',
  process.cwd(),
  '',
);

/**
 * Two shapes of build, chosen by PREVIEW_RUNTIME (wrangler.toml sets it per
 * environment; `.env` for a laptop that can run workerd):
 *
 *   off  Plain static site. Every page is an HTML file, /api is served by
 *        the Pages Functions in `functions/`, and there is no preview.
 *   on   The same static site, plus a Worker that renders /preview/… on
 *        demand from drafts and serves /api itself. scripts/pages-worker.mjs
 *        moves that Worker to dist/_worker.js after the build so Cloudflare
 *        Pages runs it. The Studio gets its Preview tab.
 *
 * It is a switch rather than always-on because the adapter's dev server runs
 * on workerd, which does not start on every machine (see CLAUDE.md); a
 * laptop without it keeps `astro dev` exactly as before.
 */
const previewRuntime = PREVIEW_RUNTIME === '1';

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

  // `output` stays 'static': every page is prerendered; only the routes the
  // preview integration injects with `prerender: false` run on the Worker.
  adapter: previewRuntime
    ? cloudflare({
        // The adapter's Vite plugin refuses a Pages configuration, so the
        // Worker is described separately. Deployment is still Pages.
        configPath: 'wrangler.worker.toml',
        // Prerender in Node, as the plain build does: 700 pages of Sanity
        // fetches, unchanged from today, rather than inside workerd.
        prerenderEnvironment: 'node',
        // Images come from Sanity's CDN already sized; nothing to transform.
        imageService: 'passthrough',
      })
    : undefined,

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
      // Neither the Studio, the sign-in page nor the preview is site content.
      filter: (page) => !page.includes('/studio') && !page.includes('/login') && !page.includes('/preview/'),
    }),
    ...(previewRuntime ? [previewRoutes()] : []),
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
      include: [
        'sanity',
        'sanity/structure',
        'sanity/presentation',
        '@sanity/client',
        '@sanity/ui',
        'styled-components',
        'react-is',
        // The page builder's icons, one subpath each (@sanity/icons 5 has no
        // root export for them).
        ...[
          'BarChart', 'BlockContent', 'Blockquote', 'CodeBlock', 'Component', 'Dashboard', 'DocumentText',
          'HelpCircle', 'Image', 'Images', 'Link', 'Play', 'Sparkles', 'StackCompact', 'Text', 'Users',
        ].map((n) => `@sanity/icons/${n}`),
      ],
    },
    // `cloudflare:workers` only exists inside the Cloudflare build. The plain
    // build never executes the module that imports it (src/server/cfEnv.ts),
    // but Rollup still has to be told not to look for it.
    ...(previewRuntime
      ? {}
      : {
          build: { rollupOptions: { external: ['cloudflare:workers'] } },
          ssr: { external: ['cloudflare:workers'] },
        }),
  },
});
