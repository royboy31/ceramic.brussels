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
  // Editors reframe per usage instead of re-uploading the same asset. The
  // site crops around the hotspot wherever a slot has a fixed shape (the
  // laureates' 2:3, the cards' 3:4), so the dialog is the crop preview the
  // client asked for on 2026-09-22 - and "Preview" in the top bar shows the
  // page itself from the draft.
  options: { hotspot: true },
  description:
    'To choose how a picture is cropped, open its menu (⋯) → "Edit hotspot and crop": the site crops around the hotspot wherever the picture has a fixed shape. "Preview" in the top bar shows the page before you publish.',
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
