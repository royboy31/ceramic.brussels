import { AsyncLocalStorage } from 'node:async_hooks';
import type { SanityClient } from '@sanity/client';
import { sanityClient } from 'sanity:client';
import { tagImages } from './previewImages';

/**
 * Which Sanity client a render uses.
 *
 * Every query in queries.ts goes through `currentClient()`. Normally that is
 * the build-time client from `sanity:client` - unauthenticated, published
 * documents only, which is what the static site is made from. A request to
 * `/preview/...` runs its whole render inside `runWithPreview`, and then the
 * same queries read drafts with a token and stega-encode their strings so
 * the Studio can map what is on screen back to the field it came from.
 *
 * The store is an AsyncLocalStorage rather than a module variable because a
 * Worker handles requests concurrently: a module variable set by one preview
 * request would leak into the published pages another request is rendering.
 */

interface PreviewStore {
  client: SanityClient;
}

const storage = new AsyncLocalStorage<PreviewStore>();

/** The client for the current render: the preview one inside a preview request, otherwise the default. */
export function currentClient(): SanityClient {
  return storage.getStore()?.client ?? sanityClient;
}

/** True while rendering a preview request. Base.astro uses it to mount the visual editing overlay. */
export function isPreview(): boolean {
  return storage.getStore() !== undefined;
}

export function runWithPreview<T>(client: SanityClient, fn: () => Promise<T>): Promise<T> {
  return storage.run({ client }, fn);
}

/**
 * A query in a preview render. The client marks every string for the
 * overlay by itself; this asks for the source map it did that from and
 * marks the images too (previewImages.ts), which the overlay cannot find
 * on its own unless they have alt text.
 */
export async function previewFetch<T>(query: string, params: Record<string, unknown>): Promise<T> {
  const response = await currentClient().fetch(query, params, { filterResponse: false });
  tagImages(response.result, response.resultSourceMap);
  return response.result as T;
}
