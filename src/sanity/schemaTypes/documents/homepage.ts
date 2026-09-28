import { defineArrayMember, defineField, defineType } from 'sanity';
import { sectionsField } from '../objects/pageBuilder';

/**
 * Singleton. The hero is fixed - the big picture, the statement, the row of
 * yellow quick links - because the design gives the homepage exactly one
 * opening. Everything under it is a section stack like any other page, so
 * editors can put the film before the news, drop the banner for a month, or
 * add a feature block, without asking for a new template.
 *
 * The key figures come from the current edition and are not repeated here;
 * a "Key figures" section pulls them in.
 */
export const homepage = defineType({
  name: 'homepage',
  title: 'Homepage',
  type: 'document',
  groups: [
    { name: 'hero', title: 'Hero', default: true },
    { name: 'blocks', title: 'Sections' },
    { name: 'meta', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'heroImage',
      title: 'Hero image',
      type: 'figure',
      group: 'hero',
    }),
    // The hero as a slideshow that moves by itself (client feedback,
    // 2026-09-16: "a slideshow of 5 images … slide automatically"). Added
    // beside heroImage rather than replacing it, so nothing needs migrating.
    defineField({
      name: 'heroImages',
      title: 'More hero pictures',
      type: 'array',
      of: [defineArrayMember({ type: 'figure' })],
      options: { layout: 'grid' },
      group: 'hero',
      description:
        'Optional. Pictures to show after the Hero image: the hero then becomes a slideshow that moves on by itself (the design has five in all). Leave empty for a single picture.',
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

    sectionsField({
      group: 'blocks',
      description:
        'Everything under the hero, in order: features, banners, the film, key figures, latest news. Drag to reorder; hide a block to take it off the site without losing it.',
    }),

    defineField({ name: 'seo', title: 'SEO', type: 'seo', group: 'meta' }),
  ],
  preview: {
    prepare: () => ({ title: 'Homepage' }),
  },
});
