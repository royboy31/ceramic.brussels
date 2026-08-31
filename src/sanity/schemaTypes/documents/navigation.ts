import { defineArrayMember, defineField, defineType } from 'sanity';

/**
 * Singleton. The main menu, in editor-controlled order.
 *
 * If this document has no items the site falls back to a sensible default menu,
 * so an empty or half-finished navigation can never leave the site unusable.
 */
export const navigation = defineType({
  name: 'navigation',
  title: 'Navigation',
  type: 'document',
  fields: [
    defineField({
      name: 'items',
      title: 'Main menu',
      type: 'array',
      of: [defineArrayMember({ type: 'navItem' })],
      description: 'Drag to reorder. This is the order visitors see.',
    }),
    defineField({
      name: 'footerItems',
      title: 'Footer links',
      type: 'array',
      of: [defineArrayMember({ type: 'navItem' })],
    }),
  ],
  preview: {
    select: { items: 'items' },
    prepare: ({ items }) => ({
      title: 'Navigation',
      subtitle: `${items?.length ?? 0} menu items`,
    }),
  },
});
