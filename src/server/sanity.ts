import type { Env } from './http';

/**
 * Sanity reads and writes for the admin panel, over plain fetch.
 *
 * No @sanity/client: the Worker only needs two endpoints, and keeping the
 * dependency out means the Function bundle stays small and there is nothing to
 * keep in step with the Studio version.
 *
 * The write token lives only here, server-side. It is never returned to the
 * browser in any shape.
 */

const API_VERSION = 'v2021-06-07';

const base = (env: Env) =>
  `https://${env.PUBLIC_SANITY_PROJECT_ID}.api.sanity.io/${API_VERSION}/data`;

export class SanityError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function query<T>(
  env: Env,
  groq: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const url = new URL(`${base(env)}/query/${env.PUBLIC_SANITY_DATASET}`);
  url.searchParams.set('query', groq);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(`$${key}`, JSON.stringify(value));
  }

  // Reads go through the token when there is one: the public CDN can lag, and
  // an editor seeing their own save reappear as the old value is the worst
  // kind of bug. The dataset is ACL-public, so browsing still works without
  // it - only saving needs the token.
  const response = await fetch(url, {
    headers: env.SANITY_API_WRITE_TOKEN
      ? { Authorization: `Bearer ${env.SANITY_API_WRITE_TOKEN}` }
      : {},
  });

  if (!response.ok) {
    throw new SanityError(`Sanity read failed (${response.status})`, 502);
  }
  const body = (await response.json()) as { result: T };
  return body.result;
}

export interface PatchInput {
  id: string;
  /** The revision the editor loaded. A mismatch means someone else saved first. */
  ifRevisionID?: string;
  set?: Record<string, unknown>;
  unset?: string[];
}

/**
 * Applies one patch. `ifRevisionID` turns a concurrent edit into a visible
 * 409 rather than one person silently overwriting the other.
 */
export async function patchDocument(env: Env, patch: PatchInput): Promise<{ rev: string }> {
  if (!env.SANITY_API_WRITE_TOKEN) {
    throw new SanityError('No Sanity write token is configured, so saving is disabled.', 503);
  }
  const mutation: Record<string, unknown> = { id: patch.id };
  if (patch.ifRevisionID) mutation.ifRevisionID = patch.ifRevisionID;
  if (patch.set && Object.keys(patch.set).length) mutation.set = patch.set;
  if (patch.unset && patch.unset.length) mutation.unset = patch.unset;

  const response = await fetch(
    `${base(env)}/mutate/${env.PUBLIC_SANITY_DATASET}?returnIds=true&visibility=async`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.SANITY_API_WRITE_TOKEN}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ mutations: [{ patch: mutation }] }),
    },
  );

  if (response.status === 409) {
    throw new SanityError(
      'Someone else saved this document while you were editing. Reload to see their version.',
      409,
    );
  }
  if (!response.ok) {
    const detail = await response.text();
    throw new SanityError(`Sanity write failed (${response.status}): ${detail.slice(0, 300)}`, 502);
  }

  const body = (await response.json()) as { results?: { id: string }[] };
  return { rev: body.results?.[0]?.id ?? '' };
}

/** Fires the Cloudflare deploy hook so the static site picks the change up. */
export async function triggerRebuild(env: Env): Promise<boolean> {
  if (!env.DEPLOY_HOOK_URL) return false;
  const response = await fetch(env.DEPLOY_HOOK_URL, { method: 'POST' });
  return response.ok;
}
