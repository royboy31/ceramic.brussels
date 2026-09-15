import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, Flex, Stack, Text } from '@sanity/ui';
import { useClient, useCurrentUser } from 'sanity';
import { currentDocument } from '../currentDocument';
import { openPreviewIn, PREVIEW_API_VERSION } from '../openPreview';
import { useEditingLocale } from './localeState';

/**
 * Preview in the top bar: the page being edited, from its draft, in a new
 * tab - "Open preview" from the document's ⋯ menu, for whatever document is
 * open - and straight back to the editor. It took the place of the
 * Presentation tool (side-by-side editing in a frame) on 2026-09-11, at
 * Kamindu's request.
 *
 * The click on Preview is what lets the tab open: this runs as the tool
 * mounts, still inside that click's user activation. A browser that blocks
 * it anyway gets a button, which is a click of its own.
 */

/** Local rather than from `@sanity/icons`, like the other icons here. */
export function PreviewIcon() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 25 25" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M3.5 12.5s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
      <circle cx="12.5" cy="12.5" r="2.5" />
    </svg>
  );
}

type State = 'opening' | 'blocked' | 'none' | 'nopage';

export function PreviewLauncher() {
  const client = useClient({ apiVersion: PREVIEW_API_VERSION });
  const user = useCurrentUser();
  const lang = useEditingLocale();
  // Read once: the editor unmounted a moment ago, and this is the document it had open.
  const [target] = useState(currentDocument);
  const [state, setState] = useState<State>(target ? 'opening' : 'none');
  const started = useRef(false);

  const back = useCallback(() => window.history.back(), []);

  const open = useCallback(
    (tab: Window | null, type: string, doc: Record<string, any>, returnAfter: boolean) => {
      setState('opening');
      openPreviewIn(tab, client, type, doc, lang, user?.id).then((ok) => {
        if (!ok) setState('nopage');
        else if (returnAfter) back();
        else setState('none');
      });
    },
    [back, client, lang, user?.id],
  );

  useEffect(() => {
    if (started.current || !target) return;
    started.current = true;
    const tab = window.open('about:blank', '_blank');
    if (tab) open(tab, target.type, target.doc, true);
    else setState('blocked');
  }, [open, target]);

  const clickOpen = () => {
    if (!target) return;
    open(window.open('about:blank', '_blank'), target.type, target.doc, true);
  };
  const clickHomepage = () => open(window.open('about:blank', '_blank'), 'homepage', {}, false);

  const content: Record<State, { title: string; body: string; actions: React.ReactNode }> = {
    opening: {
      title: 'Opening the preview…',
      body: 'The page opens in a new tab, from the draft. You will be back in the editor in a moment.',
      actions: null,
    },
    blocked: {
      title: 'The browser kept the new tab from opening',
      body: 'Press Open preview and it will open.',
      actions: (
        <>
          <Button text="Open preview" tone="primary" onClick={clickOpen} />
          <Button text="Back to editing" mode="ghost" onClick={back} />
        </>
      ),
    },
    none: {
      title: 'Nothing open to preview',
      body: 'Open a page, an artist, an exhibitor or a news item in Structure, then press Preview: its page opens in a new tab, from the draft.',
      actions: (
        <>
          <Button text="Preview the homepage" tone="primary" onClick={clickHomepage} />
          <Button text="Go to Structure" mode="ghost" onClick={() => (window.location.hash = '#/structure')} />
        </>
      ),
    },
    nopage: {
      title: 'No page shows this document',
      body: 'It has no address yet (no slug), or it belongs to an edition the site does not show.',
      actions: <Button text="Back to editing" mode="ghost" onClick={back} />,
    },
  };
  const { title, body, actions } = content[state];

  return (
    <Flex align="center" justify="center" height="fill" padding={4}>
      <Card padding={5} radius={3} shadow={1} style={{ maxWidth: 480 }}>
        <Stack gap={4}>
          <Text size={2} weight="semibold">
            {title}
          </Text>
          <Text size={1} muted>
            {body}
          </Text>
          {actions && <Flex gap={2}>{actions}</Flex>}
        </Stack>
      </Card>
    </Flex>
  );
}
