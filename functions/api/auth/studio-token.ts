import { clientIp, fail, json, type Env, type SessionUser } from '../../../src/server/http';
import { record } from '../../../src/server/audit';

/**
 * POST /api/auth/studio-token - hand a signed-in site account the Sanity token
 * the Studio runs on.
 *
 * Site accounts are not Sanity identities, so the Studio can never authenticate
 * one of them itself. What it does accept is a token: `consumeHashToken` in
 * `sanity` reads `#token=` off the URL at boot and stores it under
 * `__studio_auth_token_<projectId>`. So /login signs a person in against D1,
 * calls this, and sends them to /studio with the token in the hash.
 *
 * Two things follow from that, and both are deliberate:
 *
 *   1. The token reaches the browser, where its holder can read it out of
 *      localStorage and use it anywhere. It is one shared credential, it does
 *      not expire, and withdrawing it from one person means rotating it for
 *      everyone. Give it the narrowest role that lets an editor work.
 *   2. Edits made with it arrive at Sanity as the token, not as the person, so
 *      Sanity's history cannot tell the team apart. The audit row written here
 *      records who was handed the keys and when, which is the only trace of
 *      the individual until the API itself is proxied.
 *
 * POST rather than GET so the middleware's CSRF check covers it.
 */
export const onRequestPost: PagesFunction<Env, string, { user: SessionUser | null }> = async ({
  request,
  env,
  data,
}) => {
  const user = data.user!;
  const token = env.SANITY_STUDIO_TOKEN;

  // Never fall back to SANITY_API_WRITE_TOKEN: that one exists for migrations
  // and imports, its grants are far wider than editing, and it is not meant to
  // leave the server.
  if (!token) {
    return fail(503, 'Studio access is not configured yet. Ask an administrator to set it up.');
  }

  await record(env, { user, action: 'studio.token', ip: clientIp(request) });

  return json({ token });
};
