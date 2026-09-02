import { defineArrayMember, defineField, defineType } from 'sanity';

/**
 * Every organisation the fair works with, including the food & drinks
 * vendors - they have exactly the shape of a partner (name, link, text,
 * slideshow) and the design lists them under visitors info rather than
 * partners, which is just a matter of which tier the frontend asks for.
 *
 * Tiers mirror the tabs in the design and the groupings on the old site.
 */
export const PARTNER_TIERS = [
  { title: 'Main partner', value: 'main' },
  { title: 'Institution', value: 'institutional' },
  { title: 'Hotel', value: 'hotel' },
  { title: 'Event partner', value: 'event' },
  { title: 'Media', value: 'media' },
  { title: 'Exhibition pass', value: 'exhibition-pass' },
  { title: 'Art prize partner', value: 'art-prize' },
  { title: 'Food & drinks', value: 'food-drinks' },
  { title: 'Supplier', value: 'supplier' },
] as const;

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
      options: { list: [...PARTNER_TIERS], layout: 'radio' },
      initialValue: 'institutional',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle',
      type: 'localeString',
      description: 'Small line under the name: "by Traiteur Benjamin", "Belgian craft beers".',
    }),
    defineField({
      name: 'editions',
      title: 'Editions',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'edition' }] })],
      description: 'Years this partner took part. Leave empty for a permanent partner.',
    }),
    defineField({ name: 'logo', title: 'Logo', type: 'figure' }),
    defineField({
      name: 'images',
      title: 'Slideshow',
      type: 'array',
      of: [defineArrayMember({ type: 'figure' })],
      options: { layout: 'grid' },
      description: 'Photos, for partners that get a full entry (hotel, vendors).',
    }),
    defineField({ name: 'description', title: 'Description', type: 'localeBlock' }),
    defineField({
      name: 'currentExhibition',
      title: 'Current exhibition',
      type: 'localeString',
      description: 'Exhibition-pass institutions: what the pass gives access to, with dates.',
      hidden: ({ document }) => document?.tier !== 'exhibition-pass',
    }),
    defineField({ name: 'url', title: 'Website', type: 'url' }),
    defineField({ name: 'instagram', title: 'Instagram handle', type: 'string', description: 'Without the @' }),
    defineField({ name: 'order', title: 'Sort order', type: 'number', initialValue: 100 }),
  ],
  orderings: [{ title: 'Sort order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
  preview: {
    select: { title: 'name', tier: 'tier', media: 'logo', photo: 'images.0' },
    prepare: ({ title, tier, media, photo }) => ({
      title,
      subtitle: PARTNER_TIERS.find((t) => t.value === tier)?.title ?? tier,
      media: media ?? photo,
    }),
  },
});
