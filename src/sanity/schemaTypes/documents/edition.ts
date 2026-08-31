import { defineField, defineType } from 'sanity';

/** The anchor every dated document hangs from. */
export const edition = defineType({
  name: 'edition',
  title: 'Edition',
  type: 'document',
  fields: [
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      validation: (rule) => rule.required().min(2020).max(2100).integer(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'localeString',
      description: 'e.g. Ceramic Brussels 2026',
    }),
    defineField({
      name: 'startDate',
      title: 'First day',
      type: 'date',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'endDate',
      title: 'Last day',
      type: 'date',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'venue',
      title: 'Venue',
      type: 'string',
      initialValue: 'Tour & Taxis, Brussels',
    }),
    defineField({ name: 'intro', title: 'Introduction', type: 'localeBlock' }),
    defineField({ name: 'cover', title: 'Cover image', type: 'figure' }),
    defineField({
      name: 'isCurrent',
      title: 'Current edition',
      type: 'boolean',
      description: 'Exactly one edition should be current. It drives the homepage and the exhibitor list.',
      initialValue: false,
    }),
    defineField({ name: 'fairMap', title: 'Fair map (PDF)', type: 'file' }),
    defineField({ name: 'catalogueUrl', title: 'Catalogue URL', type: 'url' }),
    defineField({ name: 'ticketsUrl', title: 'Tickets URL', type: 'url' }),
  ],
  orderings: [
    { title: 'Year, newest first', name: 'yearDesc', by: [{ field: 'year', direction: 'desc' }] },
  ],
  preview: {
    select: { year: 'year', isCurrent: 'isCurrent', media: 'cover' },
    prepare: ({ year, isCurrent, media }) => ({
      title: `Ceramic Brussels ${year ?? '--'}`,
      subtitle: isCurrent ? 'Current edition' : 'Archive',
      media,
    }),
  },
});
