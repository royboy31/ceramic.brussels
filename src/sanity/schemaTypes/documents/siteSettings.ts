import { defineArrayMember, defineField, defineType } from 'sanity';

/**
 * Singleton. Pinned at the top of the Studio - never listed, never duplicated.
 *
 * Holds what is true of the site regardless of edition: identity, contact and
 * social links, the venue and how to reach it, the FAQ, press contacts. What
 * changes per year (dates, hours, tickets, figures) lives on `edition`.
 */
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  groups: [
    { name: 'identity', title: 'Identity', default: true },
    { name: 'contact', title: 'Contact & social' },
    { name: 'venue', title: 'Venue & access' },
    { name: 'faq', title: 'FAQ' },
    { name: 'press', title: 'Press' },
  ],
  fields: [
    defineField({
      name: 'siteName',
      title: 'Site name',
      type: 'string',
      group: 'identity',
      initialValue: 'ceramic brussels',
    }),
    defineField({ name: 'tagline', title: 'Tagline', type: 'localeString', group: 'identity' }),
    defineField({
      name: 'copyright',
      title: 'Copyright line',
      type: 'string',
      group: 'identity',
      description: 'Footer text, e.g. "© ceramic brussels, 2026". Leave empty for an automatic year.',
    }),
    defineField({ name: 'defaultSeo', title: 'Default SEO', type: 'seo', group: 'identity' }),

    defineField({ name: 'contactEmail', title: 'Contact email', type: 'string', group: 'contact' }),
    defineField({ name: 'newsletterUrl', title: 'Newsletter signup URL', type: 'url', group: 'contact' }),
    defineField({ name: 'instagramUrl', title: 'Instagram URL', type: 'url', group: 'contact' }),
    defineField({ name: 'linkedinUrl', title: 'LinkedIn URL', type: 'url', group: 'contact' }),
    defineField({ name: 'facebookUrl', title: 'Facebook URL', type: 'url', group: 'contact' }),
    defineField({ name: 'youtubeUrl', title: 'YouTube URL', type: 'url', group: 'contact' }),
    defineField({
      name: 'applicationsUrl',
      title: 'Gallery applications URL',
      type: 'url',
      group: 'contact',
      description: 'Where the "gallery applications are open" banner sends people.',
    }),

    defineField({
      name: 'practicalInfo',
      title: 'Venue and access',
      type: 'object',
      group: 'venue',
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: 'venueName',
          title: 'Venue',
          type: 'string',
          description: 'e.g. "Tour & Taxis — Sheds 1 & 2bis"',
        }),
        defineField({ name: 'address', title: 'Address', type: 'text', rows: 3 }),
        defineField({ name: 'mapUrl', title: 'Map link', type: 'url' }),
        defineField({ name: 'intro', title: 'Lead paragraph', type: 'localeText' }),
        defineField({ name: 'heroImage', title: 'Image', type: 'figure' }),
        defineField({
          name: 'access',
          title: 'Getting there',
          type: 'array',
          of: [defineArrayMember({ type: 'accessMode' })],
        }),
        defineField({ name: 'accessibility', title: 'Accessibility', type: 'localeText' }),
        defineField({
          name: 'hotelDeal',
          title: 'Hotel deal',
          type: 'object',
          options: { collapsible: true, collapsed: false },
          fields: [
            defineField({
              name: 'partner',
              title: 'Hotel',
              type: 'reference',
              to: [{ type: 'partner' }],
            }),
            defineField({ name: 'text', title: 'Text', type: 'localeText' }),
            defineField({ name: 'url', title: 'Booking link', type: 'url' }),
          ],
        }),
        defineField({
          name: 'images',
          title: 'Closing images',
          type: 'array',
          of: [defineArrayMember({ type: 'figure' })],
          options: { layout: 'grid' },
        }),
      ],
    }),

    defineField({
      name: 'faq',
      title: 'Frequently asked questions',
      type: 'array',
      group: 'faq',
      of: [defineArrayMember({ type: 'faqItem' })],
    }),

    defineField({
      name: 'pressContacts',
      title: 'Press contacts',
      type: 'array',
      group: 'press',
      of: [defineArrayMember({ type: 'pressContact' })],
    }),
    defineField({ name: 'pressKitUrl', title: 'Press kit URL', type: 'url', group: 'press' }),
    defineField({ name: 'pressEmail', title: 'Press email', type: 'string', group: 'press' }),
  ],
  preview: {
    prepare: () => ({ title: 'Site settings' }),
  },
});
