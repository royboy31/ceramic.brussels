import fs from 'node:fs';
import path from 'node:path';
import { accessPaths, lockedPaths } from '../lib/hubs';
import { platformPaths } from '../lib/exhibitorsPlatform';

/**
 * The VIP hub's server side, on every build (docs/vip-access.md).
 *
 * 1. With the preview runtime on (`onDemand`), the locked tabs are mounted
 *    as an on-demand route, `/[lang]/vip/[tab]` → src/server/routes/
 *    vip-tab.astro, which renders the ordinary hub route once
 *    src/middleware.ts has let the request in; and the three API routes
 *    under `/api/vip/`. Without the runtime there is nothing to run them
 *    in, and the locked tabs are simply not built (hubs.ts).
 *
 * 2. After the build, the paths the Worker must own - every locked tab in
 *    every language - and the access page's paths are written to
 *    `dist/_vip-paths.json` for scripts/pages-worker.mjs, which adds them to
 *    `_routes.json` and to robots.txt. Written here because hubs.ts is
 *    TypeScript: Astro's config bundler reads it, a plain Node script
 *    would not.
 */
export function vipRoutes({ onDemand = false } = {}) {
  return {
    name: 'ceramic-brussels:vip-routes',
    hooks: {
      'astro:config:setup': ({ injectRoute, logger }) => {
        if (!onDemand) return;
        injectRoute({ pattern: '/[lang]/vip/[tab]', entrypoint: './src/server/routes/vip-tab.astro', prerender: false });
        injectRoute({ pattern: '/api/vip/enter', entrypoint: './src/server/routes/vip-enter.ts', prerender: false });
        injectRoute({ pattern: '/api/vip/leave', entrypoint: './src/server/routes/vip-leave.ts', prerender: false });
        injectRoute({ pattern: '/api/vip/request', entrypoint: './src/server/routes/vip-request.ts', prerender: false });
        // The guest list, for the Studio's VIP tool (Sanity administrators only).
        injectRoute({ pattern: '/api/vip/admin', entrypoint: './src/server/routes/vip-admin.ts', prerender: false });
        logger.info('VIP locked tabs mounted on request at /[lang]/vip/[tab], plus /api/vip/ and /[lang]/exhibitors/platform');
      },
      // The exhibitors platform: one address, form or page by session
      // (docs/exhibitors-platform.md). The route is the one file
      // src/pages/[lang]/exhibitors/platform.astro - injecting a second route
      // on the same pattern put two entries in the Worker's manifest and the
      // file-based one, carrying no styles, won the match: the platform
      // rendered bare HTML. So with the runtime on, that file itself goes
      // on-demand here; without it, its getStaticPaths [] builds nothing.
      'astro:route:setup': ({ route }) => {
        if (onDemand && route.component.replace(/\\/g, '/').endsWith('src/pages/[lang]/exhibitors/platform.astro')) {
          route.prerender = false;
        }
      },
      'astro:build:done': ({ logger }) => {
        const out = path.resolve('dist', '_vip-paths.json');
        fs.mkdirSync(path.dirname(out), { recursive: true });
        // The platform paths ride in `locked`: scripts/pages-worker.mjs sends
        // those to the Worker in _routes.json and disallows them in robots.txt,
        // which is exactly what the platform needs too.
        fs.writeFileSync(
          out,
          JSON.stringify({ locked: [...lockedPaths(), ...platformPaths()], access: accessPaths() }, null, 2) + '\n',
        );
        logger.info(`wrote ${path.relative(process.cwd(), out)}`);
      },
    },
  };
}
