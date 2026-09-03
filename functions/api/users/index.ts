import {
  cleanString,
  clientIp,
  fail,
  isEmail,
  json,
  readJson,
  type Env,
  type SessionUser,
} from '../../../src/server/http';
import { passwordProblem } from '../../../src/server/crypto';
import { createUser, getUserByEmail, listUsers, publicUser } from '../../../src/server/users';
import { record } from '../../../src/server/audit';

/** GET /api/users - list. POST /api/users - create. Both admin-only. */

const requireAdmin = (user: SessionUser | null) =>
  user?.role === 'admin' ? null : fail(403, 'Only an admin can manage users.');

export const onRequestGet: PagesFunction<Env, string, { user: SessionUser | null }> = async ({
  env,
  data,
}) => {
  const denied = requireAdmin(data.user);
  if (denied) return denied;
  return json({ users: (await listUsers(env)).map(publicUser) });
};

export const onRequestPost: PagesFunction<Env, string, { user: SessionUser | null }> = async ({
  request,
  env,
  data,
}) => {
  const denied = requireAdmin(data.user);
  if (denied) return denied;

  const body = await readJson<{
    email?: string;
    name?: string;
    role?: string;
    password?: string;
  }>(request);

  const email = cleanString(body?.email)?.toLowerCase();
  const name = cleanString(body?.name);
  const role = body?.role === 'admin' ? 'admin' : 'editor';
  const password = body?.password ?? '';

  if (!email || !isEmail(email)) return fail(400, 'A valid email address is required.');
  if (!name) return fail(400, 'A name is required.');

  const problem = passwordProblem(password);
  if (problem) return fail(400, problem);

  if (await getUserByEmail(env, email)) {
    return fail(409, 'An account with that email already exists.');
  }

  // Created accounts always start with must_change_password, so the password
  // the admin typed is never the one the user keeps.
  const created = await createUser(env, { email, name, role, password }, data.user!.id);

  await record(env, {
    user: data.user!,
    action: 'user.create',
    docType: 'user',
    docId: created.id,
    changes: { email, name, role },
    ip: clientIp(request),
  });

  return json({ user: publicUser(created) }, 201);
};
