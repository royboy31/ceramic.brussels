import { clientIp, fail, json, type Env, type SessionUser } from '../../../src/server/http';
import { triggerRebuild } from '../../../src/server/sanity';
import { record } from '../../../src/server/audit';

/**
 * POST /api/site/rebuild - push saved changes onto the live site.
 *
 * The site is static, so a save changes Sanity but not what visitors see until
 * Cloudflare rebuilds. That is deliberately a button rather than something
 * that fires on every save: builds take about three minutes and do not merge,
 * so ten saves would otherwise queue ten builds.
 *
 * The cooldown below is the second half of that protection - a queued build
 * already includes every save made before it started.
 */
const COOLDOWN_MINUTES = 3;

export const onRequestPost: PagesFunction<Env, string, { user: SessionUser | null }> = async ({
  request,
  env,
  data,
}) => {
  if (!env.DEPLOY_HOOK_URL) {
    return fail(503, 'No deploy hook is configured, so the site cannot be rebuilt from here.');
  }

  const since = new Date(Date.now() - COOLDOWN_MINUTES * 60_000).toISOString();
  const recent = await env.ADMIN_DB.prepare(
    "SELECT at FROM audit_log WHERE action = 'site.rebuild' AND at > ? ORDER BY at DESC LIMIT 1",
  )
    .bind(since)
    .first<{ at: string }>();

  if (recent) {
    return json({
      started: false,
      message: 'A build started less than three minutes ago and will include your changes.',
      lastStartedAt: recent.at,
    });
  }

  const started = await triggerRebuild(env);
  if (!started) return fail(502, 'Cloudflare refused the build request.');

  await record(env, { user: data.user!, action: 'site.rebuild', ip: clientIp(request) });

  return json({
    started: true,
    message: 'Build started. The live site updates in about three minutes.',
  });
};
