import { defineArrayMember, defineField, defineType } from 'sanity';

/**
 * A titled block of rich text with an optional image row - the "heading + rule
 * + text" unit the design repeats on every page ("biography", "the prize",
 * "goals", "hotel deal"). Pages and artist features are built from a list of
 * these in editor-controlled order.
 */
export const contentSection = defineType({
  name: 'contentSection',
  title: 'Section',
  type: 'object',
  fields: [
    defineField({ name: 'heading', title: 'Heading', type: 'localeString' }),
    defineField({
      name: 'anchor',
      title: 'Anchor',
      type: 'string',
      description: 'Optional. Lets the menu link straight to this section, e.g. "team".',
    }),
    defineField({ name: 'body', title: 'Text', type: 'localeBlock' }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [defineArrayMember({ type: 'figure' })],
      options: { layout: 'grid' },
    }),
    defineField({
      name: 'links',
      title: 'Links',
      type: 'array',
      of: [defineArrayMember({ type: 'link' })],
      description: 'Rendered as pill buttons under the text.',
    }),
  ],
  preview: {
    select: { heading: 'heading.en', anchor: 'anchor', media: 'images.0' },
    prepare: ({ heading, anchor, media }) => ({
      title: heading ?? '(untitled section)',
      subtitle: anchor ? `#${anchor}` : undefined,
      media,
    }),
  },
});

/**
 * A curated homepage block: kicker + headline + link + image. The design uses
 * it for "latest news", "partner spotlight" and similar editor-picked items.
 */
export const spotlight = defineType({
  name: 'spotlight',
  title: 'Spotlight',
  type: 'object',
  fields: [
    defineField({
      name: 'kicker',
      title: 'Kicker',
      type: 'localeString',
      description: 'Small uppercase label above the headline, e.g. "guest of honour".',
    }),
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'localeText',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'link', title: 'Link', type: 'link' }),
    defineField({ name: 'image', title: 'Image', type: 'figure' }),
  ],
  preview: {
    select: { kicker: 'kicker.en', headline: 'headline.en', media: 'image' },
    prepare: ({ kicker, headline, media }) => ({
      title: headline ?? '(no headline)',
      subtitle: kicker,
      media,
    }),
  },
});

/** A video embed with its poster frame. YouTube or Vimeo URL. */
export const video = defineType({
  name: 'video',
  title: 'Video',
  type: 'object',
  fields: [
    defineField({ name: 'url', title: 'Video URL', type: 'url' }),
    defineField({ name: 'poster', title: 'Poster image', type: 'figure' }),
    defineField({ name: 'title', title: 'Title', type: 'localeString' }),
  ],
  preview: {
    select: { title: 'title.en', url: 'url', media: 'poster' },
    prepare: ({ title, url, media }) => ({ title: title ?? url ?? 'Video', subtitle: url, media }),
  },
});
