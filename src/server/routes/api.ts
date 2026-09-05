import type { APIRoute } from 'astro';
import { fail } from '../http';
import { runPagesChain } from '../pagesShim';

import * as login from '../../../functions/api/auth/login';
import * as logout from '../../../functions/api/auth/logout';
import * as password from '../../../functions/api/auth/password';
import * as session from '../../../functions/api/auth/session';
import * as studioToken from '../../../functions/api/auth/studio-token';
import * as users from '../../../functions/api/users/index';
import * as user from '../../../functions/api/users/[id]';
import * as audit from '../../../functions/api/audit';

/**
 * The admin API, served by the Worker.
 *
 * One endpoint for the whole of `/api/`, dispatching to the Pages Functions
 * in `functions/api/` by path - the same modules Pages itself runs when the
 * site is deployed without a Worker. See src/server/pagesShim.ts for why.
 * `/api/preview/*` has its own files next to this one and takes precedence.
 *
 * The session and CSRF guards already ran in src/middleware.ts and left the
 * user on `locals`.
 */
export const prerender = false;

type Module = Record<string, unknown>;

const STATIC: Record<string, Module> = {
  'auth/login': login,
  'auth/logout': logout,
  'auth/password': password,
  'auth/session': session,
  'auth/studio-token': studioToken,
  users: users,
  audit: audit,
};

function resolve(path: string): { mod: Module; params: Record<string, string> } | null {
  if (STATIC[path]) return { mod: STATIC[path], params: {} };
  const m = path.match(/^users\/([^/]+)$/);
  if (m) return { mod: user, params: { id: decodeURIComponent(m[1]) } };
  return null;
}

const handle: APIRoute = async (context) => {
  const path = (context.params.path ?? '').replace(/\/+$/, '');
  const target = resolve(path);
  if (!target) return fail(404, 'No such endpoint.');

  const method = context.request.method.toUpperCase();
  const name = `onRequest${method.charAt(0)}${method.slice(1).toLowerCase()}`;
  const handler = (target.mod[name] ?? target.mod.onRequest) as ((c: any) => Promise<Response>) | undefined;
  if (!handler) return fail(405, 'Method not allowed.');

  const locals = context.locals as any;
  return runPagesChain([handler], context, {
    env: locals.env,
    data: { user: locals.user ?? null },
    params: target.params,
    next: async () => fail(404, 'No such endpoint.'),
  });
};

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
