/** Small helpers shared by every admin API route. */

export interface Env {
  ADMIN_DB: D1Database;
  SANITY_API_WRITE_TOKEN: string;
  /**
   * The token the Studio runs on when a site account signs in at /login.
   * Optional because a deploy without it should refuse Studio access rather
   * than fall back to the write token above, whose grants are much wider.
   */
  SANITY_STUDIO_TOKEN?: string;
  DEPLOY_HOOK_URL?: string;
  PUBLIC_SANITY_PROJECT_ID: string;
  PUBLIC_SANITY_DATASET: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  mustChangePassword: boolean;
}

export const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });

export const fail = (status: number, message: string, extra: Record<string, unknown> = {}) =>
  json({ error: message, ...extra }, status);

export const clientIp = (request: Request) =>
  request.headers.get('CF-Connecting-IP') ?? request.headers.get('x-forwarded-for') ?? 'unknown';

export const nowIso = () => new Date().toISOString();

/**
 * CSRF defence. The session cookie is SameSite=Lax, which already blocks
 * cross-site POSTs from a form, and every API call additionally has to carry a
 * header a cross-origin page cannot set without a preflight this API never
 * answers. Same-origin Origin check on top, for browsers that send it.
 */
export function csrfProblem(request: Request): string | null {
  if (request.method === 'GET' || request.method === 'HEAD') return null;
  if (request.headers.get('x-admin-request') !== '1') return 'Missing admin request header.';
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return 'Cross-origin request.';
  return null;
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

/** Trims, collapses whitespace, and treats a blank string as absent. */
export function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed === '' ? null : trimmed;
}

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
