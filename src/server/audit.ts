import { nowIso, type Env, type SessionUser } from './http';

/**
 * The record of who changed what.
 *
 * Everyone edits through a single Sanity write token, so Sanity's own document
 * history shows every change under that one identity. This table is the only
 * place the person behind an edit is recorded - which is why a write is not
 * considered complete until its audit row exists.
 */

export interface AuditInput {
  user: SessionUser;
  action: string;
  docType?: string;
  docId?: string;
  changes?: Record<string, unknown>;
  ip: string;
}

export async function record(env: Env, input: AuditInput): Promise<void> {
  await env.ADMIN_DB.prepare(
    `INSERT INTO audit_log (at, user_id, user_email, action, doc_type, doc_id, changes, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      nowIso(),
      input.user.id,
      input.user.email,
      input.action,
      input.docType ?? null,
      input.docId ?? null,
      // Truncated so one oversized field cannot bloat the table.
      input.changes ? JSON.stringify(input.changes).slice(0, 4000) : null,
      input.ip,
    )
    .run();
}

export interface AuditRow {
  id: number;
  at: string;
  user_id: string;
  user_email: string;
  action: string;
  doc_type: string | null;
  doc_id: string | null;
  changes: string | null;
  ip: string | null;
}

export async function recent(env: Env, limit = 100, docId?: string): Promise<AuditRow[]> {
  const capped = Math.min(Math.max(limit, 1), 500);
  const statement = docId
    ? env.ADMIN_DB.prepare('SELECT * FROM audit_log WHERE doc_id = ? ORDER BY at DESC LIMIT ?').bind(
        docId,
        capped,
      )
    : env.ADMIN_DB.prepare('SELECT * FROM audit_log ORDER BY at DESC LIMIT ?').bind(capped);
  const { results } = await statement.all<AuditRow>();
  return results ?? [];
}
