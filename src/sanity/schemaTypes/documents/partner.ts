import { defineArrayMember, defineField, defineType } from 'sanity';
import { PARTNER_TIERS } from '../../../lib/options';

/**
 * Every organisation the fair works with, including the food & drinks
 * vendors - they have exactly the shape of a partner (name, link, text,
 * slideshow) and the design lists them under visitors info rather than
 * partners, which is just a matter of which tier the frontend asks for.
 *
 * Tiers mirror the tabs in the design and the groupings on the old site.
 */
/** Re-exported so the schemas stay the obvious place to look for them. */
export { PARTNER_TIERS } from '../../../lib/options';

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
    // Subtitle, current exhibition and instagram are kept for the imported data
    // but hidden: no page in the design shows them.
    defineField({
      name: 'subtitle',
      title: 'Subtitle',
      type: 'localeString',
      hidden: true,
    }),
    defineField({
      name: 'editions',
      title: 'Editions',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'edition' }] })],
      description: 'Years this partner took part. Leave empty for a permanent partner.',
    }),
    defineField({ name: 'logo', title: 'Logo', type: 'figure' }),
    // The header's lockup beside "main partner" is a wide, 29px-high mark
    // (Puilaetco's is its emblem, name and tagline as one) and nothing like
    // the square-ish logo the partners tab shows, so it is its own file.
    // Only the main partner is drawn there; without one the shipped
    // Puilaetco artwork stays (Header.astro).
    defineField({
      name: 'headerLockup',
      title: 'Header lockup',
      type: 'figure',
      description:
        'The mark shown beside "main partner" in the site header: one wide file, about 6:1, transparent background, SVG or PNG. Not the logo above - that is for the partners page.',
      hidden: ({ parent }) => parent?.tier !== 'main',
    }),
    // The logos arrive at every shape and with whitespace baked in, so a row
    // of them reads unevenly however the page normalises it (request #11).
    // The page sizes the slot from the file's own aspect ratio and then
    // multiplies by this, so the editor's correction is the last word. A
    // percentage rather than a list of sizes: the corrections are small and
    // particular, and a number needs no entry in stegaFilter's PLAIN_KEYS.
    defineField({
      name: 'logoScale',
      title: 'Logo size (%)',
      type: 'number',
      initialValue: 100,
      description: 'Nudges this logo against the others: 100 is the size the page works out for it, 80 smaller, 130 larger.',
      validation: (rule) => rule.min(50).max(150),
    }),
    defineField({
      name: 'images',
      title: 'Slideshow',
      type: 'array',
      of: [defineArrayMember({ type: 'figure' })],
      options: { layout: 'grid' },
      description: 'Photos for the partners that get a full entry - the hotel and food & drinks - shown as a slideshow.',
    }),
    defineField({ name: 'description', title: 'Description', type: 'localeBlock' }),
    defineField({
      name: 'currentExhibition',
      title: 'Current exhibition',
      type: 'localeString',
      hidden: true,
    }),
    defineField({ name: 'url', title: 'Website', type: 'url' }),
    defineField({ name: 'instagram', title: 'Instagram handle', type: 'string', hidden: true }),
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
