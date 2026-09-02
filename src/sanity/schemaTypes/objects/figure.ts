import { defineField, defineType } from 'sanity';

/**
 * Every image on the site. The design renders captions as
 * "Artist, *Work title*, 2024" under slideshows, so the three parts are kept
 * separate and the frontend assembles them - an editor never has to type the
 * italics. `credit` is the photographer ("Photo © Nicolas Brasseur").
 */
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
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description: 'Usually the artist’s name. Shown under the image.',
    }),
    defineField({
      name: 'workTitle',
      title: 'Work title',
      type: 'string',
      description: 'Rendered in italics after the caption.',
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'string',
      description: 'e.g. 2024 or 2022-23',
    }),
    defineField({ name: 'credit', title: 'Photo credit', type: 'string' }),
  ],
});
