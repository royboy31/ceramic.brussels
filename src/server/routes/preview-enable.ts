import type { APIRoute } from 'astro';
import { validatePreviewUrl } from '@sanity/preview-url-secret';
import { sanityClient } from 'sanity:client';
import { previewToken } from '../runtime';
import { issuePreviewCookie } from '../preview';

/**
 * GET /api/preview/enable?sanity-preview-secret=…&sanity-preview-pathname=…
 *
 * The door into `/preview/`. The Studio's Presentation tool opens its frame
 * here, and the share links it makes point here too. The secret in the URL
 * is checked against the ones Sanity holds for this project - a forged or
 * expired one is refused - and a valid visitor gets the preview cookie and
 * is sent on to the page they asked for.
 */
export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const token = previewToken();
  if (!token) return new Response('Preview is not configured: SANITY_VIEWER_TOKEN is not set.', { status: 503 });

  const client = sanityClient.withConfig({ token, useCdn: false, perspective: 'raw' });
  const { isValid, redirectTo } = await validatePreviewUrl(client, request.url);
  if (!isValid) return new Response('Invalid or expired preview secret.', { status: 401 });

  // Only ever land inside the preview tree, whatever the link asked for.
  const target = new URL(redirectTo ?? '/preview/en', request.url);
  const pathname = target.pathname.startsWith('/preview') ? target.pathname : `/preview${target.pathname === '/' ? '/en' : target.pathname}`;

  return new Response(null, {
    status: 307,
    headers: {
      location: `${pathname}${target.search}${target.hash}`,
      'set-cookie': await issuePreviewCookie(token),
      'cache-control': 'no-store',
    },
  });
};
