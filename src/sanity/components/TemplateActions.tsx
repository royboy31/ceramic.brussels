import React, { useEffect, useMemo, useState } from 'react';
import { useClient, useDocumentOperation, type DocumentActionComponent } from 'sanity';
import { Box, Button, Card, Flex, Radio, Stack, Text, TextInput } from '@sanity/ui';

/**
 * The two halves of "templates are content":
 *
 *   Apply template…   replace (or extend) this document's sections with the
 *                     stack from a `pageTemplate` document
 *   Save as template  turn this document's sections into a new `pageTemplate`
 *
 * Both copy. A page and a template are never linked, so editing one never
 * touches the other - which is what lets the team make a template out of any
 * page they are happy with and keep reworking the page afterwards.
 *
 * Copying regenerates every `_key`, top to bottom. Keys only have to be
 * unique within one array, but Sanity's editor uses them to track selection
 * and drag state, and two pages sharing keys after an apply-then-copy chain
 * has produced confusing "wrong item moved" bugs elsewhere.
 */

const API_VERSION = '2024-11-01';

/** Which document types carry a `sections` builder, and how the template filter names them. */
const BUILDER_TYPES = new Set(['page', 'homepage', 'artist']);

const newKey = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);

/** Deep copy with fresh `_key`s on every array item, at every depth. */
function rekey<T>(value: T): T {
  if (Array.isArray(value)) return value.map(rekey) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = k === '_key' ? newKey() : rekey(v);
    }
    return out as T;
  }
  return value;
}

interface TemplateDoc {
  _id: string;
  title: string;
  description?: string;
  intro?: unknown;
  sections?: unknown[];
}

function TemplateIcon() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 25 25" fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="4.5" y="4.5" width="16" height="16" rx="1.5" />
      <path d="M4.5 9.5h16M9.5 9.5v11" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 25 25" fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="4.5" y="4.5" width="16" height="16" rx="1.5" />
      <path d="M8.5 4.5v6h8v-6M8.5 20.5v-6h8v6" />
    </svg>
  );
}

/* ------------------------------------------------------------ apply */

export const applyTemplateAction: DocumentActionComponent = (props) => {
  const { id, type, draft, published, onComplete } = props;
  const client = useClient({ apiVersion: API_VERSION });
  const { patch } = useDocumentOperation(id, type);

  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<TemplateDoc[] | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [mode, setMode] = useState<'replace' | 'append'>('replace');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = (draft ?? published) as { sections?: unknown[]; intro?: unknown } | null;
  const existing = current?.sections?.length ?? 0;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    client
      .fetch<TemplateDoc[]>(
        `*[_type == "pageTemplate" && !(_id in path("drafts.**")) && ($type in appliesTo || !defined(appliesTo))]
          | order(order asc, title asc){ _id, title, description, intro, sections }`,
        { type },
      )
      .then((rows) => {
        if (cancelled) return;
        setTemplates(rows);
        setChosen((prev) => prev ?? rows[0]?._id ?? null);
      })
      .catch((err) => !cancelled && setError(String(err?.message ?? err)));
    return () => {
      cancelled = true;
    };
    // `client` is deliberately not a dependency: useClient hands back a new
    // instance per render, and listing it re-runs the fetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, type]);

  const selected = useMemo(() => templates?.find((t) => t._id === chosen) ?? null, [templates, chosen]);

  if (!BUILDER_TYPES.has(type)) return null;

  const apply = () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const incoming = rekey(selected.sections ?? []);
      const sections = mode === 'append' ? [...(current?.sections ?? []), ...incoming] : incoming;
      const set: Record<string, unknown> = { sections };
      // A template's lead paragraph only fills an empty one - never overwrites.
      if (selected.intro && !current?.intro && type !== 'homepage') set.intro = rekey(selected.intro);
      patch.execute([{ set }]);
      setOpen(false);
      onComplete?.();
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setBusy(false);
    }
  };

  return {
    label: 'Apply template…',
    icon: TemplateIcon,
    onHandle: () => setOpen(true),
    dialog: open
      ? {
          type: 'dialog',
          header: 'Apply a template',
          onClose: () => setOpen(false),
          content: (
            <Box padding={4}>
            <Stack space={4}>
              <Text size={1} muted>
                Copies the template’s sections into this document. The page and the template stay independent
                afterwards.
              </Text>

              {error && (
                <Card tone="critical" padding={3} radius={2}>
                  <Text size={1}>{error}</Text>
                </Card>
              )}

              {templates === null && !error && (
                <Text size={1} muted>
                  Loading templates…
                </Text>
              )}

              {templates && templates.length === 0 && (
                <Card tone="caution" padding={3} radius={2}>
                  <Text size={1}>
                    No templates yet. Build a page you like, then choose “Save as template” from its menu.
                  </Text>
                </Card>
              )}

              {templates && templates.length > 0 && (
                <Stack space={2}>
                  {templates.map((t) => (
                    <Card
                      key={t._id}
                      as="label"
                      padding={3}
                      radius={2}
                      tone={t._id === chosen ? 'primary' : 'default'}
                      border
                      style={{ cursor: 'pointer' }}
                    >
                      <Flex align="flex-start" gap={3}>
                        <Box paddingTop={1}>
                          <Radio checked={t._id === chosen} onChange={() => setChosen(t._id)} name="template" />
                        </Box>
                        <Stack space={2}>
                          <Text weight="semibold">{t.title}</Text>
                          <Text size={1} muted>
                            {t.sections?.length ?? 0} sections{t.description ? ` · ${t.description}` : ''}
                          </Text>
                        </Stack>
                      </Flex>
                    </Card>
                  ))}
                </Stack>
              )}

              {existing > 0 && (
                <Stack space={2}>
                  <Text size={1} weight="semibold">
                    This document already has {existing} section{existing === 1 ? '' : 's'}
                  </Text>
                  <Flex gap={4}>
                    <Flex as="label" align="center" gap={2} style={{ cursor: 'pointer' }}>
                      <Radio checked={mode === 'replace'} onChange={() => setMode('replace')} name="mode" />
                      <Text size={1}>Replace them</Text>
                    </Flex>
                    <Flex as="label" align="center" gap={2} style={{ cursor: 'pointer' }}>
                      <Radio checked={mode === 'append'} onChange={() => setMode('append')} name="mode" />
                      <Text size={1}>Add the template’s after them</Text>
                    </Flex>
                  </Flex>
                </Stack>
              )}

              <Flex justify="flex-end" gap={2}>
                <Button mode="ghost" text="Cancel" onClick={() => setOpen(false)} />
                <Button
                  tone="primary"
                  text={busy ? 'Applying…' : mode === 'replace' && existing > 0 ? 'Replace sections' : 'Apply'}
                  disabled={busy || !selected}
                  onClick={apply}
                />
              </Flex>
            </Stack>
            </Box>
          ),
        }
      : undefined,
  };
};
applyTemplateAction.action = 'applyTemplate' as any;

/* ---------------------------------------------------------- save as */

export const saveAsTemplateAction: DocumentActionComponent = (props) => {
  const { type, draft, published, onComplete } = props;
  const client = useClient({ apiVersion: API_VERSION });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = (draft ?? published) as { sections?: unknown[]; intro?: unknown; title?: any } | null;
  const sections = current?.sections ?? [];

  if (!BUILDER_TYPES.has(type)) return null;

  const suggested =
    typeof current?.title === 'string'
      ? current.title
      : (current?.title?.en as string | undefined) ?? (type === 'homepage' ? 'Homepage' : '');

  const save = async () => {
    const title = name.trim() || suggested || 'Untitled template';
    setBusy(true);
    setError(null);
    try {
      await client.create({
        _type: 'pageTemplate',
        title,
        description: description.trim() || undefined,
        appliesTo: [type],
        order: 100,
        intro: type === 'homepage' ? undefined : rekey(current?.intro),
        sections: rekey(sections),
      });
      setDone(true);
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setOpen(false);
    setDone(false);
    setName('');
    setDescription('');
    onComplete?.();
  };

  return {
    label: 'Save as template',
    icon: SaveIcon,
    disabled: sections.length === 0,
    title: sections.length === 0 ? 'Add some sections first' : undefined,
    onHandle: () => setOpen(true),
    dialog: open
      ? {
          type: 'dialog',
          header: 'Save as template',
          onClose: close,
          content: done ? (
            <Box padding={4}>
            <Stack space={4}>
              <Text>Saved. It is now offered under “Apply template…” on every {type === 'page' ? 'page' : type}.</Text>
              <Flex justify="flex-end">
                <Button tone="primary" text="Close" onClick={close} />
              </Flex>
            </Stack>
            </Box>
          ) : (
            <Box padding={4}>
            <Stack space={4}>
              <Text size={1} muted>
                Copies this document’s {sections.length} section{sections.length === 1 ? '' : 's'} - text, images and all -
                into a new template. Edit the template afterwards to turn the text into placeholders if you like.
              </Text>
              <Stack space={2}>
                <Text size={1} weight="semibold">
                  Name
                </Text>
                <TextInput value={name} placeholder={suggested} onChange={(e) => setName(e.currentTarget.value)} />
              </Stack>
              <Stack space={2}>
                <Text size={1} weight="semibold">
                  When to use it (optional)
                </Text>
                <TextInput value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
              </Stack>
              {error && (
                <Card tone="critical" padding={3} radius={2}>
                  <Text size={1}>{error}</Text>
                </Card>
              )}
              <Flex justify="flex-end" gap={2}>
                <Button mode="ghost" text="Cancel" onClick={close} />
                <Button tone="primary" text={busy ? 'Saving…' : 'Save template'} disabled={busy} onClick={save} />
              </Flex>
            </Stack>
            </Box>
          ),
        }
      : undefined,
  };
};
saveAsTemplateAction.action = 'saveAsTemplate' as any;
