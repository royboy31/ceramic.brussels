/**
 * Recognises a Sanity project administrator from the token the Studio already
 * holds, so the VIP tool in the Studio needs no sign-in of its own.
 *
 * Verification is done against Sanity, never by trusting the request:
 *
 *   1. `/users/me` turns the token into an identity. A forged or expired token
 *      fails here.
 *   2. `/projects/<id>` says which members are administrators. Being a valid
 *      Sanity user is not enough - it must be an administrator *of this
 *      project*. An editor's seat opens the Studio and not the guest list.
 *
 * The token is used and discarded. It is never stored, logged, or forwarded
 * anywhere except back to Sanity.
 *
 * This is the half of the site accounts removed on 2026-09-15 that was never
 * the problem: what went was a second kind of account and the one shared
 * token it handed to every browser. Here each administrator proves who they
 * are with their own token, which is also what puts a name in `decided_by`.
 */

export interface SanityAdmin {
  id: string;
  name: string;
  email: string | null;
}

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
 * Verifying costs two calls to Sanity, and the VIP tool makes several
 * requests in a row. A short cache keeps that to one round trip a minute
 * without holding an authorisation decision long enough to matter.
 */
const cache = new Map<string, { user: SanityAdmin | null; until: number }>();
const TTL_MS = 60_000;

async function fingerprint(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest).slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function get<T>(path: string, token: string): Promise<T | null> {
  const response = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return response.ok ? ((await response.json()) as T) : null;
}

export async function verifySanityAdmin(projectId: string, token: unknown): Promise<SanityAdmin | null> {
  if (typeof token !== 'string' || token.length < 20 || token.length > 500) return null;

  const key = await fingerprint(token);
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.user;

  const remember = (user: SanityAdmin | null) => {
    cache.set(key, { user, until: Date.now() + TTL_MS });
    return user;
  };

  const me = await get<SanityMe>('/users/me', token);
  if (!me?.id) return remember(null);

  const project = await get<SanityProject>(`/projects/${projectId}`, token);
  const member = project?.members?.find((m) => m.id === me.id);
  if (!member) return remember(null);

  const roles = (member.roles ?? []).map((role) => (typeof role === 'string' ? role : role?.name));
  if (!roles.includes('administrator')) return remember(null);

  return remember({ id: me.id, name: me.name || me.email || me.id, email: me.email ?? null });
}
