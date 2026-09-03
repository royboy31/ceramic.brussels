import { clientIp, fail, json, readJson, type Env, type SessionUser } from '../../../../src/server/http';
import { findType, projectionFor } from '../../../../src/server/editable';
import { patchDocument, query, SanityError } from '../../../../src/server/sanity';
import { buildPatch, ValidationError } from '../../../../src/server/validate';
import { record } from '../../../../src/server/audit';

/**
 * GET   /api/content/:type/:id - one document, plus the field definitions the
 *                                form is built from and its current _rev
 * PATCH /api/content/:type/:id - save
 *
 * The save path is the only place in this project that writes to Sanity. It
 * refuses anything not in the whitelist, sends the revision the editor loaded
 * so a concurrent save is a visible conflict rather than silent data loss, and
 * writes the audit row before reporting success.
 */

const loadDocument = (env: Env, typeName: string, id: string, projection: string) =>
  query<Record<string, unknown> | null>(
    env,
    `*[_type == $type && _id == $id][0] ${projection}`,
    { type: typeName, id },
  );

export const onRequestGet: PagesFunction<Env, 'type' | 'id', { user: SessionUser | null }> = async ({
  env,
  params,
}) => {
  const type = findType(String(params.type));
  if (!type) return fail(404, 'Unknown content type.');

  const doc = await loadDocument(env, type.name, String(params.id), projectionFor(type));
  if (!doc) return fail(404, 'No such document.');

  return json({
    document: doc,
    type: { name: type.name, label: type.label, fields: type.fields },
  });
};

export const onRequestPatch: PagesFunction<Env, 'type' | 'id', { user: SessionUser | null }> = async ({
  request,
  env,
  params,
  data,
}) => {
  const type = findType(String(params.type));
  if (!type) return fail(404, 'Unknown content type.');

  const id = String(params.id);
  // Drafts are invisible to the static build; editing one here would look like
  // a save that never reaches the site.
  if (id.startsWith('drafts.')) return fail(400, 'Drafts are edited in the Studio.');

  const body = await readJson<{ values?: Record<string, unknown>; rev?: string }>(request);
  if (!body?.values || typeof body.values !== 'object') return fail(400, 'Nothing to save.');

  let plan;
  try {
    plan = buildPatch(type, body.values);
  } catch (error) {
    if (error instanceof ValidationError) return fail(400, error.message);
    throw error;
  }

  const existing = await loadDocument(env, type.name, id, '{ _id, _rev }');
  if (!existing) return fail(404, 'No such document.');

  try {
    await patchDocument(env, {
      id,
      ifRevisionID: body.rev,
      set: plan.set,
      unset: plan.unset,
    });
  } catch (error) {
    if (error instanceof SanityError) return fail(error.status, error.message);
    throw error;
  }

  await record(env, {
    user: data.user!,
    action: 'content.update',
    docType: type.name,
    docId: id,
    changes: { ...plan.set, ...Object.fromEntries(plan.unset.map((f) => [f, null])) },
    ip: clientIp(request),
  });

  const updated = await loadDocument(env, type.name, id, projectionFor(type));
  return json({ document: updated, saved: true });
};
