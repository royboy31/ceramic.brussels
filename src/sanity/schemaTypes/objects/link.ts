import { defineField, defineType } from 'sanity';

export const link = defineType({
  name: 'link',
  title: 'Link',
  type: 'object',
  fields: [
    defineField({ name: 'label', title: 'Label', type: 'localeString' }),
    defineField({
      name: 'internal',
      title: 'Internal page',
      type: 'reference',
      to: [{ type: 'page' }, { type: 'exhibitor' }, { type: 'artist' }, { type: 'newsItem' }],
    }),
    defineField({
      name: 'external',
      title: 'External URL',
      type: 'url',
      description: 'Used only when no internal page is set.',
    }),
  ],
});
