import { defineArrayMember, defineField, defineType } from 'sanity';

/** Talks and the multi-day schedule. */
export const programmeEvent = defineType({
  name: 'programmeEvent',
  title: 'Programme event',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'localeString',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title.en', maxLength: 96 },
    }),
    defineField({
      name: 'edition',
      title: 'Edition',
      type: 'reference',
      to: [{ type: 'edition' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'startsAt',
      title: 'Starts',
      type: 'datetime',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'endsAt', title: 'Ends', type: 'datetime' }),
    defineField({
      name: 'kind',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          { title: 'Talk', value: 'talk' },
          { title: 'Guided tour', value: 'tour' },
          { title: 'Workshop', value: 'workshop' },
          { title: 'Award ceremony', value: 'ceremony' },
        ],
      },
      initialValue: 'talk',
    }),
    defineField({ name: 'location', title: 'Location', type: 'string' }),
    defineField({
      name: 'speakers',
      title: 'Speakers',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'artist' }] })],
    }),
    defineField({ name: 'description', title: 'Description', type: 'localeBlock' }),
  ],
  orderings: [
    { title: 'Start time', name: 'startsAsc', by: [{ field: 'startsAt', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'title.en', startsAt: 'startsAt', kind: 'kind', location: 'location' },
    prepare: ({ title, startsAt, kind, location }) => ({
      title: title ?? '(untitled)',
      subtitle: [startsAt ? startsAt.slice(0, 16).replace('T', ' ') : null, kind, location]
        .filter(Boolean)
        .join(' · '),
    }),
  },
});
