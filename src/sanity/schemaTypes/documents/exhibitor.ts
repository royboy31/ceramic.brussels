import { defineArrayMember, defineField, defineType } from 'sanity';

/** A participating gallery. The heaviest content type on the site. */
export const exhibitor = defineType({
  name: 'exhibitor',
  title: 'Exhibitor',
  type: 'document',
  groups: [
    { name: 'main', title: 'Gallery', default: true },
    { name: 'media', title: 'Images' },
    { name: 'meta', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Gallery name',
      type: 'string',
      group: 'main',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'main',
      options: { source: 'name', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'edition',
      title: 'Edition',
      type: 'reference',
      group: 'main',
      to: [{ type: 'edition' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'booth',
      title: 'Booth',
      type: 'string',
      group: 'main',
      description: 'Stand number, e.g. B12',
    }),
    defineField({ name: 'country', title: 'Country', type: 'string', group: 'main' }),
    defineField({ name: 'city', title: 'City', type: 'string', group: 'main' }),
    defineField({ name: 'bio', title: 'About the gallery', type: 'localeBlock', group: 'main' }),
    defineField({ name: 'website', title: 'Website', type: 'url', group: 'main' }),
    defineField({
      name: 'instagram',
      title: 'Instagram handle',
      type: 'string',
      group: 'main',
      description: 'Without the @',
    }),
    defineField({
      name: 'artists',
      title: 'Represented artists',
      type: 'array',
      group: 'main',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'artist' }] })],
    }),
    defineField({
      name: 'images',
      title: 'Booth and artwork images',
      type: 'array',
      group: 'media',
      of: [defineArrayMember({ type: 'figure' })],
      options: { layout: 'grid' },
    }),
    defineField({ name: 'seo', title: 'SEO', type: 'seo', group: 'meta' }),
  ],
  orderings: [
    { title: 'Gallery name', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] },
    { title: 'Booth', name: 'boothAsc', by: [{ field: 'booth', direction: 'asc' }] },
  ],
  preview: {
    select: {
      title: 'name',
      booth: 'booth',
      country: 'country',
      year: 'edition.year',
      media: 'images.0',
    },
    prepare: ({ title, booth, country, year, media }) => ({
      title,
      subtitle: [booth, country, year].filter(Boolean).join(' · '),
      media,
    }),
  },
});
