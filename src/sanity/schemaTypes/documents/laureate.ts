import { defineArrayMember, defineField, defineType } from 'sanity';

/**
 * An art-prize laureate of one edition. Links an artist to the year they were
 * selected and carries what the laureates page shows for them: the slideshow
 * and, optionally, a statement that differs from the artist's general bio.
 *
 * Kept separate from `artist` so the same person can be a laureate one year
 * and a booth artist or jury-prize solo show the next without the profile
 * being duplicated.
 */
export const laureate = defineType({
  name: 'laureate',
  title: 'Laureate',
  type: 'document',
  fields: [
    defineField({
      name: 'artist',
      title: 'Artist',
      type: 'reference',
      to: [{ type: 'artist' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'edition',
      title: 'Edition',
      type: 'reference',
      to: [{ type: 'edition' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      initialValue: 100,
      description: 'Position on the laureates page. Lower comes first.',
    }),
    defineField({
      name: 'statement',
      title: 'Text',
      type: 'localeBlock',
      description: 'Shown on the laureates page. Leave empty to use the artist’s biography.',
    }),
    defineField({
      name: 'images',
      title: 'Slideshow',
      type: 'array',
      of: [defineArrayMember({ type: 'figure' })],
      options: { layout: 'grid' },
    }),
  ],
  orderings: [{ title: 'Order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
  preview: {
    select: { name: 'artist.name', year: 'edition.year', media: 'images.0' },
    prepare: ({ name, year, media }) => ({
      title: name ?? '(no artist selected)',
      subtitle: year ? `Laureate ${year}` : undefined,
      media,
    }),
  },
});
