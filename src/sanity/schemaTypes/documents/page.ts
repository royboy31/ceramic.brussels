import { defineArrayMember, defineField, defineType } from 'sanity';
import { PAGE_SECTIONS } from '../objects/routes';

/**
 * Editorial pages. Two roles:
 *
 * - A tab inside a hub. The design gives every hub (about, art prize,
 *   programme, visitors info, partners) a row of pill tabs under its title:
 *   "the fair / advisory board / team / press / images". A page with a
 *   `section` becomes one of those tabs, ordered by `order`.
 * - A standalone page (no `section`): gallery applications, legal pages.
 *
 * Content is a lead paragraph followed by titled sections and a closing image
 * row, which is how every text page in the design is built.
 *
 * Slugs are per-locale so French and Dutch get real translated URLs rather
 * than the half-translated mix the current site carries.
 */
export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  groups: [
    { name: 'main', title: 'Content', default: true },
    { name: 'placement', title: 'Placement' },
    { name: 'meta', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'localeString',
      group: 'main',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slugs',
      type: 'localeSlug',
      group: 'placement',
      description: 'The URL segment in each language, without slashes.',
    }),
    defineField({
      name: 'section',
      title: 'Hub',
      type: 'string',
      group: 'placement',
      options: { list: [...PAGE_SECTIONS] },
      description: 'Makes this page a tab of that hub. Leave empty for a standalone page.',
    }),
    defineField({
      name: 'tabLabel',
      title: 'Tab label',
      type: 'localeString',
      group: 'placement',
      description: 'Text on the pill tab. Falls back to the title.',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      group: 'placement',
      initialValue: 100,
      description: 'Position among the hub’s tabs, or in the menu. Lower comes first.',
    }),
    defineField({
      name: 'navLabel',
      title: 'Navigation label',
      type: 'localeString',
      group: 'placement',
      description: 'Only for standalone pages: shown in the fallback menu. Leave empty to keep it out.',
    }),
    defineField({
      name: 'intro',
      title: 'Lead paragraph',
      type: 'localeText',
      group: 'main',
      description: 'The large text at the top of the page.',
    }),
    defineField({ name: 'cover', title: 'Cover image', type: 'figure', group: 'main' }),
    defineField({
      name: 'sections',
      title: 'Sections',
      type: 'array',
      group: 'main',
      of: [defineArrayMember({ type: 'contentSection' })],
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'localeBlock',
      group: 'main',
      description: 'Plain rich text, for pages that do not need titled sections.',
    }),
    defineField({
      name: 'images',
      title: 'Closing images',
      type: 'array',
      group: 'main',
      of: [defineArrayMember({ type: 'figure' })],
      options: { layout: 'grid' },
      description: 'The row of three photos at the bottom of the page.',
    }),
    defineField({ name: 'seo', title: 'SEO', type: 'seo', group: 'meta' }),
  ],
  orderings: [{ title: 'Order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
  preview: {
    select: {
      title: 'title.en',
      section: 'section',
      slugEn: 'slug.en.current',
      slugFr: 'slug.fr.current',
      slugNl: 'slug.nl.current',
      introEn: 'intro.en',
      introFr: 'intro.fr',
      introNl: 'intro.nl',
      media: 'cover',
    },
    prepare: ({ title, section, slugEn, slugFr, slugNl, introEn, introFr, introNl, media }) => {
      // Surface translation gaps in the list, so an editor sees what still needs
      // doing without opening every page.
      const done = [
        slugEn && introEn ? 'EN' : null,
        slugFr && introFr ? 'FR' : null,
        slugNl && introNl ? 'NL' : null,
      ].filter(Boolean);
      const missing = ['EN', 'FR', 'NL'].filter((l) => !done.includes(l));

      return {
        title: title ?? '(untitled)',
        subtitle: [
          section ? `${section} tab` : slugEn ? `/en/${slugEn}` : 'no slug',
          missing.length ? `missing ${missing.join(', ')}` : 'all languages',
        ].join('  ·  '),
        media,
      };
    },
  },
});
