import { clientIp, fail, json, readJson, type Env } from '../../../src/server/http';
import { cookieHeader, createSession, sessionMaxAge } from '../../../src/server/session';
import { verifyPassword } from '../../../src/server/crypto';
import {
  clearFailures,
  getUserByEmail,
  loginBlocked,
  markLogin,
  publicUser,
  recordFailure,
} from '../../../src/server/users';
import { record } from '../../../src/server/audit';

/**
 * POST /api/auth/login
 *
 * Every failure path returns the same message and roughly the same work, so
 * the response cannot be used to discover which addresses have accounts.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson<{ email?: string; password?: string }>(request);
  const email = (body?.email ?? '').trim().toLowerCase();
  const password = body?.password ?? '';
  const ip = clientIp(request);

  if (!email || !password) return fail(400, 'Email and password are required.');

  if (await loginBlocked(env, email, ip)) {
    return fail(429, 'Too many attempts. Try again in 15 minutes.');
  }

  const user = await getUserByEmail(env, email);

  // Verify even when the user is missing, so a wrong address and a wrong
  // password take a comparable amount of time.
  const placeholder = 'pbkdf2$210000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
  const ok = await verifyPassword(password, user?.password_hash ?? placeholder);

  if (!user || !ok || !user.is_active) {
    await recordFailure(env, email, ip);
    return fail(401, 'Email or password is incorrect.');
  }

  await clearFailures(env, email, ip);
  await markLogin(env, user.id);

  const token = await createSession(env, user.id, request);
  const session = publicUser(user);

  await record(env, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: !!user.must_change_password,
    },
    action: 'login',
    ip,
  });

  return json({ user: session }, 200, {
    'set-cookie': cookieHeader(token, sessionMaxAge()),
  });
};
