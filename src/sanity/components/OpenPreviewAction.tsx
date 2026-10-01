import React, { useEffect, useState } from 'react';
import { useClient, useCurrentUser, type DocumentActionComponent } from 'sanity';
import { firstPreview, openPreviewIn, PREVIEW_API_VERSION } from '../openPreview';
import { reportClosed, reportOpen } from '../currentDocument';
import { PreviewIcon } from './PreviewLauncher';
import { useEditingLocale } from './localeState';

/**
 * "Open preview": the document, rendered from its draft, in a new tab
 * (openPreview.ts). Editors often want the page on its own - full width, on
 * a phone, or just without the Studio around it.
 *
 * It also tells the top bar's Preview which document is open
 * (currentDocument.ts): this action is rendered for the open document, which
 * the navbar has no other way of knowing.
 */

export const openPreviewAction: DocumentActionComponent = (props) => {
  const { id, type, draft, published } = props;
  const client = useClient({ apiVersion: PREVIEW_API_VERSION });
  const user = useCurrentUser();
  const lang = useEditingLocale();
  const [busy, setBusy] = useState(false);

  /**
   * A brand-new document has neither draft nor published yet. It is still
   * the one the editor has open, so it is reported all the same (empty) -
   * before 2026-10-02 it was not, and the top bar's Preview answered
   * "Nothing open to preview" with the editor looking straight at the
   * document (the meeting's "inconsistent linking", 2026-10-01). With the
   * empty doc the launcher resolves no page and says *why* instead.
   */
  const doc = (draft ?? published ?? {}) as Record<string, any>;
  const target = firstPreview(type, doc, lang);

  useEffect(() => {
    reportOpen(id, type, doc);
  }, [id, type, doc]);
  useEffect(() => () => reportClosed(id), [id]);

  return {
    label: busy ? 'Opening preview…' : 'Open preview',
    icon: PreviewIcon,
    // No address - a page with no slug yet, or a document no page shows -
    // says so rather than hiding the action and leaving the editor hunting.
    disabled: !target || busy,
    title: target ? `Opens ${target.title} in a new tab` : 'No page shows this document yet',
    onHandle: async () => {
      if (!target) return;
      // Opened synchronously, inside the click, so the browser treats it as
      // the user's own tab; openPreviewIn fills it in once the secret exists.
      const tab = window.open('about:blank', '_blank');
      setBusy(true);
      try {
        await openPreviewIn(tab, client, type, doc, lang, user?.id);
      } finally {
        setBusy(false);
        props.onComplete?.();
      }
    },
  };
};

openPreviewAction.action = 'openPreview' as any;
