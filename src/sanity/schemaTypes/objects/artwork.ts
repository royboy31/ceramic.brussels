import { defineField, defineType } from 'sanity';

/** Embedded in an artist rather than standalone - works are rarely addressed alone. */
export const artwork = defineType({
  name: 'artwork',
  title: 'Work',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'year', title: 'Year', type: 'number' }),
    defineField({ name: 'materials', title: 'Materials', type: 'localeString' }),
    defineField({
      name: 'dimensions',
      title: 'Dimensions (cm)',
      type: 'object',
      options: { columns: 3 },
      fields: [
        defineField({ name: 'height', title: 'H', type: 'number' }),
        defineField({ name: 'width', title: 'W', type: 'number' }),
        defineField({ name: 'depth', title: 'D', type: 'number' }),
      ],
    }),
    defineField({ name: 'image', title: 'Image', type: 'figure' }),
  ],
  preview: {
    select: { title: 'title', year: 'year', media: 'image' },
    prepare: ({ title, year, media }) => ({
      title,
      subtitle: year ? String(year) : undefined,
      media,
    }),
  },
});
