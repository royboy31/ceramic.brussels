import { defineField, defineType } from 'sanity';
import { BUILT_IN_ROUTES } from './routes';
import { SitePathInput } from '../../components/SiteLinkInput';

/**
 * The documents a link can point at - the ones with a page of their own.
 * Shared with the "link to this site" annotation in rich text (richText.ts),
 * and src/lib/links.ts knows where each one lives.
 */
export const LINKABLE_TYPES = ['page', 'exhibitor', 'artist', 'newsItem', 'partner'] as const;

/**
 * A link an editor places in content: a homepage quick link, a "more on the
 * fair →" line, a "book your tickets ↗" pill. It points at one of three things
 * - a built-in section of the site, a document, or an external address - and
 * the frontend decides the arrow (→ internal, ↗ external).
 */
export const link = defineType({
  name: 'link',
  title: 'Link',
  type: 'object',
  fields: [
    defineField({ name: 'label', title: 'Label', type: 'localeString' }),
    defineField({
      name: 'kind',
      title: 'Links to',
      type: 'string',
      options: {
        list: [
          { title: 'A section of this site', value: 'route' },
          { title: 'A document', value: 'internal' },
          { title: 'An external address', value: 'external' },
        ],
        layout: 'radio',
      },
      initialValue: 'route',
    }),
    // "A section of this site": one search box over every page the code
    // builds, which also takes a typed path (components/SiteLinkInput.tsx);
    // links.ts `sitePath` writes it out in the reading page's language.
    defineField({
      name: 'path',
      title: 'Page',
      type: 'string',
      components: { input: SitePathInput },
      hidden: ({ parent }) => parent?.kind !== 'route',
    }),
    // The shape before the search box: a section from a fixed list and a tab
    // typed by hand. Still read by links.ts, and still shown for a link that
    // has one and no `path` yet, so nothing goes blank; picking a page hides
    // them and wins. scripts/internal-links.mjs converts them.
    defineField({
      name: 'route',
      title: 'Section',
      type: 'string',
      options: { list: BUILT_IN_ROUTES.map((r) => ({ title: r.title, value: r.value })) },
      hidden: ({ parent }) => parent?.kind !== 'route' || !!parent?.path || !parent?.route,
    }),
    defineField({
      name: 'anchor',
      title: 'Tab or anchor',
      type: 'string',
      description: 'Optional. A tab within the section, e.g. "laureates" or "food-drinks".',
      hidden: ({ parent }) => parent?.kind !== 'route' || !!parent?.path || !parent?.route,
    }),
    defineField({
      name: 'internal',
      title: 'Document',
      type: 'reference',
      to: LINKABLE_TYPES.map((type) => ({ type })),
      hidden: ({ parent }) => parent?.kind !== 'internal',
    }),
    defineField({
      name: 'external',
      title: 'External URL',
      type: 'url',
      hidden: ({ parent }) => parent?.kind !== 'external',
    }),
  ],
  preview: {
    select: { label: 'label.en', kind: 'kind', path: 'path', route: 'route', anchor: 'anchor', url: 'external' },
    prepare: ({ label, kind, path, route, anchor, url }) => ({
      title: label ?? '(no label)',
      subtitle:
        kind === 'external'
          ? url
          : kind === 'internal'
            ? 'document'
            : path
              ? `/${path.replace(/^\/+/, '')}`
              : `/${route ?? ''}${anchor ? `#${anchor}` : ''}`,
    }),
  },
});
