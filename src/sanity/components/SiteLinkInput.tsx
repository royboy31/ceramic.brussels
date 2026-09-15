import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Flex, Stack, Text } from '@sanity/ui';
// Sanity UI 4 ships Autocomplete on its own subpath only; the root export is gone.
import { Autocomplete } from '@sanity/ui/autocomplete';
import { set, unset, useClient, type ObjectInputProps, type StringInputProps } from 'sanity';
import { sitePath } from '../../lib/links';
import { DOCUMENTS_QUERY, documentOption, pageOptions, type SiteLinkOption } from '../siteLinks';

/**
 * One search box for a link inside this site, used in two places:
 *
 * - `SiteLinkInput` is the whole form of a "link to this site" mark in rich
 *   text. It lists the pages the code builds and every document with a page
 *   (see ../siteLinks.ts); a picked document is stored as a reference, a
 *   picked page or a typed path as `path`, and the one not chosen is cleared.
 * - `SitePathInput` is the `path` field of a `link` object or a menu item
 *   under "A section of this site". Documents have their own radio option
 *   there, so it lists pages only.
 *
 * Whatever is typed that matches nothing in the list is offered as a path of
 * its own, so an editor can pick or type. Above the box: what the link goes
 * to now, and the English address it renders as.
 */

const clean = (path: string) => path.trim().replace(/^\/+|\/+$/g, '');

interface Current {
  title: string;
  detail: string;
}

interface PickerProps {
  id: string;
  current: Current | null;
  readOnly?: boolean;
  includeDocs: boolean;
  /** `path:<path>` or `doc:<id>`. */
  onPick: (selected: string) => void;
  onClear: () => void;
  /** The store the picker feeds from, shared so both inputs read the same list. */
  store: SiteLinkStore;
}

interface SiteLinkStore {
  docs: SiteLinkOption[] | null;
  pages: SiteLinkOption[];
}

/** The pages and documents the picker offers; one fetch per mount. */
function useSiteLinkStore(): SiteLinkStore {
  const client = useClient({ apiVersion: '2025-02-19' });
  const [docs, setDocs] = useState<SiteLinkOption[] | null>(null);
  const [years, setYears] = useState<number[]>([]);

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
  return { docs, pages };
}

/** What a stored `path` points at, for the box above the picker. */
function describePath(path: string | undefined, pages: SiteLinkOption[]): Current | null {
  if (!path?.trim()) return null;
  return {
    title: pages.find((o) => clean(o.value.slice(5)) === clean(path))?.title ?? 'Typed path',
    detail: sitePath(path, 'en') ?? path,
  };
}

function SitePagePicker({ id, current, readOnly, includeDocs, onPick, onClear, store }: PickerProps) {
  const [query, setQuery] = useState('');
  const { docs, pages } = store;

  const typed = query.trim();
  const typedHref = typed ? sitePath(typed, 'en') : null;
  const options = useMemo(() => {
    const all = includeDocs ? [...pages, ...(docs ?? [])] : pages;
    const known = all.some((o) => o.value.startsWith('path:') && clean(o.value.slice(5)) === clean(typed));
    // Only an address on this site can be typed in; another site's is an external link.
    return typed && typedHref && !known
      ? [{ value: `path:${typed}`, title: `Use "${typed}"`, group: 'Typed path', path: typedHref }, ...all]
      : all;
  }, [includeDocs, pages, docs, typed, typedHref]);

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
            {!readOnly && <Button mode="bleed" text="Clear" fontSize={1} onClick={onClear} />}
          </Flex>
        </Card>
      )}
      <Autocomplete
        id={`${id}-site-link`}
        placeholder={current ? 'Change: search a page, or type a path' : 'Search a page, or type a path'}
        options={options}
        loading={includeDocs && docs === null}
        openButton
        readOnly={readOnly}
        onQueryChange={(q) => setQuery(q ?? '')}
        onSelect={(selected) => {
          onPick(selected);
          setQuery('');
        }}
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
          That is another site's address - use the external link for it.
        </Text>
      )}
    </Stack>
  );
}

interface MarkValue {
  path?: string;
  internal?: { _ref?: string };
}

/** The "link to this site" mark in rich text: a page, a document, or a typed path. */
export function SiteLinkInput(props: ObjectInputProps) {
  const value = (props.value ?? {}) as MarkValue;
  const store = useSiteLinkStore();

  const current: Current | null = value.internal?._ref
    ? (() => {
        const doc = store.docs?.find((o) => o.value === `doc:${value.internal!._ref}`);
        if (doc) return { title: `${doc.group}: ${doc.title}`, detail: doc.path };
        return store.docs
          ? { title: 'A document that is not published, or no longer exists', detail: 'The text shows without this link until it is.' }
          : { title: 'A document', detail: 'Loading…' };
      })()
    : describePath(value.path, store.pages);

  return (
    <SitePagePicker
      id={props.id}
      current={current}
      readOnly={props.readOnly}
      includeDocs
      store={store}
      onPick={(selected) => {
        if (selected.startsWith('doc:')) {
          props.onChange([set({ _type: 'reference', _ref: selected.slice(4) }, ['internal']), unset(['path'])]);
        } else {
          const path = selected.slice(5);
          props.onChange([set(path === '' ? '/' : path, ['path']), unset(['internal'])]);
        }
      }}
      onClear={() => props.onChange([unset(['path']), unset(['internal'])])}
    />
  );
}

/** The `path` of a `link` object or menu item: a page of the site, picked or typed. */
export function SitePathInput(props: StringInputProps) {
  const store = useSiteLinkStore();
  return (
    <SitePagePicker
      id={props.id}
      current={describePath(props.value, store.pages)}
      readOnly={props.readOnly}
      includeDocs={false}
      store={store}
      onPick={(selected) => {
        const path = selected.slice(5);
        props.onChange(set(path === '' ? '/' : path));
      }}
      onClear={() => props.onChange(unset())}
    />
  );
}
