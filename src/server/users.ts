import { hashPassword, randomId, verifyPassword } from './crypto';
import { nowIso, type Env } from './http';
import { destroyAllSessions } from './session';

/** Admin user records in D1. These are not Sanity accounts. */

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  is_active: number;
  must_change_password: number;
  created_at: string;
  created_by: string | null;
  last_login_at: string | null;
}

/** The shape sent to the browser - never includes password_hash. */
export const publicUser = (row: UserRow) => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  isActive: !!row.is_active,
  mustChangePassword: !!row.must_change_password,
  createdAt: row.created_at,
  lastLoginAt: row.last_login_at,
});

const COLUMNS =
  'id, email, name, role, is_active, must_change_password, created_at, created_by, last_login_at';

export async function listUsers(env: Env): Promise<UserRow[]> {
  const { results } = await env.ADMIN_DB.prepare(
    `SELECT ${COLUMNS} FROM users ORDER BY is_active DESC, name COLLATE NOCASE ASC`,
  ).all<UserRow>();
  return results ?? [];
}

export const getUser = (env: Env, id: string) =>
  env.ADMIN_DB.prepare(`SELECT ${COLUMNS} FROM users WHERE id = ?`).bind(id).first<UserRow>();

export const getUserByEmail = (env: Env, email: string) =>
  env.ADMIN_DB.prepare(`SELECT ${COLUMNS}, password_hash FROM users WHERE email = ?`)
    .bind(email.toLowerCase())
    .first<UserRow & { password_hash: string }>();

export const countAdmins = async (env: Env): Promise<number> => {
  const row = await env.ADMIN_DB.prepare(
    "SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND is_active = 1",
  ).first<{ n: number }>();
  return row?.n ?? 0;
};

export async function createUser(
  env: Env,
  input: { email: string; name: string; role: 'admin' | 'editor'; password: string },
  createdBy: string,
): Promise<UserRow> {
  const id = randomId();
  await env.ADMIN_DB.prepare(
    `INSERT INTO users (id, email, name, password_hash, role, is_active, must_change_password, created_at, created_by)
     VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)`,
  )
    .bind(
      id,
      input.email.toLowerCase(),
      input.name,
      await hashPassword(input.password),
      input.role,
      nowIso(),
      createdBy,
    )
    .run();
  return (await getUser(env, id))!;
}

export async function updateUser(
  env: Env,
  id: string,
  changes: { name?: string; role?: 'admin' | 'editor'; isActive?: boolean },
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (changes.name !== undefined) {
    sets.push('name = ?');
    values.push(changes.name);
  }
  if (changes.role !== undefined) {
    sets.push('role = ?');
    values.push(changes.role);
  }
  if (changes.isActive !== undefined) {
    sets.push('is_active = ?');
    values.push(changes.isActive ? 1 : 0);
  }
  if (!sets.length) return;
  values.push(id);
  await env.ADMIN_DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  // A deactivated user must lose access now, not when their session expires.
  if (changes.isActive === false) await destroyAllSessions(env, id);
}

/**
 * Sets a new password. Every existing session for that user is dropped, so a
 * stolen session cannot outlive the password that leaked it.
 */
export async function setPassword(
  env: Env,
  id: string,
  password: string,
  mustChange: boolean,
): Promise<void> {
  await env.ADMIN_DB.prepare(
    'UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?',
  )
    .bind(await hashPassword(password), mustChange ? 1 : 0, id)
    .run();
  await destroyAllSessions(env, id);
}

export async function checkPassword(env: Env, id: string, password: string): Promise<boolean> {
  const row = await env.ADMIN_DB.prepare('SELECT password_hash FROM users WHERE id = ?')
    .bind(id)
    .first<{ password_hash: string }>();
  return row ? verifyPassword(password, row.password_hash) : false;
}

export const markLogin = (env: Env, id: string) =>
  env.ADMIN_DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(nowIso(), id).run();

export async function deleteUser(env: Env, id: string): Promise<void> {
  await destroyAllSessions(env, id);
  await env.ADMIN_DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
}

/* Login throttling. Failures are counted per email+IP over a rolling window. */

const WINDOW_MINUTES = 15;
const MAX_FAILURES = 8;

export async function loginBlocked(env: Env, email: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const row = await env.ADMIN_DB.prepare(
    'SELECT COUNT(*) AS n FROM login_attempts WHERE email = ? AND ip = ? AND at > ?',
  )
    .bind(email.toLowerCase(), ip, since)
    .first<{ n: number }>();
  return (row?.n ?? 0) >= MAX_FAILURES;
}

export async function recordFailure(env: Env, email: string, ip: string): Promise<void> {
  await env.ADMIN_DB.prepare('INSERT INTO login_attempts (email, ip, at) VALUES (?, ?, ?)')
    .bind(email.toLowerCase(), ip, nowIso())
    .run();
}

export async function clearFailures(env: Env, email: string, ip: string): Promise<void> {
  await env.ADMIN_DB.prepare('DELETE FROM login_attempts WHERE email = ? AND ip = ?')
    .bind(email.toLowerCase(), ip)
    .run();
}
