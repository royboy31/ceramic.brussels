import type { SanityClient } from '@sanity/client';
import { createPreviewSecret } from '@sanity/preview-url-secret/create-secret';
import {
  urlSearchParamPreviewPathname,
  urlSearchParamPreviewPerspective,
  urlSearchParamPreviewSecret,
} from '@sanity/preview-url-secret/constants';
import type { LocaleId } from '../lib/locales';
import { previewFields, previewLocations, type PreviewLocation } from './previewPaths';

/**
 * Opening a document's draft preview in a new tab - shared by "Open preview"
 * in the document's ⋯ menu and Preview in the top bar.
 *
 * It makes a one-hour secret and sends the tab through `/api/preview/enable`,
 * which checks the secret, sets the preview cookie and lands on the page. The
 * tab keeps working after the hour: the cookie is what the `/preview/` routes
 * look at, not the secret. The page follows the Studio's language selector,
 * so an editor working in French sees the French page.
 */

export const PREVIEW_API_VERSION = '2025-02-19';

/** Where the secret came from; readable in the dataset. */
const SOURCE = 'ceramic-brussels/open-preview';

/**
 * The page a document is, without the edition lookup. An edition-scoped
 * document counts as current until looked up, so this is for enabling a
 * button; `resolvePreviewHref` works out the real page.
 */
export function firstPreview(type: string, doc: Record<string, any> | null, lang: LocaleId): PreviewLocation | undefined {
  return doc ? previewLocations(type, previewFields(doc), lang)[0] : undefined;
}

/** The exact page: a past edition's exhibitor lives under its year, and last year's jury or events are on no page. */
export async function resolvePreviewHref(
  client: SanityClient,
  type: string,
  doc: Record<string, any>,
  lang: LocaleId,
): Promise<string | null> {
  const first = firstPreview(type, doc, lang);
  if (!first) return null;
  const ref = doc.edition?._ref;
  if (!ref) return first.href;
  const edition = await client.fetch<{ year?: number; isCurrent?: boolean } | null>(`*[_id == $ref][0]{ year, isCurrent }`, { ref });
  return previewLocations(type, { ...previewFields(doc), year: edition?.year, current: edition?.isCurrent }, lang)[0]?.href ?? null;
}

/**
 * Fills `tab` with the draft preview of `doc`. The tab must be opened by the
 * caller, synchronously inside the click - opened after an await, the browser
 * blocks it as a popup. Closes the tab and returns false when no page shows
 * the document.
 */
export async function openPreviewIn(
  tab: Window | null,
  client: SanityClient,
  type: string,
  doc: Record<string, any>,
  lang: LocaleId,
  userId?: string,
): Promise<boolean> {
  try {
    const href = await resolvePreviewHref(client, type, doc, lang);
    if (!href) {
      tab?.close();
      return false;
    }
    const { secret } = await createPreviewSecret(client, SOURCE, window.location.href, userId);
    const url = new URL('/api/preview/enable', window.location.origin);
    url.searchParams.set(urlSearchParamPreviewSecret, secret);
    url.searchParams.set(urlSearchParamPreviewPerspective, 'drafts');
    url.searchParams.set(urlSearchParamPreviewPathname, href);
    if (tab) tab.location.href = url.toString();
    else window.open(url.toString(), '_blank');
    return true;
  } catch (error) {
    console.error('Open preview failed', error);
    tab?.close();
    return false;
  }
}
