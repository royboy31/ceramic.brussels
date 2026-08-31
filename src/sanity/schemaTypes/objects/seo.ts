import { defineField, defineType } from 'sanity';

export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({
      name: 'title',
      title: 'Meta title',
      type: 'localeString',
      description: 'Falls back to the document title when empty.',
    }),
    defineField({
      name: 'description',
      title: 'Meta description',
      type: 'localeText',
    }),
    defineField({ name: 'ogImage', title: 'Social share image', type: 'figure' }),
    defineField({
      name: 'noIndex',
      title: 'Hide from search engines',
      type: 'boolean',
      initialValue: false,
    }),
  ],
});
