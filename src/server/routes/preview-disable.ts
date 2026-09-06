import type { APIRoute } from 'astro';
import { clearPreviewCookie } from '../preview';

/** GET /api/preview/disable - drop the preview cookie and go to the live site. */
export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const back = new URL(request.url).searchParams.get('to') ?? '/en';
  const location = back.startsWith('/') && !back.startsWith('//') ? back.replace(/^\/preview(?=\/|$)/, '') || '/en' : '/en';
  return new Response(null, {
    status: 307,
    headers: { location, 'set-cookie': clearPreviewCookie(), 'cache-control': 'no-store' },
  });
};
