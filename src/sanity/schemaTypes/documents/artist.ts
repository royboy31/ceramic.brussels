import { defineArrayMember, defineField, defineType } from 'sanity';

export const artist = defineType({
  name: 'artist',
  title: 'Artist',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'nationality', title: 'Nationality', type: 'string' }),
    defineField({ name: 'birthYear', title: 'Year of birth', type: 'number' }),
    defineField({ name: 'bio', title: 'Biography', type: 'localeBlock' }),
    defineField({ name: 'portrait', title: 'Portrait', type: 'figure' }),
    defineField({
      name: 'works',
      title: 'Works',
      type: 'array',
      of: [defineArrayMember({ type: 'artwork' })],
      options: { layout: 'grid' },
    }),
    defineField({
      name: 'isGuestOfHonour',
      title: 'Guest of honour',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({ name: 'website', title: 'Website', type: 'url' }),
    defineField({ name: 'instagram', title: 'Instagram handle', type: 'string' }),
    defineField({ name: 'seo', title: 'SEO', type: 'seo' }),
  ],
  orderings: [{ title: 'Name', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] }],
  preview: {
    select: {
      title: 'name',
      nationality: 'nationality',
      guest: 'isGuestOfHonour',
      media: 'portrait',
    },
    prepare: ({ title, nationality, guest, media }) => ({
      title,
      subtitle: [nationality, guest ? 'Guest of honour' : null].filter(Boolean).join(' · '),
      media,
    }),
  },
});
