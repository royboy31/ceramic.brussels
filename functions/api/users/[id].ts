import {
  cleanString,
  clientIp,
  fail,
  json,
  readJson,
  type Env,
  type SessionUser,
} from '../../../src/server/http';
import { passwordProblem } from '../../../src/server/crypto';
import {
  countAdmins,
  deleteUser,
  getUser,
  publicUser,
  setPassword,
  updateUser,
} from '../../../src/server/users';
import { record } from '../../../src/server/audit';

/**
 * PATCH  /api/users/:id  - name, role, active
 * POST   /api/users/:id  - reset password (admin sets a temporary one)
 * DELETE /api/users/:id
 *
 * Two guards run on every destructive path, because either one on its own
 * still allows an admin to lock the whole team out:
 *   - you cannot demote, deactivate or delete yourself
 *   - the last active admin cannot stop being one
 */

const requireAdmin = (user: SessionUser | null) =>
  user?.role === 'admin' ? null : fail(403, 'Only an admin can manage users.');

async function lastAdminProblem(
  env: Env,
  target: { id: string; role: string; is_active: number },
  after: { role?: string; isActive?: boolean },
): Promise<string | null> {
  const stillAdmin = (after.role ?? target.role) === 'admin' && (after.isActive ?? !!target.is_active);
  if (target.role === 'admin' && target.is_active && !stillAdmin && (await countAdmins(env)) <= 1) {
    return 'This is the last active admin. Promote someone else first.';
  }
  return null;
}

export const onRequestPatch: PagesFunction<Env, 'id', { user: SessionUser | null }> = async ({
  request,
  env,
  data,
  params,
}) => {
  const denied = requireAdmin(data.user);
  if (denied) return denied;

  const id = String(params.id);
  const target = await getUser(env, id);
  if (!target) return fail(404, 'No such user.');

  const body = await readJson<{ name?: string; role?: string; isActive?: boolean }>(request);
  const changes: { name?: string; role?: 'admin' | 'editor'; isActive?: boolean } = {};

  if (body?.name !== undefined) {
    const name = cleanString(body.name);
    if (!name) return fail(400, 'A name is required.');
    changes.name = name;
  }
  if (body?.role !== undefined) changes.role = body.role === 'admin' ? 'admin' : 'editor';
  if (body?.isActive !== undefined) changes.isActive = !!body.isActive;

  if (id === data.user!.id && (changes.role === 'editor' || changes.isActive === false)) {
    return fail(400, 'You cannot remove your own access.');
  }

  const problem = await lastAdminProblem(env, target, changes);
  if (problem) return fail(400, problem);

  await updateUser(env, id, changes);

  await record(env, {
    user: data.user!,
    action: 'user.update',
    docType: 'user',
    docId: id,
    changes,
    ip: clientIp(request),
  });

  return json({ user: publicUser((await getUser(env, id))!) });
};

export const onRequestPost: PagesFunction<Env, 'id', { user: SessionUser | null }> = async ({
  request,
  env,
  data,
  params,
}) => {
  const denied = requireAdmin(data.user);
  if (denied) return denied;

  const id = String(params.id);
  if (!(await getUser(env, id))) return fail(404, 'No such user.');

  const body = await readJson<{ password?: string }>(request);
  const password = body?.password ?? '';
  const problem = passwordProblem(password);
  if (problem) return fail(400, problem);

  // Forced change on next sign-in: the admin knows this password.
  await setPassword(env, id, password, true);

  await record(env, {
    user: data.user!,
    action: 'user.reset-password',
    docType: 'user',
    docId: id,
    ip: clientIp(request),
  });

  return json({ ok: true });
};

export const onRequestDelete: PagesFunction<Env, 'id', { user: SessionUser | null }> = async ({
  request,
  env,
  data,
  params,
}) => {
  const denied = requireAdmin(data.user);
  if (denied) return denied;

  const id = String(params.id);
  if (id === data.user!.id) return fail(400, 'You cannot delete your own account.');

  const target = await getUser(env, id);
  if (!target) return fail(404, 'No such user.');

  const problem = await lastAdminProblem(env, target, { isActive: false });
  if (problem) return fail(400, problem);

  await deleteUser(env, id);

  await record(env, {
    user: data.user!,
    action: 'user.delete',
    docType: 'user',
    docId: id,
    changes: { email: target.email },
    ip: clientIp(request),
  });

  return json({ ok: true });
};
