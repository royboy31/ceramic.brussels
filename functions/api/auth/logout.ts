import { clientIp, json, type Env, type SessionUser } from '../../../src/server/http';
import { clearCookieHeader, destroySession } from '../../../src/server/session';
import { record } from '../../../src/server/audit';

/** POST /api/auth/logout - deletes the session row, not just the cookie. */
export const onRequestPost: PagesFunction<Env, string, { user: SessionUser | null }> = async ({
  request,
  env,
  data,
}) => {
  if (data.user) {
    await record(env, { user: data.user, action: 'logout', ip: clientIp(request) });
  }
  await destroySession(env, request);
  return json({ ok: true }, 200, { 'set-cookie': clearCookieHeader() });
};
