import { defineMiddleware } from 'astro:middleware';
import type { FilterDefault } from '@sanity/client';
import { sanityClient } from 'sanity:client';
import { runWithPreview } from './lib/previewContext';
import { previewToken, workerEnv } from './server/runtime';
import { readPreviewCookie, verifyPreviewCookie } from './server/preview';
import { runPagesChain } from './server/pagesShim';
import { fail } from './server/http';
import { onRequest as apiGuards } from '../functions/_middleware';

/**
 * Two jobs, both only on the deployed Worker (and `astro dev`):
 *
 *   /preview/…   Let the request in on a valid preview cookie, then render
 *                the page with a drafts-reading, stega-encoding client so the
 *                Studio's Presentation tool can show it and click into it.
 *   /api/…       Run the admin API's guards - security headers, CSRF check,
 *                session lookup - exactly as functions/_middleware.ts does on
 *                Pages, then let the endpoint run with the resolved user.
 *
 * Everything else passes straight through. The static pages are prerendered
 * at build time; this runs for them then too, and does nothing.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (pathname === '/preview' || pathname.startsWith('/preview/')) return preview(context, next);
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/preview/')) return api(context, next);

  return next();
});

type Next = () => Promise<Response>;
type Ctx = Parameters<Parameters<typeof defineMiddleware>[0]>[0];

async function preview(context: Ctx, next: Next): Promise<Response> {
  const token = previewToken();
  if (!token) {
    return new Response('Preview is not configured on this deployment: SANITY_VIEWER_TOKEN is not set.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  if (!(await verifyPreviewCookie(readPreviewCookie(context.request), token))) {
    return new Response(deniedPage(), {
      status: 401,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
    });
  }

  const client = sanityClient.withConfig({
    token,
    useCdn: false,
    perspective: 'drafts',
    stega: { enabled: true, studioUrl: '/studio', filter: stegaFilter },
  });

  // The page is read to the end *inside* the store: Astro streams a
  // response, and the frontmatter that runs the queries executes as the
  // stream is pulled - which would otherwise happen after this returns.
  const response = await runWithPreview(client, async () => {
    const rendered = await next();
    const body = await rendered.text();
    return new Response(body, rendered);
  });

  response.headers.set('cache-control', 'no-store');
  response.headers.set('x-robots-tag', 'noindex, nofollow');
  return response;
}

async function api(context: Ctx, next: Next): Promise<Response> {
  const env = await workerEnv();
  if (!env) return fail(503, 'The admin API only runs on the deployed site.');

  const data = { user: null };
  return runPagesChain(apiGuards as any[], context, {
    env,
    data,
    next: async () => {
      // The guards resolved the session; the endpoint reads it from locals.
      (context.locals as any).user = data.user;
      (context.locals as any).env = env;
      return next();
    },
  });
}

/**
 * Which strings a preview render may stega-encode.
 *
 * The encoding appends invisible characters to a string so the Studio can
 * map it back to its field. That is right for text an editor reads on the
 * page and wrong for a value the page code compares: an encoded "talks" is
 * not "talks", so the Talks tab rendered empty in preview, the partner tabs
 * lost their partners, and every Style setting was ignored. The client's own
 * filter already leaves dates, URLs, slugs and ids alone; this adds every
 * value picked from a fixed list in the schemas, every Style setting, and the
 * few strings that are built into links or ids.
 */
const PLAIN_KEYS = new Set([
  // fixed lists (schemaTypes: options.list)
  'section', 'tier', 'kind', 'family', 'category', 'groups', 'group', 'languages', 'route', 'appliesTo',
  'imageSide', 'aspect', 'display', 'variant', 'layout',
  // Style tab (objects/textStyle.ts), stored under each field's `style`
  'style', 'size', 'weight', 'transform', 'colour', 'background', 'align', 'marginTop', 'marginBottom',
  'lineHeight', 'letterSpacing', 'customSize', 'customColour', 'customBackground',
  // built into ids, codes and links
  'anchor', 'countryCode', 'instagram',
]);

const stegaFilter: FilterDefault = (props) =>
  props.sourcePath.some((segment) => typeof segment === 'string' && PLAIN_KEYS.has(segment))
    ? false
    : props.filterDefault(props);

function deniedPage(): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Preview</title>
<style>body{font-family:system-ui,sans-serif;max-width:36rem;margin:4rem auto;padding:0 1.5rem;line-height:1.5;color:#1a1a1a}a{color:inherit}</style>
</head><body>
<h1>This is a preview address</h1>
<p>It only opens from the Studio, or through a share link the Studio made.</p>
<p><a href="/studio/#/presentation">Open the Studio</a></p>
</body></html>`;
}
