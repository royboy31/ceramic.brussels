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
