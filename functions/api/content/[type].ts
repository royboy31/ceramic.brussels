import { fail, json, type Env, type SessionUser } from '../../../src/server/http';
import { EDITABLE_TYPES, findType } from '../../../src/server/editable';
import { query } from '../../../src/server/sanity';

/**
 * GET /api/content/:type - the list for one document type.
 *
 * `_type` comes from the whitelist, never from the URL, so the GROQ below
 * cannot be steered by a caller. Only published documents are visible, which
 * matches what the site builds from.
 */
export const onRequestGet: PagesFunction<Env, 'type', { user: SessionUser | null }> = async ({
  env,
  params,
  request,
}) => {
  const type = findType(String(params.type));
  if (!type) {
    return fail(404, 'Unknown content type.', {
      available: EDITABLE_TYPES.map((t) => t.name),
    });
  }

  const url = new URL(request.url);
  const search = (url.searchParams.get('q') ?? '').trim().slice(0, 100);

  const filter = search
    ? `_type == $type && !(_id in path("drafts.**")) && (${type.titleField} match $search)`
    : `_type == $type && !(_id in path("drafts.**"))`;

  const groq = `*[${filter}] | order(${type.order}) [0...500] {
    _id,
    _updatedAt,
    "title": ${type.titleField},
    "subtitle": ${subtitleFor(type.name)}
  }`;

  const items = await query<unknown[]>(env, groq, {
    type: type.name,
    ...(search ? { search: `${search}*` } : {}),
  });

  return json({ type: type.name, label: type.label, plural: type.plural, items });
};

/** A second line in the list, so near-identical names stay distinguishable. */
function subtitleFor(typeName: string): string {
  switch (typeName) {
    case 'exhibitor':
      return 'coalesce(booth, city, "")';
    case 'person':
      return 'coalesce(role.en, "")';
    case 'partner':
      return 'coalesce(tier, "")';
    case 'newsItem':
      return 'coalesce(publishedAt, "")';
    case 'programmeEvent':
      return 'coalesce(startsAt, "")';
    case 'pressClip':
      return 'coalesce(outlet, "")';
    default:
      return '""';
  }
}
