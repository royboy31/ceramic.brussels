import { json, type Env, type SessionUser } from '../../../src/server/http';

/**
 * GET /api/auth/session - who am I?
 *
 * Public by design: the admin page calls it on load to decide between the
 * login form and the panel. It returns null rather than 401 for a signed-out
 * caller, so that is not an error path in the UI.
 */
export const onRequestGet: PagesFunction<Env, string, { user: SessionUser | null }> = async ({
  data,
}) => json({ user: data.user ?? null });
