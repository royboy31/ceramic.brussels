import { defineArrayMember, defineField, defineType } from 'sanity';
import { BlockContentIcon } from '@sanity/icons/BlockContent';
import { SparklesIcon } from '@sanity/icons/Sparkles';
import { CONTENT_LAYOUTS, anchorField, hiddenField, sectionSubtitle } from './pageBuilder';

/**
 * A titled block of rich text with an optional image row - the "heading + rule
 * + text" unit the design repeats on every page ("biography", "the prize",
 * "goals", "hotel deal"). The workhorse of the page builder; the other blocks
 * live in pageBuilder.ts.
 *
 * `layout` is the editor's answer to "one column or two": full width with the
 * copy flowing in two columns, full width in one, or half width so that two
 * consecutive half sections sit side by side, as "goals" and "development"
 * do on the about page.
 */
export const contentSection = defineType({
  name: 'contentSection',
  title: 'Text',
  type: 'object',
  icon: BlockContentIcon,
  fields: [
    defineField({ name: 'heading', title: 'Heading', type: 'localeString' }),
    defineField({ name: 'body', title: 'Text', type: 'localeBlock' }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [defineArrayMember({ type: 'figure' })],
      options: { layout: 'grid' },
      description: 'Optional row of up to three images under the text.',
    }),
    defineField({
      name: 'links',
      title: 'Links',
      type: 'array',
      of: [defineArrayMember({ type: 'link' })],
      description: 'Rendered as pill buttons under the text.',
    }),
    defineField({
      name: 'layout',
      title: 'Layout',
      type: 'string',
      options: { list: [...CONTENT_LAYOUTS], layout: 'radio' },
      initialValue: 'full',
    }),
    anchorField(),
    hiddenField(),
  ],
  preview: {
    select: { heading: 'heading.en', layout: 'layout', anchor: 'anchor', media: 'images.0', hidden: 'hidden' },
    prepare: ({ heading, layout, anchor, media, hidden }) => ({
      title: heading ?? '(untitled text)',
      subtitle: sectionSubtitle(
        'Text',
        hidden,
        [layout && layout !== 'full' ? `· ${layout}` : null, anchor ? `· #${anchor}` : null].filter(Boolean).join(' '),
      ),
      media,
    }),
  },
});

/**
 * A feature block: kicker + headline + link + image, text on one side and
 * the picture on the other. The homepage uses a run of them for "latest news"
 * and "partner spotlight"; consecutive ones alternate sides.
 */
export const spotlight = defineType({
  name: 'spotlight',
  title: 'Feature',
  type: 'object',
  icon: SparklesIcon,
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
    anchorField(),
    hiddenField(),
  ],
  preview: {
    select: { kicker: 'kicker.en', headline: 'headline.en', media: 'image', hidden: 'hidden' },
    prepare: ({ kicker, headline, media, hidden }) => ({
      title: headline ?? '(no headline)',
      subtitle: sectionSubtitle('Feature', hidden, kicker ? `· ${kicker}` : undefined),
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
