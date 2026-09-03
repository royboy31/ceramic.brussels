import type { Env, SessionUser } from './http';

/**
 * Recognises a Sanity project administrator from the token the Studio already
 * holds, so someone signed in to the Studio does not have to sign in a second
 * time to manage site accounts.
 *
 * Verification is done against Sanity, never by trusting the request:
 *
 *   1. `/users/me` turns the token into an identity. A forged or expired token
 *      fails here.
 *   2. `/projects/<id>` says which members are administrators. Being a valid
 *      Sanity user is not enough - it must be an admin *of this project*.
 *
 * The token is used and discarded. It is never stored, logged, or forwarded
 * anywhere except back to Sanity.
 */

interface SanityMe {
  id: string;
  name?: string | null;
  email?: string | null;
}

interface SanityProject {
  members?: { id: string; roles?: (string | { name?: string })[] }[];
}

const API = 'https://api.sanity.io/v2021-06-07';

/**
 * Verifying costs two calls to Sanity, and the Users screen makes several
 * requests in a row. A short cache keeps that to one round trip per minute
 * without holding an authorisation decision long enough to matter.
 */
const cache = new Map<string, { user: SessionUser | null; until: number }>();
const TTL_MS = 60_000;

async function fingerprint(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest).slice(0, 16)].map((b) => b.toString(16)).join('');
}

async function get<T>(path: string, token: string): Promise<T | null> {
  const response = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.ok ? ((await response.json()) as T) : null;
}

export async function verifySanityAdmin(env: Env, token: string): Promise<SessionUser | null> {
  if (typeof token !== 'string' || token.length < 20 || token.length > 500) return null;

  const key = await fingerprint(token);
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.user;

  const remember = (user: SessionUser | null) => {
    cache.set(key, { user, until: Date.now() + TTL_MS });
    return user;
  };

  const me = await get<SanityMe>('/users/me', token);
  if (!me?.id) return remember(null);

  const project = await get<SanityProject>(`/projects/${env.PUBLIC_SANITY_PROJECT_ID}`, token);
  const member = project?.members?.find((m) => m.id === me.id);
  if (!member) return remember(null);

  const roles = (member.roles ?? []).map((role) => (typeof role === 'string' ? role : role?.name));
  if (!roles.includes('administrator')) return remember(null);

  return remember({
    // Prefixed so a Sanity identity can never collide with a D1 user id, and so
    // the audit log shows at a glance which kind of account made a change.
    id: `sanity:${me.id}`,
    email: me.email ?? `${me.id}@sanity`,
    name: me.name ?? 'Sanity administrator',
    role: 'admin',
    mustChangePassword: false,
  });
}
