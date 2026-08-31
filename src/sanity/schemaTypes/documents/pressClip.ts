import { defineField, defineType } from 'sanity';

/** The press archive - the current site references 230+ articles. */
export const pressClip = defineType({
  name: 'pressClip',
  title: 'Press clipping',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Article title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'outlet',
      title: 'Outlet',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published',
      type: 'date',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'language',
      title: 'Language',
      type: 'string',
      options: {
        list: [
          { title: 'English', value: 'en' },
          { title: 'Français', value: 'fr' },
          { title: 'Nederlands', value: 'nl' },
          { title: 'Other', value: 'other' },
        ],
      },
      initialValue: 'en',
    }),
    defineField({
      name: 'edition',
      title: 'Edition',
      type: 'reference',
      to: [{ type: 'edition' }],
    }),
    defineField({ name: 'url', title: 'Article URL', type: 'url' }),
    defineField({ name: 'pdf', title: 'PDF scan', type: 'file' }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'publishedDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'title', outlet: 'outlet', date: 'publishedAt' },
    prepare: ({ title, outlet, date }) => ({
      title,
      subtitle: [outlet, date].filter(Boolean).join(' · '),
    }),
  },
});
