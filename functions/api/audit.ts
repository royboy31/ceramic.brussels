import { fail, json, type Env, type SessionUser } from '../../src/server/http';
import { recent } from '../../src/server/audit';

/**
 * GET /api/audit - who changed what.
 *
 * Admin-only: it carries email addresses and IPs. An editor can still see
 * their own document history through the per-document view.
 */
export const onRequestGet: PagesFunction<Env, string, { user: SessionUser | null }> = async ({
  env,
  data,
  request,
}) => {
  const url = new URL(request.url);
  const docId = url.searchParams.get('docId') ?? undefined;

  if (!docId && data.user?.role !== 'admin') {
    return fail(403, 'Only an admin can read the full log.');
  }

  const limit = Number(url.searchParams.get('limit') ?? 100);
  const rows = await recent(env, Number.isFinite(limit) ? limit : 100, docId);

  return json({
    entries: rows.map((row) => ({
      id: row.id,
      at: row.at,
      user: row.user_email,
      userId: row.user_id,
      action: row.action,
      docType: row.doc_type,
      docId: row.doc_id,
      changes: row.changes ? JSON.parse(row.changes) : null,
    })),
  });
};
