import type { APIRoute } from 'astro';
import { DEFAULT_LOCALE, LOCALE_IDS, type LocaleId } from '../../lib/locales';
import { localePath } from '../../lib/i18n';
import { hubTabPath } from '../../lib/hubs';
import { safeNext, vipEnv } from '../vip';
import { GUEST_FUNCTIONS, getGuest, saveDetails } from '../vipGuests';
import { createVipSession, deleteVipSession, readVipSession, REALMS } from '../vipSession';

/**
 * /api/vip/details - the name step (Baïlo, 3 and 4 Nov 2026).
 *
 * Most of the list came in with an email and nothing else. A guest whose
 * first or last name is missing is sent here once, after their code and
 * before any locked tab (vip-enter.ts, src/middleware.ts): the access page's
 * "One last detail" window (VipDetailsForm.astro). First and last name are
 * required; function, from Baïlo's list, and institution are optional.
 *
 * GET answers the session's guest as the window fills itself in: what the
 * list already has, so nobody types it twice. POST saves (vipGuests.ts
 * saveDetails: names capitalised, the code untouched), then swaps the
 * session for one that says the step is done - the edge may keep the old
 * answer for a minute - and sends the browser on to `next`.
 */
export const prerender = false;

const json = (status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

const redirect = (location: string, headers: Record<string, string> = {}) =>
  new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store', ...headers } });

const clean = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '');

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

export const GET: APIRoute = async ({ request }) => {
  const env = await vipEnv();
  if (!env) return json(503, { ok: false, error: 'unconfigured' });
  const session = await readVipSession(env.VIP_SESSIONS, request);
  const guest = session ? await getGuest(env.VIP_DB, session.guestId) : null;
  if (!guest) return json(401, { ok: false, error: 'session' });
  return json(200, {
    ok: true,
    firstName: guest.first_name,
    lastName: guest.last_name,
    function: guest.function ?? '',
    institution: guest.institution ?? '',
  });
};

export const POST: APIRoute = async ({ request }) => {
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const body = await readBody(request);
  const lang = (LOCALE_IDS as string[]).includes(body.lang) ? (body.lang as LocaleId) : DEFAULT_LOCALE;
  const accessPage = localePath(lang, hubTabPath('vip', 'access', lang));
  const next = safeNext(body.next, localePath(lang, hubTabPath('vip', 'programme', lang)));
  const back = (status: number, error: string) =>
    wantsJson
      ? json(status, { ok: false, error })
      : redirect(`${accessPage}?next=${encodeURIComponent(next)}&step=details&error=${error}#vip-details`);

  // Same origin only: the window lives on this site and nowhere else.
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return json(403, { ok: false, error: 'origin' });

  const env = await vipEnv();
  if (!env) return back(503, 'unavailable');
  const session = await readVipSession(env.VIP_SESSIONS, request);
  const guest = session ? await getGuest(env.VIP_DB, session.guestId) : null;
  if (!guest || guest.status !== 'approved' || guest.revoked) {
    return wantsJson ? json(401, { ok: false, error: 'session' }) : redirect(`${accessPage}?next=${encodeURIComponent(next)}`);
  }

  const fields = {
    firstName: clean(body.firstName, 120),
    lastName: clean(body.lastName, 120),
    function: clean(body.function, 200),
    institution: clean(body.institution, 200),
  };
  if (!fields.firstName || !fields.lastName) return back(400, 'names');
  // The list is the only answer the window offers; anything else is not from it.
  if (fields.function && !(GUEST_FUNCTIONS as readonly string[]).includes(fields.function)) return back(400, 'function');

  await saveDetails(env.VIP_DB, guest.id, fields);
  await deleteVipSession(env.VIP_SESSIONS, request);
  const cookie = await createVipSession(env.VIP_SESSIONS, guest.id, request, REALMS.vip, 'ok');

  return wantsJson ? json(200, { ok: true, next }, { 'set-cookie': cookie }) : redirect(next, { 'set-cookie': cookie });
};
