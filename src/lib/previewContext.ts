import { AsyncLocalStorage } from 'node:async_hooks';
import type { SanityClient } from '@sanity/client';
import { sanityClient } from 'sanity:client';

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
