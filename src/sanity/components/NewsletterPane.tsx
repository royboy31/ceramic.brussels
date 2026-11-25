import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Box, Button, Card, Dialog, Flex, Select, Spinner, Stack, Text, TextInput } from '@sanity/ui';
import { useClient, useCurrentUser } from 'sanity';
import { renderNewsletter } from '../../newsletter/render';

/**
 * The newsletter's second tab in the Studio: the email as it will arrive,
 * at desktop or phone width, and the Mailchimp controls under it.
 *
 * The preview is rendered here, in the browser, by src/newsletter/render.ts
 * from what the form holds right now (the draft), and that exact HTML is
 * what a test or a send posts to /api/newsletters/mailchimp - there is no
 * second rendering anywhere that could disagree with what Félicie saw.
 *
 * Sending, in order: pick an audience (and a saved segment, if any), send a
 * test to yourself, then "Prepare" - which builds the campaign in Mailchimp
 * and answers with the number of people it would go to - and only then
 * "Send", behind a dialog that repeats that number. A real send needs the
 * changes published, so what went out is what the document says; every
 * test and send is written into the document's Mailchimp history with the
 * name of whoever did it. The server lets in Sanity administrators only.
 */

type Doc = Record<string, any>;
interface Props {
  document: { displayed: Doc; draft?: Doc | null; published?: Doc | null };
  documentId: string;
}
interface Audience {
  id: string;
  name: string;
  members: number | null;
  segments: { id: number; name: string; members: number }[];
}
interface Prepared {
  campaignId: string;
  webId?: number;
  recipients: number | null;
  listName: string;
  segment: string;
  ready: boolean;
  problems: string[];
}

const SITE = 'https://www.ceramic.brussels';
const WIDTHS = { desktop: 700, phone: 375 } as const;

function readStudioToken(projectId?: string): string | undefined {
  if (!projectId || typeof localStorage === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(`__studio_auth_token_${projectId}`);
    return raw ? (JSON.parse(raw)?.token as string | undefined) : undefined;
  } catch {
    return undefined;
  }
}

export function NewsletterPane({ document, documentId }: Props) {
  const client = useClient({ apiVersion: '2024-01-01' });
  const user = useCurrentUser();
  const { projectId = '', dataset = 'production', token } = client.config();
  const doc = document.displayed ?? {};
  const html = useMemo(() => renderNewsletter(doc, { projectId, dataset, siteUrl: SITE }), [doc, projectId, dataset]);

  const [width, setWidth] = useState<keyof typeof WIDTHS>('desktop');
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(1200);
  const fit = useCallback(() => {
    const body = frame.current?.contentDocument?.body;
    if (body) setHeight(Math.max(400, body.scrollHeight + 20));
  }, []);
  useEffect(() => {
    const id = window.setTimeout(fit, 400);
    return () => window.clearTimeout(id);
  }, [html, width, fit]);

  /* ------------------------------------------------------------ Mailchimp */

  const studioToken = token ?? readStudioToken(projectId);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [audiences, setAudiences] = useState<Audience[] | null>(null);
  const [listId, setListId] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [testTo, setTestTo] = useState(user?.email ?? '');
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [confirming, setConfirming] = useState(false);

  const api = useCallback(
    async (body: Record<string, unknown>) => {
      const response = await fetch('/api/newsletters/mailchimp/', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json', ...(studioToken ? { 'x-sanity-token': studioToken } : {}) },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      const answer = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(answer.error ?? `Failed (${response.status})`);
      return answer;
    },
    [studioToken],
  );

  const run = useCallback(
    async (label: string, fn: () => Promise<void>) => {
      setBusy(label);
      setError(null);
      setNotice(null);
      try {
        await fn();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const loadAudiences = () =>
    run('audiences', async () => {
      const { audiences: list } = await api({ action: 'audiences' });
      setAudiences(list);
      if (list.length === 1) setListId(list[0].id);
    });

  /** Writes the campaign and a history line onto the document (draft and published alike). */
  const record = useCallback(
    async (fields: Record<string, unknown>, action: string, detail: string) => {
      const baseId = documentId.replace(/^drafts\./, '');
      // Both copies, so publishing the draft later cannot drop the history.
      const ids = [...(document.published ? [baseId] : []), ...(document.draft ? [`drafts.${baseId}`] : [])];
      const entry = { _type: 'nlSendLog', _key: Math.random().toString(36).slice(2, 10), at: new Date().toISOString(), by: user?.name ?? user?.email ?? '', action, detail };
      const tx = client.transaction();
      for (const id of ids) {
        tx.patch(id, (p) =>
          p
            .setIfMissing({ mailchimp: { _type: 'object', log: [] } })
            .setIfMissing({ 'mailchimp.log': [] })
            .set(Object.fromEntries(Object.entries(fields).map(([k, v]) => [`mailchimp.${k}`, v])))
            .append('mailchimp.log', [entry]),
        );
      }
      if (ids.length) await tx.commit({ autoGenerateArrayKeys: true });
    },
    [client, document.draft, document.published, documentId, user],
  );

  const common = () => ({
    html,
    subject: doc.subject,
    previewText: doc.previewText,
    title: doc.title,
    campaignId: doc.mailchimp?.campaignId,
    listId,
    segmentId: segmentId ? Number(segmentId) : undefined,
  });

  const sendTest = () =>
    run('test', async () => {
      const emails = testTo.split(/[,;\s]+/).filter(Boolean);
      const answer = await api({ action: 'test', emails, ...common() });
      await record({ campaignId: answer.campaignId, webId: answer.webId, status: 'save' }, 'test', `to ${answer.sentTo.join(', ')}`);
      setPrepared(null);
      setNotice(`Test sent to ${answer.sentTo.join(', ')}. It can take a minute to arrive.`);
    });

  const prepare = () =>
    run('prepare', async () => {
      const answer = await api({ action: 'prepare', ...common() });
      await record({ campaignId: answer.campaignId, webId: answer.webId, status: answer.status }, 'prepared', `${answer.recipients} recipients`);
      setPrepared(answer);
    });

  const send = () =>
    run('send', async () => {
      if (!prepared) return;
      const answer = await api({ action: 'send', campaignId: prepared.campaignId, expectRecipients: prepared.recipients });
      await record({ status: answer.status, archiveUrl: answer.archiveUrl }, 'sent', `${answer.recipients} recipients`);
      setConfirming(false);
      setPrepared(null);
      setNotice(`Sent to ${answer.recipients} people. Mailchimp is delivering it now.`);
    });

  const sent = doc.mailchimp?.status === 'sent' || doc.mailchimp?.status === 'sending';
  const unpublished = !!document.draft;
  const list = audiences?.find((a) => a.id === listId);

  return (
    <Box padding={4}>
      <Stack space={4}>
        <Flex gap={2} align="center" wrap="wrap">
          <Button mode={width === 'desktop' ? 'default' : 'ghost'} text="Desktop" onClick={() => setWidth('desktop')} />
          <Button mode={width === 'phone' ? 'default' : 'ghost'} text="Phone" onClick={() => setWidth('phone')} />
          <Box flex={1} />
          <Text size={1} muted>
            {doc.subject ? `Subject: ${doc.subject}` : 'No subject line yet'}
          </Text>
        </Flex>

        <Card tone="transparent" padding={3} style={{ background: '#e9e9e6', overflowX: 'auto' }}>
          <iframe
            ref={frame}
            title="Newsletter preview"
            srcDoc={html}
            onLoad={fit}
            sandbox="allow-same-origin allow-popups"
            style={{ display: 'block', margin: '0 auto', width: WIDTHS[width], height, border: 0, background: '#fff' }}
          />
        </Card>

        <Card padding={4} radius={2} shadow={1}>
          <Stack space={4}>
            <Flex align="center" gap={2}>
              <Text weight="semibold">Send with Mailchimp</Text>
              {doc.mailchimp?.status && <Badge tone={sent ? 'positive' : 'primary'}>{sent ? 'sent' : 'campaign ready in Mailchimp'}</Badge>}
            </Flex>

            {sent ? (
              <Text size={1}>
                This newsletter has gone out{doc.mailchimp?.archiveUrl ? <> - <a href={doc.mailchimp.archiveUrl} target="_blank" rel="noreferrer">web version</a></> : ''}. To send it again, duplicate it.
              </Text>
            ) : !audiences ? (
              <Button text="Connect to Mailchimp" tone="primary" onClick={loadAudiences} disabled={!!busy} icon={busy === 'audiences' ? Spinner : undefined} />
            ) : (
              <Stack space={3}>
                <Stack space={2}>
                  <Text size={1} weight="semibold">Audience</Text>
                  <Select value={listId} onChange={(e) => { setListId(e.currentTarget.value); setSegmentId(''); setPrepared(null); }}>
                    <option value="">Choose…</option>
                    {audiences.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.members ?? '?'} contacts)
                      </option>
                    ))}
                  </Select>
                  {list && list.segments.length > 0 && (
                    <Select value={segmentId} onChange={(e) => { setSegmentId(e.currentTarget.value); setPrepared(null); }}>
                      <option value="">Everyone in {list.name}</option>
                      {list.segments.map((s) => (
                        <option key={s.id} value={s.id}>
                          Only: {s.name} ({s.members})
                        </option>
                      ))}
                    </Select>
                  )}
                </Stack>

                <Stack space={2}>
                  <Text size={1} weight="semibold">Test first</Text>
                  <Flex gap={2}>
                    <Box flex={1}>
                      <TextInput value={testTo} onChange={(e) => setTestTo(e.currentTarget.value)} placeholder="you@example.com, another@example.com" />
                    </Box>
                    <Button text="Send a test" mode="ghost" onClick={sendTest} disabled={!listId || !testTo || !!busy} icon={busy === 'test' ? Spinner : undefined} />
                  </Flex>
                  <Text size={1} muted>Up to five addresses. The VIP code shows as *|VIPCODE|* in a test.</Text>
                </Stack>

                <Stack space={2}>
                  <Text size={1} weight="semibold">Send for real</Text>
                  {unpublished && <Text size={1}>Publish your changes first: what goes out must be what the document says.</Text>}
                  <Flex gap={2}>
                    <Button text="Prepare" mode="ghost" onClick={prepare} disabled={!listId || unpublished || !!busy} icon={busy === 'prepare' ? Spinner : undefined} />
                    {prepared && (
                      <Button
                        text={`Send to ${prepared.recipients} people…`}
                        tone="critical"
                        onClick={() => setConfirming(true)}
                        disabled={!prepared.ready || unpublished || !!busy}
                      />
                    )}
                  </Flex>
                  {prepared && (
                    <Text size={1}>
                      Ready in Mailchimp for {prepared.listName}
                      {prepared.segment ? ` (${prepared.segment})` : ''}: {prepared.recipients} recipients.
                      {!prepared.ready && ` Mailchimp says it is not ready: ${prepared.problems.join(' ')}`}
                    </Text>
                  )}
                </Stack>
              </Stack>
            )}

            {error && (
              <Card tone="critical" padding={3} radius={2}>
                <Text size={1}>{error}</Text>
              </Card>
            )}
            {notice && (
              <Card tone="positive" padding={3} radius={2}>
                <Text size={1}>{notice}</Text>
              </Card>
            )}
          </Stack>
        </Card>
      </Stack>

      {confirming && prepared && (
        <Dialog id="newsletter-send" header="Send this newsletter?" onClose={() => setConfirming(false)} width={1}>
          <Box padding={4}>
            <Stack space={4}>
              <Text>
                “{doc.subject}” goes to <strong>{prepared.recipients} people</strong> in {prepared.listName}
                {prepared.segment ? ` (${prepared.segment})` : ''}. This cannot be undone.
              </Text>
              <Flex gap={2} justify="flex-end">
                <Button text="Cancel" mode="ghost" onClick={() => setConfirming(false)} />
                <Button text={`Send to ${prepared.recipients} people`} tone="critical" onClick={send} disabled={!!busy} icon={busy === 'send' ? Spinner : undefined} />
              </Flex>
            </Stack>
          </Box>
        </Dialog>
      )}
    </Box>
  );
}
