import { defineField, defineType } from 'sanity';
import { NEWS_CATEGORIES } from '../../../lib/options';

/** The blog. Announcements, recaps, press releases. */
export const newsItem = defineType({
  name: 'newsItem',
  title: 'News',
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
      title: 'Slug',
      type: 'slug',
      options: { source: 'title.en', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: { list: [...NEWS_CATEGORIES], layout: 'radio' },
      initialValue: 'announcement',
    }),
    defineField({
      name: 'edition',
      title: 'Edition',
      type: 'reference',
      to: [{ type: 'edition' }],
      // Read for press releases only: press & media → press sorts them by
      // edition (request #22). Hidden elsewhere; existing values stay.
      description: 'The edition this release is about. Without one, the first edition that ends after the release date.',
      hidden: ({ document }) => document?.category !== 'press-release',
    }),
    /**
     * A press release as the file it was sent out as (Félicie, 2026-10-01):
     * with a PDF attached, the "read in EN/FR/NL" pill on press & media →
     * press opens the file itself instead of the generated page, so nobody
     * has to retype the release's content. A language without a file keeps
     * the page link.
     */
    defineField({
      name: 'pdfs',
      title: 'PDF per language',
      type: 'object',
      description:
        'Attach the release as the PDF that was sent out. The "read in EN / FR / NL" buttons on press & media → press then open the file; a language without one links the page below instead.',
      hidden: ({ document }) => document?.category !== 'press-release',
      fields: [
        defineField({ name: 'en', title: 'English', type: 'file', options: { accept: 'application/pdf' } }),
        defineField({ name: 'fr', title: 'Français', type: 'file', options: { accept: 'application/pdf' } }),
        defineField({ name: 'nl', title: 'Nederlands', type: 'file', options: { accept: 'application/pdf' } }),
      ],
    }),
    defineField({ name: 'excerpt', title: 'Excerpt', type: 'localeText' }),
    defineField({ name: 'cover', title: 'Cover image', type: 'figure' }),
    defineField({ name: 'body', title: 'Body', type: 'localeBlock' }),
    defineField({ name: 'seo', title: 'SEO', type: 'seo' }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'publishedDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'title.en', date: 'publishedAt', category: 'category', media: 'cover' },
    prepare: ({ title, date, category, media }) => ({
      title: title ?? '(untitled)',
      subtitle: [date ? date.slice(0, 10) : null, category].filter(Boolean).join(' · '),
      media,
    }),
  },
});
