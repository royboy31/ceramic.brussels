import type { APIRoute } from 'astro';
import { DEFAULT_LOCALE, LOCALE_IDS, type LocaleId } from '../../lib/locales';
import { localePath } from '../../lib/i18n';
import { hubTabPath } from '../../lib/hubs';
import { vipEnv } from '../vip';
import { clearVipCookie, deleteVipSession } from '../vipSession';

/** POST /api/vip/leave - ends the VIP session and returns to the VIP page. */
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const data = await request.formData().catch(() => null);
  const lang = (LOCALE_IDS as string[]).includes(String(data?.get('lang'))) ? (String(data?.get('lang')) as LocaleId) : DEFAULT_LOCALE;
  const env = await vipEnv();
  if (env) await deleteVipSession(env.VIP_SESSIONS, request).catch(() => undefined);
  return new Response(null, {
    status: 303,
    headers: { location: localePath(lang, hubTabPath('vip', undefined, lang)), 'set-cookie': clearVipCookie(), 'cache-control': 'no-store' },
  });
};

export const GET: APIRoute = () => new Response(null, { status: 405 });
