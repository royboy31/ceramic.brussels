import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Flex, Stack, Text } from '@sanity/ui';
// Sanity UI 4 ships Autocomplete on its own subpath only; the root export is gone.
import { Autocomplete } from '@sanity/ui/autocomplete';
import { set, unset, useClient, type ObjectInputProps } from 'sanity';
import { sitePath } from '../../lib/links';
import { DOCUMENTS_QUERY, documentOption, pageOptions, type SiteLinkOption } from '../siteLinks';

/**
 * The form of a "link to this site" mark in rich text: one search box.
 *
 * It lists every page of the site - the pages the code builds and every
 * document with a page (see ../siteLinks.ts) - and whatever is typed that
 * matches none of them is offered as a path of its own, so an editor can
 * pick or type. A picked document is stored as a reference, a picked page
 * or a typed path as `path`; the one not chosen is cleared, so a mark never
 * carries both. Above the box: what the link goes to now, and the English
 * address it renders as.
 */

interface Value {
  path?: string;
  internal?: { _ref?: string };
}

const clean = (path: string) => path.trim().replace(/^\/+|\/+$/g, '');

export function SiteLinkInput(props: ObjectInputProps) {
  const value = (props.value ?? {}) as Value;
  const client = useClient({ apiVersion: '2025-02-19' });
  const [docs, setDocs] = useState<SiteLinkOption[] | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let live = true;
    client
      .fetch<{ docs: any[]; years: number[] }>(DOCUMENTS_QUERY)
      .then((result) => {
        if (!live) return;
        setYears(result.years ?? []);
        setDocs((result.docs ?? []).map(documentOption).filter(Boolean) as SiteLinkOption[]);
      })
      .catch(() => live && setDocs([]));
    return () => {
      live = false;
    };
  }, [client]);

  const pages = useMemo(() => pageOptions(years), [years]);

  const typed = query.trim();
  const typedHref = typed ? sitePath(typed, 'en') : null;
  const options = useMemo(() => {
    const all = [...pages, ...(docs ?? [])];
    const known = all.some((o) => o.value.startsWith('path:') && clean(o.value.slice(5)) === clean(typed));
    // Only an address on this site can be typed in; another site's is an External link.
    return typed && typedHref && !known
      ? [{ value: `path:${typed}`, title: `Use "${typed}"`, group: 'Typed path', path: typedHref }, ...all]
      : all;
  }, [pages, docs, typed, typedHref]);

  const current: { title: string; detail: string } | null = value.internal?._ref
    ? (() => {
        const doc = docs?.find((o) => o.value === `doc:${value.internal!._ref}`);
        if (doc) return { title: `${doc.group}: ${doc.title}`, detail: doc.path };
        return docs
          ? { title: 'A document that is not published, or no longer exists', detail: 'The text shows without this link until it is.' }
          : { title: 'A document', detail: 'Loading…' };
      })()
    : value.path?.trim()
      ? {
          title: pages.find((o) => clean(o.value.slice(5)) === clean(value.path!))?.title ?? 'Typed path',
          detail: sitePath(value.path, 'en') ?? value.path,
        }
      : null;

  const choose = (selected: string) => {
    if (selected.startsWith('doc:')) {
      props.onChange([set({ _type: 'reference', _ref: selected.slice(4) }, ['internal']), unset(['path'])]);
    } else if (selected.startsWith('path:')) {
      const path = selected.slice(5);
      props.onChange([set(path === '' ? '/' : path, ['path']), unset(['internal'])]);
    }
    setQuery('');
  };

  return (
    <Stack gap={3}>
      {current && (
        <Card padding={3} radius={2} tone="primary" border>
          <Flex align="center" gap={3}>
            <Stack gap={2} flex={1}>
              <Text size={1} weight="medium">
                {current.title}
              </Text>
              <Text size={1} muted>
                {current.detail}
              </Text>
            </Stack>
            {!props.readOnly && (
              <Button
                mode="bleed"
                text="Clear"
                fontSize={1}
                onClick={() => props.onChange([unset(['path']), unset(['internal'])])}
              />
            )}
          </Flex>
        </Card>
      )}
      <Autocomplete
        id={`${props.id}-site-link`}
        placeholder={current ? 'Change: search a page, or type a path' : 'Search a page, or type a path'}
        options={options}
        loading={docs === null}
        openButton
        readOnly={props.readOnly}
        onQueryChange={(q) => setQuery(q ?? '')}
        onSelect={choose}
        filterOption={(q, option) =>
          option.group === 'Typed path' || `${option.title} ${option.group} ${option.path}`.toLowerCase().includes(q.toLowerCase())
        }
        renderValue={(v, option) => option?.title ?? v}
        renderOption={(option) => (
          <Card as="button" padding={3}>
            <Stack gap={2}>
              <Text size={1} weight="medium">
                {option.title}
              </Text>
              <Text size={1} muted>
                {option.group} · {option.path}
              </Text>
            </Stack>
          </Card>
        )}
      />
      {typed && !typedHref && (
        <Text size={1} muted>
          That is another site's address - use External link for it.
        </Text>
      )}
    </Stack>
  );
}
