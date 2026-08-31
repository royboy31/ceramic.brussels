import { defineField, defineType } from 'sanity';

/**
 * Free-form editorial pages: about, art prize, food & drinks, visitor info,
 * partners intro, past editions. Editors add these without a deploy.
 *
 * Slugs are per-locale so French and Dutch get real translated URLs rather
 * than the half-translated mix the current site carries.
 */
export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'localeString',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slugs',
      type: 'localeSlug',
      description: 'The URL segment in each language, without slashes.',
    }),
    defineField({
      name: 'navLabel',
      title: 'Navigation label',
      type: 'localeString',
      description: 'Shown in the main menu. Leave empty to keep this page out of the menu.',
    }),
    defineField({
      name: 'navOrder',
      title: 'Menu order',
      type: 'number',
      initialValue: 100,
    }),
    defineField({ name: 'intro', title: 'Introduction', type: 'localeText' }),
    defineField({ name: 'cover', title: 'Cover image', type: 'figure' }),
    defineField({ name: 'body', title: 'Body', type: 'localeBlock' }),
    defineField({ name: 'seo', title: 'SEO', type: 'seo' }),
  ],
  orderings: [{ title: 'Menu order', name: 'navOrder', by: [{ field: 'navOrder', direction: 'asc' }] }],
  preview: {
    select: {
      title: 'title.en',
      slugEn: 'slug.en.current',
      slugFr: 'slug.fr.current',
      slugNl: 'slug.nl.current',
      bodyEn: 'body.en',
      bodyFr: 'body.fr',
      bodyNl: 'body.nl',
      media: 'cover',
    },
    prepare: ({ title, slugEn, slugFr, slugNl, bodyEn, bodyFr, bodyNl, media }) => {
      // Surface translation gaps in the list, so an editor sees what still needs
      // doing without opening every page.
      const done = [
        slugEn && bodyEn?.length ? 'EN' : null,
        slugFr && bodyFr?.length ? 'FR' : null,
        slugNl && bodyNl?.length ? 'NL' : null,
      ].filter(Boolean);
      const missing = ['EN', 'FR', 'NL'].filter((l) => !done.includes(l));

      return {
        title: title ?? '(untitled)',
        subtitle: [
          slugEn ? `/en/${slugEn}` : 'no slug',
          missing.length ? `missing ${missing.join(', ')}` : 'all languages',
        ].join('  ·  '),
        media,
      };
    },
  },
});
