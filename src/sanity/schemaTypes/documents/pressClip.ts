import { defineField, defineType } from 'sanity';

/**
 * The press archive: "as seen in the press" on press & media → press. The
 * old site only linked a flipbook of clippings per edition (`pressClipsUrl`
 * on the edition), so these are made by editors, one per article.
 */
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
    // The design leads each card with the magazine's cover (request #20).
    defineField({
      name: 'cover',
      title: 'Cover',
      type: 'figure',
      description: 'The magazine cover or the article’s picture, portrait (about 3:4).',
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
      // Not read by any page; hidden rather than removed so existing values stay.
      hidden: true,
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
