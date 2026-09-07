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

  const doc = (draft ?? published) as Record<string, unknown> | null;
  const target = doc ? previewLocations(type, previewFields(doc), lang)[0] : undefined;

  if (!doc) return null;

  return {
    label: busy ? 'Opening preview…' : 'Open preview',
    icon: EyeIcon,
    // A page with no slug has no address yet; say so rather than hide the
    // action and leave the editor hunting for it.
    disabled: !target || busy,
    title: target ? `Opens ${target.title} in a new tab` : 'Give the document a slug first',
    onHandle: async () => {
      if (!target) return;
      // Opened synchronously, inside the click, so the browser treats it as
      // the user's own tab. Filling it in after the secret exists is fine;
      // opening it after an await gets it blocked as a popup.
      const tab = window.open('about:blank', '_blank');
      setBusy(true);
      try {
        const { secret } = await createPreviewSecret(client, SOURCE, window.location.href, user?.id);
        const url = new URL('/api/preview/enable', window.location.origin);
        url.searchParams.set(urlSearchParamPreviewSecret, secret);
        url.searchParams.set(urlSearchParamPreviewPerspective, 'drafts');
        url.searchParams.set(urlSearchParamPreviewPathname, target.href);
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
