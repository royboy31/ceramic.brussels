import { defineArrayMember, defineField, defineType } from 'sanity';
// @sanity/icons 5 exposes each icon as its own subpath; the root exports only
// the generic <Icon symbol=… /> and the map.
import { BarChartIcon } from '@sanity/icons/BarChart';
import { BlockquoteIcon } from '@sanity/icons/Blockquote';
import { CodeBlockIcon } from '@sanity/icons/CodeBlock';
import { ComponentIcon } from '@sanity/icons/Component';
import { DocumentTextIcon } from '@sanity/icons/DocumentText';
import { HelpCircleIcon } from '@sanity/icons/HelpCircle';
import { ImageIcon } from '@sanity/icons/Image';
import { ImagesIcon } from '@sanity/icons/Images';
import { LinkIcon } from '@sanity/icons/Link';
import { PlayIcon } from '@sanity/icons/Play';
import { StackCompactIcon } from '@sanity/icons/StackCompact';
import { TextIcon } from '@sanity/icons/Text';
import { UsersIcon } from '@sanity/icons/Users';
import { PERSON_GROUPS } from '../documents/person';

/**
 * The page builder.
 *
 * A page is an ordered stack of sections. Each section type here is one
 * pre-designed block from the Figma - text over a rule, an image beside text,
 * a slideshow, a video, a quote, a banner - and an editor composes a page by
 * adding, removing, reordering and hiding them, the way Shopify's theme
 * editor works. The blocks are fixed in look; what they contain and the order
 * they come in is the editor's.
 *
 * Every type carries two housekeeping fields: `hidden`, so a section can be
 * taken off the site without deleting it (trying a layout, keeping last
 * year's block for next year), and `anchor`, so the menu can link straight
 * to it.
 *
 * Rendering lives in src/components/sections/. Adding a type means adding it
 * in three places: here, the SECTIONS projection in src/lib/queries.ts, and
 * PageSections.astro. `pageTemplate` documents hold ready-made stacks of
 * these that an editor can apply to any page.
 */

/* ---------- shared fields ---------- */

export const hiddenField = () =>
  defineField({
    name: 'hidden',
    title: 'Hide this section',
    type: 'boolean',
    initialValue: false,
    description:
      'Keeps the section on the page but leaves it off the site. Handy for trying layouts or parking last year’s block.',
  });

export const anchorField = () =>
  defineField({
    name: 'anchor',
    title: 'Anchor',
    type: 'string',
    description: 'Optional. Lets the menu link straight to this section, e.g. "team".',
  });

const headingField = (description?: string) =>
  defineField({ name: 'heading', title: 'Heading', type: 'localeString', description });

const linksField = () =>
  defineField({
    name: 'links',
    title: 'Links',
    type: 'array',
    of: [defineArrayMember({ type: 'link' })],
    description: 'Rendered as pill buttons.',
  });

/** Subtitle shown in the section list: the type, and whether it is hidden. */
export const sectionSubtitle = (kind: string, hidden?: boolean, extra?: string) =>
  [kind, extra, hidden ? '· hidden' : null].filter(Boolean).join(' ');

/* ---------- section types ---------- */

export const CONTENT_LAYOUTS = [
  { title: 'Full width, text in two columns', value: 'full' },
  { title: 'Full width, one column', value: 'single' },
  { title: 'Half width (sits beside the next half-width section)', value: 'half' },
] as const;

/**
 * Image beside text: the "hero + first paragraph" unit at the top of the
 * about page, or an interview portrait with its lead. The image takes two
 * thirds of the width and the text the last third.
 */
export const imageTextSection = defineType({
  name: 'imageTextSection',
  title: 'Image + text',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({ name: 'image', title: 'Image', type: 'figure' }),
    headingField(),
    defineField({ name: 'body', title: 'Text', type: 'localeBlock' }),
    linksField(),
    defineField({
      name: 'imageSide',
      title: 'Image side',
      type: 'string',
      options: {
        list: [
          { title: 'Left', value: 'left' },
          { title: 'Right', value: 'right' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      initialValue: 'left',
    }),
    anchorField(),
    hiddenField(),
  ],
  preview: {
    select: { heading: 'heading.en', media: 'image', hidden: 'hidden' },
    prepare: ({ heading, media, hidden }) => ({
      title: heading ?? '(image + text)',
      subtitle: sectionSubtitle('Image + text', hidden),
      media,
    }),
  },
});

/** A grid of images, two to four across, with optional captions. */
export const gallerySection = defineType({
  name: 'gallerySection',
  title: 'Image grid',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    headingField('Optional. Shown over a rule above the grid.'),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [defineArrayMember({ type: 'figure' })],
      options: { layout: 'grid' },
    }),
    defineField({
      name: 'columns',
      title: 'Images per row',
      type: 'number',
      options: {
        list: [
          { title: '2', value: 2 },
          { title: '3', value: 3 },
          { title: '4', value: 4 },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      initialValue: 3,
    }),
    defineField({
      name: 'captions',
      title: 'Show captions',
      type: 'boolean',
      initialValue: false,
      description: 'Artist, work title, year and credit from each image.',
    }),
    anchorField(),
    hiddenField(),
  ],
  preview: {
    select: { heading: 'heading.en', images: 'images', media: 'images.0', hidden: 'hidden' },
    prepare: ({ heading, images, media, hidden }) => ({
      title: heading ?? '(image grid)',
      subtitle: sectionSubtitle('Image grid', hidden, `· ${images?.length ?? 0} images`),
      media,
    }),
  },
});

/** The design's carousel: one frame, dots, counter and caption underneath. */
export const slideshowSection = defineType({
  name: 'slideshowSection',
  title: 'Slideshow',
  type: 'object',
  icon: StackCompactIcon,
  fields: [
    headingField('Optional.'),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [defineArrayMember({ type: 'figure' })],
      options: { layout: 'grid' },
    }),
    defineField({
      name: 'aspect',
      title: 'Frame',
      type: 'string',
      options: {
        list: [
          { title: 'Landscape 3:2', value: '3:2' },
          { title: 'Wide 16:9', value: '16:9' },
          { title: 'Portrait 4:5', value: '4:5' },
          { title: 'Square', value: '1:1' },
        ],
      },
      initialValue: '3:2',
    }),
    anchorField(),
    hiddenField(),
  ],
  preview: {
    select: { heading: 'heading.en', images: 'images', media: 'images.0', hidden: 'hidden' },
    prepare: ({ heading, images, media, hidden }) => ({
      title: heading ?? '(slideshow)',
      subtitle: sectionSubtitle('Slideshow', hidden, `· ${images?.length ?? 0} images`),
      media,
    }),
  },
});

/** A film, edge to edge. Leave the video empty to show the current edition's. */
export const videoSection = defineType({
  name: 'videoSection',
  title: 'Video',
  type: 'object',
  icon: PlayIcon,
  fields: [
    headingField('Optional.'),
    defineField({
      name: 'video',
      title: 'Video',
      type: 'video',
      description: 'YouTube or Vimeo. Leave the URL empty to show the current edition’s film.',
    }),
    anchorField(),
    hiddenField(),
  ],
  preview: {
    select: { heading: 'heading.en', title: 'video.title.en', url: 'video.url', media: 'video.poster', hidden: 'hidden' },
    prepare: ({ heading, title, url, media, hidden }) => ({
      title: heading ?? title ?? (url ? 'Video' : 'Video (current edition’s film)'),
      subtitle: sectionSubtitle('Video', hidden, url ? `· ${url}` : undefined),
      media,
    }),
  },
});

/** A pulled quote with who said it. */
export const quoteSection = defineType({
  name: 'quoteSection',
  title: 'Quote',
  type: 'object',
  icon: BlockquoteIcon,
  fields: [
    defineField({ name: 'quote', title: 'Quote', type: 'localeText', validation: (rule) => rule.required() }),
    defineField({
      name: 'attribution',
      title: 'Attribution',
      type: 'localeString',
      description: 'e.g. "Marion Verboom, guest of honour 2027".',
    }),
    anchorField(),
    hiddenField(),
  ],
  preview: {
    select: { quote: 'quote.en', attribution: 'attribution.en', hidden: 'hidden' },
    prepare: ({ quote, attribution, hidden }) => ({
      title: quote ? `“${quote.slice(0, 80)}${quote.length > 80 ? '…' : ''}”` : '(quote)',
      subtitle: sectionSubtitle('Quote', hidden, attribution ? `· ${attribution}` : undefined),
    }),
  },
});

export const BANNER_STYLES = [
  { title: 'Gradient (acid fade)', value: 'gradient' },
  { title: 'Solid acid', value: 'solid' },
  { title: 'Outline', value: 'outline' },
] as const;

/** The full-width call-to-action band: one line of text, one link. */
export const bannerSection = defineType({
  name: 'bannerSection',
  title: 'Banner',
  type: 'object',
  icon: ComponentIcon,
  fields: [
    defineField({ name: 'text', title: 'Text', type: 'localeString', validation: (rule) => rule.required() }),
    defineField({ name: 'link', title: 'Link', type: 'link' }),
    defineField({
      name: 'style',
      title: 'Style',
      type: 'string',
      options: { list: [...BANNER_STYLES], layout: 'radio' },
      initialValue: 'gradient',
    }),
    defineField({ name: 'image', title: 'Background image', type: 'figure', description: 'Optional. Text sits over it.' }),
    anchorField(),
    hiddenField(),
  ],
  preview: {
    select: { text: 'text.en', style: 'style', media: 'image', hidden: 'hidden' },
    prepare: ({ text, style, media, hidden }) => ({
      title: text ?? '(banner)',
      subtitle: sectionSubtitle('Banner', hidden, style ? `· ${style}` : undefined),
      media,
    }),
  },
});

/**
 * People cards, two across: a group from the People list (advisory board,
 * team, jury) or a hand-picked set.
 */
export const peopleSection = defineType({
  name: 'peopleSection',
  title: 'People',
  type: 'object',
  icon: UsersIcon,
  fields: [
    headingField('Optional. Shown over a full-width rule, like "collaborators".'),
    defineField({
      name: 'group',
      title: 'Group',
      type: 'string',
      options: { list: [...PERSON_GROUPS] },
      description: 'Everyone in this group, in their order. Leave empty to pick people by hand below.',
    }),
    defineField({
      name: 'people',
      title: 'People',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'person' }] })],
      hidden: ({ parent }) => !!parent?.group,
    }),
    anchorField(),
    hiddenField(),
  ],
  preview: {
    select: { heading: 'heading.en', group: 'group', people: 'people', hidden: 'hidden' },
    prepare: ({ heading, group, people, hidden }) => {
      const label = group
        ? (PERSON_GROUPS.find((g) => g.value === group)?.title ?? group)
        : `${people?.length ?? 0} picked`;
      return { title: heading ?? label, subtitle: sectionSubtitle('People', hidden, `· ${label}`) };
    },
  },
});

/** The key figures table from the current edition, with an image and a link. */
export const keyFiguresSection = defineType({
  name: 'keyFiguresSection',
  title: 'Key figures',
  type: 'object',
  icon: BarChartIcon,
  fields: [
    defineField({ name: 'image', title: 'Image next to the figures', type: 'figure' }),
    defineField({ name: 'link', title: 'Link under the figures', type: 'link' }),
    anchorField(),
    hiddenField(),
  ],
  preview: {
    select: { media: 'image', hidden: 'hidden' },
    prepare: ({ media, hidden }) => ({
      title: 'Key figures',
      subtitle: sectionSubtitle('From the current edition', hidden),
      media,
    }),
  },
});

/** A big lowercase title over a full-width rule, e.g. "institutions". */
export const headingSection = defineType({
  name: 'headingSection',
  title: 'Section title',
  type: 'object',
  icon: TextIcon,
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'localeString', validation: (rule) => rule.required() }),
    anchorField(),
    hiddenField(),
  ],
  preview: {
    select: { title: 'title.en', hidden: 'hidden' },
    prepare: ({ title, hidden }) => ({ title: title ?? '(section title)', subtitle: sectionSubtitle('Section title', hidden) }),
  },
});

/** Questions and answers, each answer folding open. */
export const faqSection = defineType({
  name: 'faqSection',
  title: 'FAQ',
  type: 'object',
  icon: HelpCircleIcon,
  fields: [
    headingField('Optional.'),
    defineField({
      name: 'items',
      title: 'Questions',
      type: 'array',
      of: [defineArrayMember({ type: 'faqItem' })],
    }),
    anchorField(),
    hiddenField(),
  ],
  preview: {
    select: { heading: 'heading.en', items: 'items', hidden: 'hidden' },
    prepare: ({ heading, items, hidden }) => ({
      title: heading ?? 'FAQ',
      subtitle: sectionSubtitle('FAQ', hidden, `· ${items?.length ?? 0} questions`),
    }),
  },
});

/** The latest news items as feature blocks, alternating text and picture. */
export const newsSection = defineType({
  name: 'newsSection',
  title: 'Latest news',
  type: 'object',
  icon: DocumentTextIcon,
  fields: [
    headingField('Optional. The centred title above the items, e.g. "latest news".'),
    defineField({
      name: 'count',
      title: 'How many',
      type: 'number',
      initialValue: 2,
      validation: (rule) => rule.min(1).max(6),
    }),
    anchorField(),
    hiddenField(),
  ],
  preview: {
    select: { heading: 'heading.en', count: 'count', hidden: 'hidden' },
    prepare: ({ heading, count, hidden }) => ({
      title: heading ?? 'Latest news',
      subtitle: sectionSubtitle('Latest news', hidden, `· ${count ?? 2} items`),
    }),
  },
});

/** A row of pill links on their own, e.g. "book your tickets ↗ · floor plan →". */
export const linksSection = defineType({
  name: 'linksSection',
  title: 'Buttons',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'links',
      title: 'Links',
      type: 'array',
      of: [defineArrayMember({ type: 'link' })],
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: 'variant',
      title: 'Style',
      type: 'string',
      options: {
        list: [
          { title: 'Outline pills', value: 'pill' },
          { title: 'Solid pills', value: 'solid' },
          { title: 'Text links', value: 'text' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      initialValue: 'pill',
    }),
    anchorField(),
    hiddenField(),
  ],
  preview: {
    select: { links: 'links', hidden: 'hidden' },
    prepare: ({ links, hidden }) => ({
      title:
        (links ?? [])
          .map((l: any) => l?.label?.en)
          .filter(Boolean)
          .join(' · ') || '(buttons)',
      subtitle: sectionSubtitle('Buttons', hidden),
    }),
  },
});

/** An embedded page - a map, a form, a ticket widget - in a frame. */
export const embedSection = defineType({
  name: 'embedSection',
  title: 'Embed',
  type: 'object',
  icon: CodeBlockIcon,
  fields: [
    headingField('Optional.'),
    defineField({
      name: 'url',
      title: 'Address to embed',
      type: 'url',
      validation: (rule) => rule.required().uri({ scheme: ['https'] }),
      description: 'The https address of the map, form or widget. Only the address - not an <iframe> tag.',
    }),
    defineField({
      name: 'height',
      title: 'Height (px)',
      type: 'number',
      initialValue: 600,
      validation: (rule) => rule.min(100).max(3000),
    }),
    anchorField(),
    hiddenField(),
  ],
  preview: {
    select: { heading: 'heading.en', url: 'url', hidden: 'hidden' },
    prepare: ({ heading, url, hidden }) => ({ title: heading ?? url ?? '(embed)', subtitle: sectionSubtitle('Embed', hidden) }),
  },
});

/* ---------- the field ---------- */

/** Every block a `page` or the homepage can hold. Order here is the order in the Add menu. */
export const PAGE_SECTION_TYPES = [
  'contentSection',
  'imageTextSection',
  'gallerySection',
  'slideshowSection',
  'videoSection',
  'quoteSection',
  'spotlight',
  'bannerSection',
  'linksSection',
  'headingSection',
  'peopleSection',
  'keyFiguresSection',
  'newsSection',
  'faqSection',
  'embedSection',
] as const;

/** The subset that makes sense inside an artist profile or a news item. */
export const ARTICLE_SECTION_TYPES = [
  'contentSection',
  'imageTextSection',
  'gallerySection',
  'slideshowSection',
  'videoSection',
  'quoteSection',
  'linksSection',
  'headingSection',
  'embedSection',
] as const;

export type SectionTypeName = (typeof PAGE_SECTION_TYPES)[number];

/**
 * The builder field itself. The insert menu opens as a grid of thumbnails
 * (public/section-previews/<type>.svg) so an editor picks a block by what it
 * looks like, not by name.
 */
export function sectionsField(
  overrides: {
    name?: string;
    title?: string;
    group?: string;
    description?: string;
    types?: readonly string[];
  } = {},
) {
  const { name = 'sections', title = 'Sections', group, description, types = PAGE_SECTION_TYPES } = overrides;
  const has = (t: string) => types.includes(t);
  const groups = [
    { name: 'text', title: 'Text', of: ['contentSection', 'imageTextSection', 'quoteSection', 'headingSection', 'faqSection'] },
    { name: 'media', title: 'Images & video', of: ['gallerySection', 'slideshowSection', 'videoSection', 'spotlight'] },
    { name: 'action', title: 'Links & banners', of: ['bannerSection', 'linksSection', 'embedSection'] },
    { name: 'lists', title: 'From other content', of: ['peopleSection', 'keyFiguresSection', 'newsSection'] },
  ]
    .map((g) => ({ ...g, of: g.of.filter(has) }))
    .filter((g) => g.of.length > 0);

  return defineField({
    name,
    title,
    type: 'array',
    group,
    description:
      description ??
      'The page, block by block. Add, remove and drag to reorder; hide a block to take it off the site without losing it.',
    of: types.map((type) => defineArrayMember({ type })),
    options: {
      insertMenu: {
        filter: true,
        groups,
        views: [
          { name: 'grid', previewImageUrl: (schemaTypeName: string) => `/section-previews/${schemaTypeName}.svg` },
          { name: 'list' },
        ],
      },
    },
  });
}

export const pageBuilderTypes = [
  imageTextSection,
  gallerySection,
  slideshowSection,
  videoSection,
  quoteSection,
  bannerSection,
  peopleSection,
  keyFiguresSection,
  headingSection,
  faqSection,
  newsSection,
  linksSection,
  embedSection,
];
