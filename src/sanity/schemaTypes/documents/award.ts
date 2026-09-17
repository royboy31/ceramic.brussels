import { defineArrayMember, defineField, defineType } from 'sanity';

/**
 * A prize handed out at one edition. Two families:
 *
 * - Art-prize awards: the jury prize plus the residencies, exhibitions and
 *   monographs institutional partners grant to the laureates. Rendered on the
 *   art-prize "awards" tab as "→ Marie Pic will present a solo show…".
 * - Fair awards: best booth, best solo show, special prizes - given to an
 *   exhibitor, sometimes for an artist's work.
 */
export const award = defineType({
  name: 'award',
  title: 'Award',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Award',
      type: 'localeString',
      description: 'e.g. "jury prize", "Keramis", "best booth"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'family',
      title: 'Family',
      type: 'string',
      options: {
        list: [
          { title: 'Art prize', value: 'art-prize' },
          { title: 'Fair award', value: 'fair' },
        ],
        layout: 'radio',
      },
      initialValue: 'art-prize',
      validation: (rule) => rule.required(),
      description:
        'Art prize awards make the art prize "awards" tab; fair awards (best booth, best solo show…) make the exhibitors "awards" page. Both show the newest year that has any.',
    }),
    defineField({
      name: 'edition',
      title: 'Edition',
      type: 'reference',
      to: [{ type: 'edition' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'partner',
      title: 'Granted by',
      type: 'reference',
      to: [{ type: 'partner' }],
      // Granted by, winning gallery and citation are kept for the imported
      // data but hidden: the awards tab shows name, laureates, outcome, text
      // and image, nothing else.
      hidden: true,
    }),
    defineField({
      name: 'laureates',
      title: 'Laureates',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'artist' }] })],
      description: 'The artist(s) who received it. Their names become links.',
    }),
    defineField({
      name: 'winnerExhibitor',
      title: 'Winning gallery',
      type: 'reference',
      to: [{ type: 'exhibitor' }],
      description: 'The exhibitor a fair award went to. The exhibitors "awards" page shows its name, city and pictures.',
      // Only a fair award has a winning gallery; an art prize award has laureates.
      hidden: ({ document }) => document?.family !== 'fair',
    }),
    defineField({
      name: 'outcome',
      title: 'Outcome',
      type: 'localeString',
      description:
        'What the laureate gets, continuing their name: "will present a solo show during ceramic brussels 2027".',
    }),
    defineField({ name: 'description', title: 'Description', type: 'localeBlock' }),
    defineField({ name: 'citation', title: 'Jury citation', type: 'localeBlock', hidden: true }),
    defineField({ name: 'image', title: 'Image', type: 'figure', description: 'One picture, as before. The slideshow below wins when it has any.' }),
    defineField({
      name: 'images',
      title: 'Slideshow',
      type: 'array',
      of: [defineArrayMember({ type: 'figure' })],
      options: { layout: 'grid' },
      description: 'The three fair photos beside the award in the design ("1/3"), each with its caption.',
    }),
    defineField({ name: 'order', title: 'Order', type: 'number', initialValue: 100 }),
  ],
  orderings: [{ title: 'Order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
  preview: {
    select: {
      title: 'name.en',
      year: 'edition.year',
      family: 'family',
      gallery: 'winnerExhibitor.name',
      first: 'laureates.0.name',
      media: 'image',
    },
    prepare: ({ title, year, family, gallery, first, media }) => ({
      title: title ?? '(unnamed award)',
      subtitle: [year, family === 'fair' ? gallery : first].filter(Boolean).join(' · '),
      media,
    }),
  },
});
