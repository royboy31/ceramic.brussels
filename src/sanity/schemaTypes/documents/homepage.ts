import { defineArrayMember, defineField, defineType } from 'sanity';

/**
 * Singleton. The homepage is entirely curated in the design - nothing on it
 * is a list pulled from elsewhere - so every block is a field here. The key
 * figures come from the current edition and are not repeated.
 */
export const homepage = defineType({
  name: 'homepage',
  title: 'Homepage',
  type: 'document',
  groups: [
    { name: 'hero', title: 'Hero', default: true },
    { name: 'blocks', title: 'Blocks' },
    { name: 'meta', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'heroImage',
      title: 'Hero image',
      type: 'figure',
      group: 'hero',
    }),
    defineField({
      name: 'heroText',
      title: 'Hero text',
      type: 'localeText',
      group: 'hero',
      description: 'The large statement: "the first international contemporary art fair dedicated to ceramics".',
    }),
    defineField({ name: 'heroLink', title: 'Hero link', type: 'link', group: 'hero' }),
    defineField({
      name: 'quickLinks',
      title: 'Quick links',
      type: 'array',
      group: 'hero',
      of: [defineArrayMember({ type: 'link' })],
      validation: (rule) => rule.max(4),
      description: 'The row of yellow buttons under the hero. The last one is styled as the call to action.',
    }),

    defineField({
      name: 'spotlights',
      title: 'Spotlights',
      type: 'array',
      group: 'blocks',
      of: [defineArrayMember({ type: 'spotlight' })],
      description: 'The "latest news" and "partner spotlight" items, in order.',
    }),
    defineField({
      name: 'banner',
      title: 'Announcement banner',
      type: 'object',
      group: 'blocks',
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({ name: 'text', title: 'Text', type: 'localeString' }),
        defineField({ name: 'link', title: 'Link', type: 'link' }),
        defineField({ name: 'image', title: 'Background image', type: 'figure' }),
      ],
    }),
    defineField({
      name: 'video',
      title: 'Video',
      type: 'video',
      group: 'blocks',
      description: 'Leave empty to use the current edition’s film.',
    }),
    defineField({
      name: 'figuresImage',
      title: 'Image next to the key figures',
      type: 'figure',
      group: 'blocks',
    }),
    defineField({ name: 'figuresLink', title: 'Link under the key figures', type: 'link', group: 'blocks' }),
    defineField({
      name: 'closingBanner',
      title: 'Closing banner',
      type: 'object',
      group: 'blocks',
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({ name: 'text', title: 'Text', type: 'localeString' }),
        defineField({ name: 'link', title: 'Link', type: 'link' }),
      ],
    }),
    defineField({ name: 'seo', title: 'SEO', type: 'seo', group: 'meta' }),
  ],
  preview: {
    prepare: () => ({ title: 'Homepage' }),
  },
});
