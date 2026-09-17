import type { APIRoute } from 'astro';
import { DEFAULT_LOCALE, LOCALE_IDS, type LocaleId } from '../../lib/locales';
import { localePath } from '../../lib/i18n';
import { hubTabPath } from '../../lib/hubs';
import { codeHash, codePepper, findGuestByCode, normaliseCode, recordEntry, safeNext, vipEnv } from '../vip';
import { createVipSession } from '../vipSession';

/**
 * POST /api/vip/enter - the "VIP already? enter your code" box.
 *
 * Takes `code`, `next` (the path to land on) and `lang`. A code that hashes
 * to a guest who is not revoked gets a session in KV and the cookie, and the
 * browser goes on to `next` (a 303, or the address in the JSON answer). Any
 * other code goes back to the access page with `error=code`. The guest's
 * entry count and last entry are noted, so the team can see who came.
 *
 * Guessing is slowed twice: the codes have some 700 million forms per first
 * name, and an address that fails twenty times in ten minutes is refused
 * for the rest of them (the Cache API, per colo, which is enough). A
 * Cloudflare rate limiting rule on this path is the belt to that brace.
 */
export const prerender = false;

const ATTEMPT_LIMIT = 20;
const ATTEMPT_WINDOW_SECONDS = 10 * 60;

const json = (status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

const redirect = (location: string, headers: Record<string, string> = {}) =>
  new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store', ...headers } });

async function readBody(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    const body = await request.json().catch(() => null);
    return body && typeof body === 'object' ? (body as Record<string, string>) : {};
  }
  const data = await request.formData().catch(() => null);
  const out: Record<string, string> = {};
  data?.forEach((value, key) => (out[key] = String(value)));
  return out;
}

/** True when this address has failed too often lately; counts the failure otherwise. */
async function tooManyFailures(request: Request, count: boolean): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const key = new Request(`https://vip-enter.invalid/${encodeURIComponent(ip)}`);
  const cache = await caches.open('vip-enter');
  const hit = await cache.match(key);
  const failures = hit ? Number(await hit.text()) || 0 : 0;
  if (failures >= ATTEMPT_LIMIT) return true;
  if (count) {
    await cache.put(key, new Response(String(failures + 1), { headers: { 'cache-control': `max-age=${ATTEMPT_WINDOW_SECONDS}` } }));
  }
  return false;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const body = await readBody(request);
  const lang = (LOCALE_IDS as string[]).includes(body.lang) ? (body.lang as LocaleId) : DEFAULT_LOCALE;
  const accessPage = localePath(lang, hubTabPath('vip', 'access', lang));
  const next = safeNext(body.next, localePath(lang, hubTabPath('vip', 'programme', lang)));
  const back = (error: string) =>
    wantsJson ? json(401, { ok: false, error }) : redirect(`${accessPage}?error=${error}&next=${encodeURIComponent(next)}`);

  // Same origin only: the box lives on this site and nowhere else.
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return json(403, { ok: false, error: 'origin' });

  const env = vipEnv(locals);
  const pepper = codePepper();
  if (!env || !pepper) {
    console.error('[vip] enter: VIP_DB, VIP_SESSIONS or VIP_CODE_PEPPER is missing on this deployment');
    return wantsJson ? json(503, { ok: false, error: 'unconfigured' }) : back('unavailable');
  }

  const code = normaliseCode(body.code);
  if (code.length < 6 || code.length > 40) return back('code');
  if (await tooManyFailures(request, false)) return wantsJson ? json(429, { ok: false, error: 'throttled' }) : back('throttled');

  const guest = await findGuestByCode(env.VIP_DB, await codeHash(code, pepper));
  if (!guest || guest.revoked) {
    await tooManyFailures(request, true);
    return back('code');
  }

  const cookie = await createVipSession(env.VIP_SESSIONS, guest.id, request);
  await recordEntry(env.VIP_DB, guest.id).catch((error) => console.error('[vip] could not record the entry:', error));

  return wantsJson ? json(200, { ok: true, next }, { 'set-cookie': cookie }) : redirect(next, { 'set-cookie': cookie });
};

export const GET: APIRoute = () => json(405, { ok: false, error: 'method' });
