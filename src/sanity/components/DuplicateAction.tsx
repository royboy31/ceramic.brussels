import React, { useState } from 'react';
import { useClient, type DocumentActionComponent } from 'sanity';
import { useRouter } from 'sanity/router';

/**
 * "Duplicate", replacing Sanity's built-in one.
 *
 * The built-in copies every field, slugs included, which leaves two documents
 * claiming the same URL. Nothing warns about it: the copy looks finished, and
 * whichever the build picks up wins. So this clears the slug and marks the
 * title, which turns the copy into an obvious draft rather than a silent
 * conflict.
 *
 * Everything else is carried over - a duplicated exhibitor keeps its edition,
 * artists and images, which is the point of duplicating one.
 */

/** Fields Sanity owns. A copy must not inherit any of them. */
const SYSTEM_FIELDS = new Set(['_id', '_rev', '_createdAt', '_updatedAt', '_system']);

/** Local rather than from `@sanity/icons`, whose export surface is a
 *  transitive dependency this project does not control. */
function DuplicateIcon() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 25 25" fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="4.5" y="4.5" width="11" height="13" rx="1.5" />
      <path d="M8 20.5h9a1.5 1.5 0 0 0 1.5-1.5V8" />
    </svg>
  );
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Appends "(copy)" to a title, whether it is a plain string or a localised
 * object. Only locales that actually hold text are touched - suffixing an
 * empty French title would invent a translation that does not exist.
 */
function markAsCopy(value: unknown): unknown {
  if (typeof value === 'string') return value.trim() === '' ? value : `${value} (copy)`;
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) =>
        key.startsWith('_') ? [key, inner] : [key, markAsCopy(inner)],
      ),
    );
  }
  return value;
}

/**
 * The copy, ready to create: system fields dropped, a new draft id, no slug,
 * and a name that says what it is.
 */
function freshCopy(source: Record<string, unknown>): Record<string, unknown> {
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!SYSTEM_FIELDS.has(key)) copy[key] = value;
  }

  copy._id = `drafts.${crypto.randomUUID()}`;

  // Two documents cannot share a URL. Leaving it empty makes the editor choose
  // one, and the page will not build until they do.
  delete copy.slug;

  // Whichever field this type calls its name.
  if ('title' in copy) copy.title = markAsCopy(copy.title);
  else if ('name' in copy) copy.name = markAsCopy(copy.name);

  return copy;
}

export const duplicateAction: DocumentActionComponent = (props) => {
  const { type, draft, published, onComplete } = props;
  const client = useClient({ apiVersion: '2024-11-01' });
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // Duplicating the draft when there is one: the editor means what is on
  // screen, not the last published version.
  const source = (draft ?? published) as Record<string, unknown> | null;
  if (!source) return null;

  return {
    label: busy ? 'Duplicating…' : 'Duplicate',
    icon: DuplicateIcon,
    disabled: busy,
    onHandle: async () => {
      setBusy(true);
      try {
        const created = await client.create(freshCopy(source));
        onComplete?.();
        router.navigateIntent('edit', {
          id: created._id.replace(/^drafts\./, ''),
          type,
        });
      } catch (error) {
        // Leaving the dialog open with the button re-enabled is better than
        // closing as though it had worked.
        console.error('Duplicate failed', error);
        setBusy(false);
      }
    },
  };
};

/**
 * The stable identifier Sanity uses to recognise this as the duplicate action.
 * Without it the component is just an anonymous extra entry, and anything that
 * filters actions by name - the singleton rule in sanity.config.ts does - stops
 * seeing it.
 */
duplicateAction.action = 'duplicate';
