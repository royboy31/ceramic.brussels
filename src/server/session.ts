import { randomToken, sha256Hex } from './crypto';
import { nowIso, type Env, type SessionUser } from './http';

/**
 * Cookie-backed sessions in D1.
 *
 * The cookie carries a random token; D1 stores only its SHA-256, so the table
 * is useless to anyone who reads it. Logging in issues a fresh token (no
 * fixation), and logging out deletes the row rather than just clearing the
 * cookie.
 */

export const SESSION_COOKIE = 'cb_admin_session';
const SESSION_TTL_HOURS = 12;

export function cookieHeader(token: string, maxAgeSeconds: number): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  return parts.join('; ');
}

export const clearCookieHeader = () => cookieHeader('', 0);

export function readCookie(request: Request): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) return rest.join('=') || null;
  }
  return null;
}

export async function createSession(env: Env, userId: string, request: Request): Promise<string> {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000).toISOString();
  await env.ADMIN_DB.prepare(
    `INSERT INTO sessions (token_hash, user_id, created_at, expires_at, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      await sha256Hex(token),
      userId,
      nowIso(),
      expires,
      request.headers.get('CF-Connecting-IP') ?? null,
      (request.headers.get('user-agent') ?? '').slice(0, 300),
    )
    .run();
  return token;
}

export const sessionMaxAge = () => SESSION_TTL_HOURS * 3600;

/** Resolves the caller, or null. Expired and deactivated users resolve to null. */
export async function currentUser(env: Env, request: Request): Promise<SessionUser | null> {
  const token = readCookie(request);
  if (!token) return null;

  const row = await env.ADMIN_DB.prepare(
    `SELECT u.id, u.email, u.name, u.role, u.is_active, u.must_change_password, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?`,
  )
    .bind(await sha256Hex(token))
    .first<{
      id: string;
      email: string;
      name: string;
      role: 'admin' | 'editor';
      is_active: number;
      must_change_password: number;
      expires_at: string;
    }>();

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await destroySession(env, request);
    return null;
  }
  if (!row.is_active) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    mustChangePassword: !!row.must_change_password,
  };
}

export async function destroySession(env: Env, request: Request): Promise<void> {
  const token = readCookie(request);
  if (!token) return;
  await env.ADMIN_DB.prepare('DELETE FROM sessions WHERE token_hash = ?')
    .bind(await sha256Hex(token))
    .run();
}

/** Used when a password changes or an account is deactivated. */
export async function destroyAllSessions(env: Env, userId: string): Promise<void> {
  await env.ADMIN_DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
}

export async function pruneExpired(env: Env): Promise<void> {
  await env.ADMIN_DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(nowIso()).run();
}
