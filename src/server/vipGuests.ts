import { codeHash, sha256Hex, type D1Like, type KVLike } from './vip';

/**
 * The guest list, as the Worker edits it (docs/vip-access.md): what the
 * Studio's VIP tool does through /api/vip/admin, and what the "not a VIP
 * yet?" form does when it files a request.
 *
 * Nothing about the codes changes here. `makeCode` is scripts/vip-guests.mjs'
 * function of the same name, on WebCrypto instead of node:crypto - the same
 * HMAC of the guest's email and code version under the same pepper - so a
 * code issued from the Studio and one issued from the spreadsheet import are
 * the same code, and either side can reprint the other's. **Change one and
 * change both**, or every code already mailed stops matching.
 */

const PREFIX = 'CB27';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, no 1/I

export type GuestStatus = 'pending' | 'approved' | 'denied';

export interface GuestRow {
  id: string;
  code_version: number;
  first_name: string;
  last_name: string;
  email: string;
  institution: string | null;
  function: string | null;
  status: GuestStatus;
  revoked: number;
  entries: number;
  last_entry_at: string | null;
  requested_at: string | null;
  decided_at: string | null;
  decided_by: string | null;
  created_at: string;
}

export interface GuestInput {
  firstName: string;
  lastName: string;
  email: string;
  institution?: string;
  function?: string;
}

const COLUMNS =
  'id, code_version, first_name, last_name, email, institution, function, status, revoked, entries, last_entry_at, requested_at, decided_at, decided_by, created_at';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const now = () => new Date().toISOString();

export const cleanEmail = (email: unknown) => (typeof email === 'string' ? email.trim().toLowerCase() : '');
export const isEmail = (email: string) => EMAIL.test(email) && email.length <= 254;

/** First 20 hex of sha256(lower(email)), as the import script makes it. */
export const guestId = async (email: string) => (await sha256Hex(cleanEmail(email))).slice(0, 20);

/** "Émilie-Louise" → "EMILIELOUISE"; nothing usable → "VIP". */
function namePart(firstName: string): string {
  const ascii = String(firstName ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 10);
  return ascii || 'VIP';
}

/** The pepper as an HMAC key, imported once: an export makes thousands of codes. */
let hmac: { pepper: string; key: Promise<CryptoKey> } | undefined;
function hmacKey(pepper: string): Promise<CryptoKey> {
  if (hmac?.pepper !== pepper) {
    hmac = { pepper, key: crypto.subtle.importKey('raw', new TextEncoder().encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']) };
  }
  return hmac.key;
}

export async function makeCode(pepper: string, firstName: string, email: string, version: number): Promise<string> {
  const encoder = new TextEncoder();
  const key = await hmacKey(pepper);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`${cleanEmail(email)}:${version}`)));
  let tail = '';
  for (let i = 0; i < 6; i++) tail += ALPHABET[mac[i] % ALPHABET.length];
  return `${PREFIX}-${namePart(firstName)}-${tail}`;
}

export async function listGuests(db: D1Like): Promise<GuestRow[]> {
  const { results } = await db.prepare(`SELECT ${COLUMNS} FROM guests ORDER BY last_name, first_name`).bind().all<GuestRow>();
  return results;
}

export async function getGuest(db: D1Like, id: string): Promise<GuestRow | null> {
  return db.prepare(`SELECT ${COLUMNS} FROM guests WHERE id = ?`).bind(id).first<GuestRow>();
}

/**
 * A new guest, or null when the email is already in the list - which is
 * never overwritten from here: an approved guest must not be set back to
 * pending by a second request, nor a denied one by asking again.
 */
export async function createGuest(
  db: D1Like,
  pepper: string,
  input: GuestInput,
  status: GuestStatus,
  by: string | null,
): Promise<GuestRow | null> {
  const email = cleanEmail(input.email);
  const id = await guestId(email);
  if (await getGuest(db, id)) return null;
  const stamp = now();
  const hash = await codeHash(await makeCode(pepper, input.firstName, email, 1), pepper);
  await db
    .prepare(
      `INSERT INTO guests (id, code_hash, code_version, first_name, last_name, email, institution, function, status, requested_at, decided_at, decided_by, created_at, updated_at)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
    )
    .bind(
      id,
      hash,
      input.firstName,
      input.lastName,
      email,
      input.institution || null,
      input.function || null,
      status,
      status === 'pending' ? stamp : null,
      status === 'pending' ? null : stamp,
      status === 'pending' ? null : by,
      stamp,
      stamp,
    )
    .run();
  return getGuest(db, id);
}

/**
 * A sheet of guests in one read and one batch, because a Worker is allowed
 * only so many database calls per request: new emails go in as approved, a
 * pending request the team has now listed is approved, and everyone already
 * in keeps their row and their code - what `--import` does from a laptop.
 */
export async function importGuests(
  db: D1Like,
  pepper: string,
  inputs: GuestInput[],
  by: string,
): Promise<{ created: number; approved: number; unchanged: number }> {
  const { results } = await db.prepare('SELECT id, status FROM guests').bind().all<{ id: string; status: GuestStatus }>();
  const existing = new Map(results.map((r) => [r.id, r.status]));
  const stamp = now();
  const statements = [];
  let created = 0;
  let approved = 0;
  let unchanged = 0;
  for (const input of inputs) {
    const email = cleanEmail(input.email);
    const id = await guestId(email);
    const status = existing.get(id);
    if (!status) {
      const hash = await codeHash(await makeCode(pepper, input.firstName, email, 1), pepper);
      statements.push(
        db
          .prepare(
            `INSERT INTO guests (id, code_hash, code_version, first_name, last_name, email, institution, function, status, decided_at, decided_by, created_at, updated_at)
             VALUES (?, ?, 1, ?, ?, ?, ?, ?, 'approved', ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
          )
          .bind(id, hash, input.firstName, input.lastName, email, input.institution || null, input.function || null, stamp, by, stamp, stamp),
      );
      existing.set(id, 'approved');
      created++;
    } else if (status === 'pending') {
      statements.push(
        db.prepare("UPDATE guests SET status = 'approved', decided_at = ?, decided_by = ?, updated_at = ? WHERE id = ?").bind(stamp, by, stamp, id),
      );
      existing.set(id, 'approved');
      approved++;
    } else unchanged++;
  }
  if (statements.length) await db.batch(statements);
  return { created, approved, unchanged };
}

/**
 * Name, institution and function. The email is the guest's identity - their
 * id and their code both come from it - so it is not editable: delete and
 * add again. The first name is part of the code as printed, so the hash is
 * made again from the new one and the caller is told when the code moved.
 */
export async function updateGuest(
  db: D1Like,
  pepper: string,
  id: string,
  fields: Omit<GuestInput, 'email'>,
): Promise<{ guest: GuestRow; codeChanged: boolean } | null> {
  const before = await getGuest(db, id);
  if (!before) return null;
  const was = await makeCode(pepper, before.first_name, before.email, before.code_version);
  const is = await makeCode(pepper, fields.firstName, before.email, before.code_version);
  await db
    .prepare('UPDATE guests SET first_name = ?, last_name = ?, institution = ?, function = ?, code_hash = ?, updated_at = ? WHERE id = ?')
    .bind(fields.firstName, fields.lastName, fields.institution || null, fields.function || null, await codeHash(is, pepper), now(), id)
    .run();
  return { guest: (await getGuest(db, id))!, codeChanged: was !== is };
}

export async function decideGuest(db: D1Like, id: string, status: 'approved' | 'denied', by: string): Promise<GuestRow | null> {
  const stamp = now();
  await db.prepare('UPDATE guests SET status = ?, decided_at = ?, decided_by = ?, updated_at = ? WHERE id = ?').bind(status, stamp, by, stamp, id).run();
  return getGuest(db, id);
}

export async function setRevoked(db: D1Like, id: string, revoked: boolean): Promise<GuestRow | null> {
  await db.prepare('UPDATE guests SET revoked = ?, updated_at = ? WHERE id = ?').bind(revoked ? 1 : 0, now(), id).run();
  return getGuest(db, id);
}

/** A new code; the old one stops matching. */
export async function reissueGuest(db: D1Like, pepper: string, id: string): Promise<{ guest: GuestRow; code: string } | null> {
  const guest = await getGuest(db, id);
  if (!guest) return null;
  const version = Number(guest.code_version) + 1;
  const code = await makeCode(pepper, guest.first_name, guest.email, version);
  await db
    .prepare('UPDATE guests SET code_version = ?, code_hash = ?, revoked = 0, updated_at = ? WHERE id = ?')
    .bind(version, await codeHash(code, pepper), now(), id)
    .run();
  return { guest: (await getGuest(db, id))!, code };
}

export async function deleteGuest(db: D1Like, id: string): Promise<void> {
  await db.prepare('DELETE FROM guests WHERE id = ?').bind(id).run();
}

/** Ends every session of a guest: their keys share a prefix in KV. */
export async function endSessions(kv: KVLike, id: string): Promise<number> {
  let ended = 0;
  let cursor: string | undefined;
  do {
    const page = await kv.list({ prefix: `s:${id}:`, cursor });
    for (const key of page.keys) {
      await kv.delete(key.name);
      ended++;
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return ended;
}

/** The code a guest types, for the ones who have a working one. */
export const codeFor = (pepper: string, g: GuestRow) =>
  g.status === 'approved' && !g.revoked ? makeCode(pepper, g.first_name, g.email, g.code_version) : Promise.resolve(null);
