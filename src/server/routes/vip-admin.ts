import type { APIRoute } from 'astro';
import { codePepper, vipEnv } from '../vip';
import { verifySanityAdmin } from '../sanityIdentity';
import {
  cleanEmail,
  codeFor,
  createGuest,
  decideGuest,
  deleteGuest,
  endSessions,
  getGuest,
  importGuests,
  isEmail,
  listGuests,
  reissueGuest,
  setRevoked,
  updateGuest,
  type GuestInput,
  type GuestRow,
} from '../vipGuests';

/**
 * POST /api/vip/admin - the guest list, for the Studio's VIP tool
 * (src/sanity/components/VipTool.tsx, docs/vip-access.md).
 *
 * One endpoint, a JSON body with an `action`. Every call carries the
 * Studio's own Sanity token in `x-sanity-token`; sanityIdentity.ts checks it
 * against Sanity and lets in an administrator of this project and nobody
 * else. No cookie takes part, so there is no session to steal and nothing a
 * cross-site form could ride on - the header cannot be set from one.
 *
 * What it can do is what scripts/vip-guests.mjs does from a laptop: add,
 * edit, delete, approve, deny, revoke, restore, reissue, import and export.
 * The gate, the codes and the sessions are untouched; this only edits rows.
 */
export const prerender = false;

const IMPORT_CHUNK = 300;
const EXPORT_PAGE = 500;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
  });
const fail = (status: number, error: string) => json(status, { ok: false, error });

const clean = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '');

function readGuest(body: Record<string, unknown>): GuestInput | string {
  const input = {
    firstName: clean(body.firstName, 120),
    lastName: clean(body.lastName, 120),
    email: cleanEmail(body.email),
    institution: clean(body.institution, 200),
    function: clean(body.function, 200),
  };
  if (!input.firstName || !input.lastName) return 'A first name and a last name are required.';
  return input;
}

/** What the tool shows of a guest. The code is asked for, never listed. */
const view = (g: GuestRow) => ({
  id: g.id,
  firstName: g.first_name,
  lastName: g.last_name,
  email: g.email,
  institution: g.institution ?? '',
  function: g.function ?? '',
  status: g.status,
  revoked: !!g.revoked,
  entries: g.entries,
  lastEntryAt: g.last_entry_at,
  requestedAt: g.requested_at,
  decidedAt: g.decided_at,
  decidedBy: g.decided_by,
  createdAt: g.created_at,
});

export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return fail(403, 'Cross-site request.');

  const env = await vipEnv();
  const pepper = codePepper();
  if (!env || !pepper) return fail(503, 'The guest list is not available on this deployment (no database, or no VIP_CODE_PEPPER).');

  const admin = await verifySanityAdmin(import.meta.env.PUBLIC_SANITY_PROJECT_ID, request.headers.get('x-sanity-token'));
  if (!admin) return fail(403, 'Only an administrator of the Sanity project can manage VIP guests.');

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const db = env.VIP_DB;
  const id = clean(body.id, 64);
  const found = async () => (/^[a-f0-9]{8,64}$/.test(id) ? getGuest(db, id) : null);

  switch (body.action) {
    case 'list':
      return json(200, { ok: true, me: admin.name, guests: (await listGuests(db)).map(view) });

    case 'add': {
      const input = readGuest(body);
      if (typeof input === 'string') return fail(400, input);
      if (!isEmail(input.email)) return fail(400, 'A valid email address is required.');
      const guest = await createGuest(db, pepper, input, 'approved', admin.name);
      if (!guest) return fail(409, 'A guest with that email is already in the list.');
      return json(200, { ok: true, guest: view(guest), code: await codeFor(pepper, guest) });
    }

    case 'update': {
      const guest = await found();
      if (!guest) return fail(404, 'No such guest.');
      const input = readGuest({ ...body, email: guest.email });
      if (typeof input === 'string') return fail(400, input);
      const result = await updateGuest(db, pepper, guest.id, input);
      return json(200, { ok: true, guest: view(result!.guest), codeChanged: result!.codeChanged, code: await codeFor(pepper, result!.guest) });
    }

    case 'approve':
    case 'deny': {
      const guest = await found();
      if (!guest) return fail(404, 'No such guest.');
      const decided = await decideGuest(db, guest.id, body.action === 'approve' ? 'approved' : 'denied', admin.name);
      // A denial ends what an earlier approval may have opened.
      const ended = body.action === 'deny' ? await endSessions(env.VIP_SESSIONS, guest.id) : 0;
      return json(200, { ok: true, guest: view(decided!), code: await codeFor(pepper, decided!), ended });
    }

    case 'revoke':
    case 'restore': {
      const guest = await found();
      if (!guest) return fail(404, 'No such guest.');
      const updated = await setRevoked(db, guest.id, body.action === 'revoke');
      const ended = body.action === 'revoke' ? await endSessions(env.VIP_SESSIONS, guest.id) : 0;
      return json(200, { ok: true, guest: view(updated!), ended });
    }

    case 'reissue': {
      const guest = await found();
      if (!guest) return fail(404, 'No such guest.');
      const result = await reissueGuest(db, pepper, guest.id);
      const ended = await endSessions(env.VIP_SESSIONS, guest.id);
      return json(200, { ok: true, guest: view(result!.guest), code: result!.guest.status === 'approved' ? result!.code : null, ended });
    }

    case 'delete': {
      const guest = await found();
      if (!guest) return fail(404, 'No such guest.');
      await deleteGuest(db, guest.id);
      return json(200, { ok: true, ended: await endSessions(env.VIP_SESSIONS, guest.id) });
    }

    case 'code': {
      const guest = await found();
      if (!guest) return fail(404, 'No such guest.');
      return json(200, { ok: true, code: await codeFor(pepper, guest) });
    }

    // The spreadsheet, parsed by the tool and sent a few hundred rows at a
    // time: one read and one batch per call (vipGuests.ts importGuests).
    case 'import': {
      const rows = Array.isArray(body.rows) ? (body.rows as Record<string, unknown>[]) : [];
      if (!rows.length) return fail(400, 'No rows to import.');
      if (rows.length > IMPORT_CHUNK) return fail(400, `At most ${IMPORT_CHUNK} rows per call.`);
      const inputs: GuestInput[] = [];
      const rejected: string[] = [];
      for (const row of rows) {
        const input = readGuest(row);
        if (typeof input === 'string' || !isEmail(input.email)) rejected.push(String(row.email ?? '(no email)').slice(0, 254));
        else inputs.push(input);
      }
      return json(200, { ok: true, ...(await importGuests(db, pepper, inputs, admin.name)), rejected });
    }

    // Every working code, for the invitation mailing, a page at a time.
    // Made, not read: no code is stored anywhere.
    case 'export': {
      const offset = Math.max(0, Number(body.offset) || 0);
      const guests = await listGuests(db);
      const page = guests.slice(offset, offset + EXPORT_PAGE);
      const out = [];
      for (const g of page) out.push({ ...view(g), code: (await codeFor(pepper, g)) ?? '' });
      return json(200, { ok: true, guests: out, next: offset + EXPORT_PAGE < guests.length ? offset + EXPORT_PAGE : null });
    }

    default:
      return fail(400, 'Unknown action.');
  }
};

export const GET: APIRoute = () => fail(405, 'POST only.');
