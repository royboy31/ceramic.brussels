import { defineField, defineType } from 'sanity';

export const partner = defineType({
  name: 'partner',
  title: 'Partner',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'tier',
      title: 'Tier',
      type: 'string',
      options: {
        list: [
          { title: 'Main partner', value: 'main' },
          { title: 'Institutional', value: 'institutional' },
          { title: 'Media', value: 'media' },
          { title: 'Supplier', value: 'supplier' },
        ],
        layout: 'radio',
      },
      initialValue: 'institutional',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'logo', title: 'Logo', type: 'figure' }),
    defineField({ name: 'url', title: 'Website', type: 'url' }),
    defineField({ name: 'description', title: 'Description', type: 'localeText' }),
    defineField({ name: 'order', title: 'Sort order', type: 'number', initialValue: 100 }),
  ],
  orderings: [{ title: 'Sort order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
  preview: {
    select: { title: 'name', subtitle: 'tier', media: 'logo' },
  },
});
