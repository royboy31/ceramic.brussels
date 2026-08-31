import { defineField, defineType } from 'sanity';

export const figure = defineType({
  name: 'figure',
  title: 'Image',
  type: 'image',
  // Editors reframe per usage instead of re-uploading the same asset.
  options: { hotspot: true },
  fields: [
    defineField({
      name: 'alt',
      title: 'Alt text',
      type: 'string',
      description: 'Describe the image for screen readers and search engines.',
      validation: (rule) => rule.required().warning('Every image needs alt text.'),
    }),
    defineField({ name: 'credit', title: 'Photo credit', type: 'string' }),
  ],
});
