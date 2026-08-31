import { defineField, defineType } from 'sanity';

/**
 * One entry in the main menu. An item points at one of three things:
 * a built-in listing route, an editor-created page, or an external URL.
 */
export const BUILT_IN_ROUTES = [
  { title: 'Home', value: '' },
  { title: 'Exhibitors', value: 'exhibitors' },
  { title: 'Artists', value: 'artists' },
  { title: 'Programme', value: 'programme' },
  { title: 'News', value: 'news' },
  { title: 'Awards', value: 'awards' },
  { title: 'Partners', value: 'partners' },
  { title: 'Press', value: 'press' },
  { title: 'Past editions', value: 'editions' },
] as const;

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
  ],
  preview: {
    select: {
      label: 'label.en',
      kind: 'kind',
      route: 'route',
      // One hop through the reference only. `page.title.en` reaches two levels
      // past the reference, which Sanity never resolves - the preview then sits
      // as a loading skeleton forever instead of erroring.
      pageTitle: 'page.title',
      url: 'url',
    },
    prepare: ({ label, kind, route, pageTitle, url }) => {
      const pageLabel = typeof pageTitle === 'string' ? pageTitle : pageTitle?.en;
      const target =
        kind === 'page'
          ? pageLabel
          : kind === 'external'
            ? url
            : route === ''
              ? '/'
              : `/${route}`;
      return { title: label ?? '(no label)', subtitle: target ?? '(nothing selected)' };
    },
  },
});
