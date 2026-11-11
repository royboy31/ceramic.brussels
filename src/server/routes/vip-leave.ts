import type { APIRoute } from 'astro';
import { DEFAULT_LOCALE, LOCALE_IDS, type LocaleId } from '../../lib/locales';
import { localePath } from '../../lib/i18n';
import { hubTabPath } from '../../lib/hubs';
import { PLATFORM_PATH } from '../../lib/exhibitorsPlatform';
import { vipEnv, type Audience } from '../vip';
import { clearVipCookie, deleteVipSession, REALMS } from '../vipSession';
import { clearPreviewCookie } from '../preview';

/**
 * POST /api/vip/leave - ends the VIP session and returns to the VIP page;
 * with `audience=exhibitor`, ends the exhibitors platform session and
 * returns to its (now locked) address.
 *
 * It drops the Studio's preview cookie as well (request #27): the gate lets
 * that cookie in on its own, so an editor who had ever pressed Preview could
 * "leave" and still open every locked tab. Preview in the Studio issues a
 * fresh one the next time it is used.
 */
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const data = await request.formData().catch(() => null);
  const lang = (LOCALE_IDS as string[]).includes(String(data?.get('lang'))) ? (String(data?.get('lang')) as LocaleId) : DEFAULT_LOCALE;
  const audience: Audience = String(data?.get('audience')) === 'exhibitor' ? 'exhibitor' : 'vip';
  const env = await vipEnv();
  if (env) await deleteVipSession(env.VIP_SESSIONS, request, REALMS[audience]).catch(() => undefined);
  const home = audience === 'exhibitor' ? localePath(lang, PLATFORM_PATH) : localePath(lang, hubTabPath('vip', undefined, lang));
  const headers = new Headers({ location: home, 'cache-control': 'no-store' });
  headers.append('set-cookie', clearVipCookie(REALMS[audience]));
  headers.append('set-cookie', clearPreviewCookie());
  return new Response(null, { status: 303, headers });
};

export const GET: APIRoute = () => new Response(null, { status: 405 });
