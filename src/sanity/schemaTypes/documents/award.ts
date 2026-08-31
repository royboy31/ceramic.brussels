import { defineField, defineType } from 'sanity';

/** Jury Prize, Best Booth, Best Solo Show. */
export const award = defineType({
  name: 'award',
  title: 'Award',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Award',
      type: 'localeString',
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
      name: 'winnerExhibitor',
      title: 'Winning gallery',
      type: 'reference',
      to: [{ type: 'exhibitor' }],
    }),
    defineField({
      name: 'winnerArtist',
      title: 'Winning artist',
      type: 'reference',
      to: [{ type: 'artist' }],
    }),
    defineField({ name: 'citation', title: 'Jury citation', type: 'localeBlock' }),
    defineField({ name: 'image', title: 'Image', type: 'figure' }),
  ],
  preview: {
    select: {
      title: 'name.en',
      year: 'edition.year',
      gallery: 'winnerExhibitor.name',
      artist: 'winnerArtist.name',
      media: 'image',
    },
    prepare: ({ title, year, gallery, artist, media }) => ({
      title: title ?? '(unnamed award)',
      subtitle: [year, gallery ?? artist].filter(Boolean).join(' · '),
      media,
    }),
  },
});
