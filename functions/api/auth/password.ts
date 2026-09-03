import { clientIp, fail, json, readJson, type Env, type SessionUser } from '../../../src/server/http';
import { passwordProblem } from '../../../src/server/crypto';
import { checkPassword, setPassword } from '../../../src/server/users';
import { cookieHeader, createSession, sessionMaxAge } from '../../../src/server/session';
import { record } from '../../../src/server/audit';

/**
 * POST /api/auth/password - change your own password.
 *
 * Requires the current one even though the caller is already signed in: it is
 * what stops an unattended browser becoming a permanent account takeover.
 * Setting a password drops every session, so a new one is issued here to keep
 * the person who just changed it signed in.
 */
export const onRequestPost: PagesFunction<Env, string, { user: SessionUser | null }> = async ({
  request,
  env,
  data,
}) => {
  const user = data.user!;
  const body = await readJson<{ currentPassword?: string; newPassword?: string }>(request);
  const current = body?.currentPassword ?? '';
  const next = body?.newPassword ?? '';

  const problem = passwordProblem(next);
  if (problem) return fail(400, problem);
  if (current === next) return fail(400, 'The new password must be different.');
  if (!(await checkPassword(env, user.id, current))) {
    return fail(401, 'Current password is incorrect.');
  }

  await setPassword(env, user.id, next, false);
  const token = await createSession(env, user.id, request);
  await record(env, { user, action: 'password.change', ip: clientIp(request) });

  return json({ ok: true }, 200, { 'set-cookie': cookieHeader(token, sessionMaxAge()) });
};
