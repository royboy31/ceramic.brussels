import React, { useState } from 'react';
import { useClient, useCurrentUser, type DocumentActionComponent } from 'sanity';
import { createPreviewSecret } from '@sanity/preview-url-secret/create-secret';
import {
  urlSearchParamPreviewPathname,
  urlSearchParamPreviewPerspective,
  urlSearchParamPreviewSecret,
} from '@sanity/preview-url-secret/constants';
import { previewFields, previewLocations } from '../previewPaths';
import { useEditingLocale } from './localeState';

/**
 * "Open preview": the document, rendered from its draft, in a new tab.
 *
 * The Presentation tool's Preview tab does the same inside the Studio, but
 * editors often want the page on its own - full width, on a phone, or just
 * without the Studio around it. This makes the same kind of one-hour secret
 * the Presentation tool makes, and sends the new tab through
 * `/api/preview/enable`, which checks the secret, sets the preview cookie
 * and lands on the page. The tab keeps working after the hour: the cookie is
 * what the `/preview/` routes look at, not the secret.
 *
 * Which page opens follows the Studio's language selector, so an editor
 * working in French sees the French page.
 */

const API_VERSION = '2025-02-19';

/** Where the secret came from; readable in the dataset next to Presentation's own. */
const SOURCE = 'ceramic-brussels/open-preview';

/** Local rather than from `@sanity/icons`, like the other actions here. */
function EyeIcon() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 25 25" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M3.5 12.5s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
      <circle cx="12.5" cy="12.5" r="2.5" />
    </svg>
  );
}

export const openPreviewAction: DocumentActionComponent = (props) => {
  const { type, draft, published } = props;
  const client = useClient({ apiVersion: API_VERSION });
  const user = useCurrentUser();
  const lang = useEditingLocale();
  const [busy, setBusy] = useState(false);

  const doc = (draft ?? published) as Record<string, any> | null;
  // Before the edition is looked up an edition-scoped document counts as
  // current, so the action stays enabled; the click works out the real page.
  const target = doc ? previewLocations(type, previewFields(doc), lang)[0] : undefined;

  if (!doc) return null;

  return {
    label: busy ? 'Opening preview…' : 'Open preview',
    icon: EyeIcon,
    // No address - a page with no slug yet, or a document no page shows -
    // says so rather than hiding the action and leaving the editor hunting.
    disabled: !target || busy,
    title: target ? `Opens ${target.title} in a new tab` : 'No page shows this document yet',
    onHandle: async () => {
      if (!target) return;
      // Opened synchronously, inside the click, so the browser treats it as
      // the user's own tab. Filling it in after the secret exists is fine;
      // opening it after an await gets it blocked as a popup.
      const tab = window.open('about:blank', '_blank');
      setBusy(true);
      try {
        // A past edition's exhibitor lives under its year, and last year's
        // jury or events are on no page: the edition decides.
        let href = target.href;
        const ref = doc.edition?._ref;
        if (ref) {
          const edition = await client.fetch<{ year?: number; isCurrent?: boolean } | null>(
            `*[_id == $ref][0]{ year, isCurrent }`,
            { ref },
          );
          const exact = previewLocations(type, { ...previewFields(doc), year: edition?.year, current: edition?.isCurrent }, lang)[0];
          if (!exact) {
            tab?.close();
            return;
          }
          href = exact.href;
        }
        const { secret } = await createPreviewSecret(client, SOURCE, window.location.href, user?.id);
        const url = new URL('/api/preview/enable', window.location.origin);
        url.searchParams.set(urlSearchParamPreviewSecret, secret);
        url.searchParams.set(urlSearchParamPreviewPerspective, 'drafts');
        url.searchParams.set(urlSearchParamPreviewPathname, href);
        if (tab) tab.location.href = url.toString();
        else window.open(url.toString(), '_blank');
      } catch (error) {
        console.error('Open preview failed', error);
        tab?.close();
      } finally {
        setBusy(false);
        props.onComplete?.();
      }
    },
  };
};

openPreviewAction.action = 'openPreview' as any;
