import { csrfProblem, fail, type Env, type SessionUser } from '../src/server/http';
import { currentUser } from '../src/server/session';
import { verifySanityAdmin } from '../src/server/sanityIdentity';

/**
 * Runs before every Function. Three jobs:
 *
 *   1. security headers on admin responses
 *   2. CSRF check on anything that writes
 *   3. resolve the session once, and refuse unauthenticated API calls here
 *      rather than in each route - a route that forgets the check is the
 *      classic way an admin API leaks
 *
 * Only /api/* and /admin/* pass through this; the 203 public pages are static
 * assets and never reach a Function.
 */

interface Data extends Record<string, unknown> {
  user: SessionUser | null;
}

/** Endpoints reachable without a session. Everything else requires one. */
const PUBLIC_ROUTES = ['/api/auth/login', '/api/auth/session'];

export const onRequest: PagesFunction<Env, string, Data>[] = [
  async function security(context) {
    const response = await context.next();
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Referrer-Policy', 'same-origin');
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    if (new URL(context.request.url).pathname.startsWith('/api/')) {
      headers.set('Cache-Control', 'no-store');
    }
    return new Response(response.body, { status: response.status, headers });
  },

  async function auth(context) {
    const { request, env, next, data } = context;
    const path = new URL(request.url).pathname;

    if (!path.startsWith('/api/')) return next();

    const csrf = csrfProblem(request);
    if (csrf) return fail(403, csrf);

    data.user = await currentUser(env, request);

    // Someone already signed in to the Studio as a project administrator does
    // not have to sign in again to manage site accounts. The token is verified
    // against Sanity on every request that uses it - see verifySanityAdmin -
    // and is never stored here.
    if (!data.user) {
      const studioToken = request.headers.get('x-sanity-token');
      if (studioToken) data.user = await verifySanityAdmin(env, studioToken);
    }

    if (!PUBLIC_ROUTES.includes(path) && !data.user) {
      return fail(401, 'Not signed in.');
    }

    // A forced password change blocks everything except reading your own
    // session and setting the new password.
    if (
      data.user?.mustChangePassword &&
      !['/api/auth/session', '/api/auth/password', '/api/auth/logout'].includes(path)
    ) {
      return fail(403, 'Set a new password before continuing.', { mustChangePassword: true });
    }

    return next();
  },
];
