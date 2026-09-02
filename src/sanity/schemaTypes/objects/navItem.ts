import { defineArrayMember, defineField, defineType } from 'sanity';
import { BUILT_IN_ROUTES } from './routes';

export { BUILT_IN_ROUTES };

const targetFields = [
  defineField({
    name: 'kind',
    title: 'Links to',
    type: 'string',
    options: {
      list: [
        { title: 'A section of this site', value: 'route' },
        { title: 'A page', value: 'page' },
        { title: 'An external address', value: 'external' },
      ],
      layout: 'radio',
    },
    initialValue: 'route',
    validation: (rule) => rule.required(),
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
    description: 'Optional. A tab within the section, e.g. "laureates".',
    hidden: ({ parent }) => parent?.kind !== 'route',
  }),
  defineField({
    name: 'page',
    title: 'Page',
    type: 'reference',
    to: [{ type: 'page' }],
    hidden: ({ parent }) => parent?.kind !== 'page',
  }),
  defineField({
    name: 'url',
    title: 'URL',
    type: 'url',
    hidden: ({ parent }) => parent?.kind !== 'external',
  }),
];

const preview = {
  select: {
    label: 'label.en',
    kind: 'kind',
    route: 'route',
    anchor: 'anchor',
    // One hop through the reference only. `page.title.en` reaches two levels
    // past the reference, which Sanity never resolves - the preview then sits
    // as a loading skeleton forever instead of erroring.
    pageTitle: 'page.title',
    url: 'url',
  },
  prepare: ({ label, kind, route, anchor, pageTitle, url }: Record<string, any>) => {
    const pageLabel = typeof pageTitle === 'string' ? pageTitle : pageTitle?.en;
    const target =
      kind === 'page'
        ? pageLabel
        : kind === 'external'
          ? url
          : `/${route ?? ''}${anchor ? `#${anchor}` : ''}`;
    return { title: label ?? '(no label)', subtitle: target ?? '(nothing selected)' };
  },
};

/**
 * A sub-item in the menu overlay: the small grey line under a primary item
 * ("about / laureates / awards / jury"). Same targets as a primary item, no
 * further nesting.
 */
export const navChild = defineType({
  name: 'navChild',
  title: 'Sub-item',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'localeString',
      validation: (rule) => rule.required(),
    }),
    ...targetFields,
  ],
  preview,
});

/**
 * One entry in the main menu. An item points at one of three things:
 * a built-in listing route, an editor-created page, or an external URL.
 */
export const navItem = defineType({
  name: 'navItem',
  title: 'Menu item',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'localeString',
      description: 'Leave a language empty to fall back to English.',
      validation: (rule) => rule.required(),
    }),
    ...targetFields,
    defineField({
      name: 'children',
      title: 'Sub-items',
      type: 'array',
      of: [defineArrayMember({ type: 'navChild' })],
      description: 'Shown in small type under the item in the menu overlay.',
    }),
  ],
  preview,
});
