import { defineArrayMember, defineField, defineType } from 'sanity';
import { PAGE_SECTIONS } from '../objects/routes';
import { sectionsField } from '../objects/pageBuilder';
import { pageHides } from '../../pageKinds';

/**
 * Editorial pages. Three roles:
 *
 * - A tab inside a hub. The design gives every hub (about, art prize,
 *   programme, visitors info, partners) a row of pill tabs under its title:
 *   "the fair / advisory board / team / press / images". The tabs themselves
 *   are fixed in code (src/lib/hubs.ts); a page whose `section` and English
 *   slug name one of them carries that tab's text.
 * - The main page of a listing (exhibitors, artists, news, contact): its lead,
 *   blocks and SEO wrap the list the route generates.
 * - A standalone page (no `section`): gallery applications, legal pages.
 *
 * Each route reads a different part of the document, so every field below is
 * hidden on the pages that do not read it - see ../../pageKinds.ts. Hub and
 * slug are read-only once set: they are what ties a document to its URL.
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
      description:
        'The page’s name in the Studio and the browser tab. On a hub tab it is also the pill label when Tab label is empty; on a standalone page it is the heading.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slugs',
      type: 'localeSlug',
      group: 'placement',
      description: 'The URL segment in each language, without slashes.',
      hidden: pageHides('slug'),
    }),
    defineField({
      name: 'section',
      title: 'Hub',
      type: 'string',
      group: 'placement',
      options: { list: [...PAGE_SECTIONS] },
      description: 'The part of the site this page belongs to. Set when the page is made; it cannot be moved.',
      hidden: pageHides('section'),
      readOnly: ({ document }) => !!document?.section,
    }),
    defineField({
      name: 'tabLabel',
      title: 'Tab label',
      type: 'localeString',
      group: 'placement',
      description: 'Text on the pill tab. Falls back to the title.',
      hidden: pageHides('tabLabel'),
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      group: 'placement',
      initialValue: 100,
      description: 'Position in the menu when the menu has no items of its own. Lower comes first.',
      hidden: pageHides('order'),
    }),
    defineField({
      name: 'navLabel',
      title: 'Navigation label',
      type: 'localeString',
      group: 'placement',
      description: 'Shown in the fallback menu, used only while Navigation has no items. Leave empty to keep it out.',
      hidden: pageHides('navLabel'),
    }),
    defineField({
      name: 'intro',
      title: 'Lead paragraph',
      type: 'localeText',
      group: 'main',
      description: 'The large text at the top of the page.',
      hidden: pageHides('intro'),
    }),
    defineField({
      name: 'cover',
      title: 'Cover image',
      type: 'figure',
      group: 'main',
      description: 'The large picture at the top of the page.',
      hidden: pageHides('cover'),
    }),
    sectionsField({ group: 'main', hidden: pageHides('sections') }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'localeBlock',
      group: 'main',
      description: 'Plain rich text, after the blocks.',
      hidden: pageHides('body'),
    }),
    defineField({
      name: 'images',
      title: 'Closing images',
      type: 'array',
      group: 'main',
      of: [defineArrayMember({ type: 'figure' })],
      options: { layout: 'grid' },
      description: 'The row of photos at the bottom of the page.',
      hidden: pageHides('images'),
    }),
    defineField({ name: 'seo', title: 'SEO', type: 'seo', group: 'meta', hidden: pageHides('seo') }),
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
