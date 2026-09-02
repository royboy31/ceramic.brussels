import { defineField, defineType } from 'sanity';
import { BUILT_IN_ROUTES } from './routes';

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
    defineField({
      name: 'route',
      title: 'Section',
      type: 'string',
      options: { list: BUILT_IN_ROUTES.map((r) => ({ title: r.title, value: r.value })) },
      hidden: ({ parent }) => parent?.kind !== 'route',
    }),
    defineField({
      name: 'anchor',
      title: 'Tab or anchor',
      type: 'string',
      description: 'Optional. A tab within the section, e.g. "laureates" or "food-drinks".',
      hidden: ({ parent }) => parent?.kind !== 'route',
    }),
    defineField({
      name: 'internal',
      title: 'Document',
      type: 'reference',
      to: [
        { type: 'page' },
        { type: 'exhibitor' },
        { type: 'artist' },
        { type: 'newsItem' },
        { type: 'partner' },
      ],
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
    select: { label: 'label.en', kind: 'kind', route: 'route', anchor: 'anchor', url: 'external' },
    prepare: ({ label, kind, route, anchor, url }) => ({
      title: label ?? '(no label)',
      subtitle:
        kind === 'external'
          ? url
          : kind === 'internal'
            ? 'document'
            : `/${route ?? ''}${anchor ? `#${anchor}` : ''}`,
    }),
  },
});
