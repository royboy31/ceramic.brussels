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
    { name: 'applications', title: 'Applications' },
    { name: 'vip', title: 'VIP' },
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
    defineField({
      name: 'defaultSeo',
      title: 'Default SEO',
      type: 'seo',
      group: 'identity',
      description: 'Used by any page that sets none of its own: the meta description and the social share image.',
    }),

    defineField({ name: 'contactEmail', title: 'Contact email', type: 'string', group: 'contact' }),
    // The closing block of about -> contact (request #13): who runs the fair,
    // a pill to the studio's own site, and the organisation's postal address.
    // `practicalInfo.address` is the *venue* and belongs to the visit hub, so
    // this is a field of its own rather than a second reading of that one.
    defineField({
      name: 'organiserText',
      title: 'Organiser line',
      type: 'localeText',
      group: 'contact',
      description:
        'Under the team grid: "ceramic brussels is initiated and organized jointly by studio emosi and ceramic brussels ASBL."',
    }),
    defineField({
      name: 'organiserLink',
      title: 'Organiser link',
      type: 'link',
      group: 'contact',
      description: 'The pill beside it: "discover studio emosi’s projects".',
    }),
    defineField({
      name: 'postalAddress',
      title: 'Postal address',
      type: 'text',
      rows: 3,
      group: 'contact',
      description: 'The organisation’s office, not the fair’s venue: "Rue Franz Merjay 148C, 1050 Brussels".',
    }),
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
      // Kept, hidden: no page reads it. The applications page is Other pages →
      // gallery applications, and a banner block links wherever it is told to.
      hidden: true,
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
        defineField({ name: 'mapUrl', title: 'Map link', type: 'url', hidden: true }),
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
            // The VIP hotel panel draws two distinct lines (request #16): the
            // rate in bold caps, and the paragraph under it. One Text field
            // had to carry both, and the split was the page's guess.
            defineField({
              name: 'rate',
              title: 'Rate line',
              type: 'localeString',
              description: 'The bold line in the panel: "€160/night breakfast included".',
            }),
            defineField({
              name: 'text',
              title: 'Text',
              type: 'localeText',
              description: 'The paragraph under the rate. "{code}" is replaced with the hotel code.',
            }),
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

    /**
     * The gallery application form (the "Application form" block). One form
     * on the site, one set of settings. Everything here is world-readable -
     * the dataset is public - so only addresses that are already on the site
     * belong here, never a key or a password.
     */
    defineField({
      name: 'applications',
      title: 'Application form',
      type: 'object',
      group: 'applications',
      options: { collapsible: false },
      fields: [
        defineField({
          name: 'open',
          title: 'Applications are open',
          type: 'boolean',
          initialValue: true,
          description: 'Off shows the message below instead of the form, wherever the form block is placed.',
        }),
        defineField({
          name: 'closedMessage',
          title: 'Message when closed',
          type: 'localeText',
          description: 'e.g. "Applications for 2027 are closed. The next call opens in spring 2027."',
        }),
        defineField({
          name: 'recipient',
          title: 'Send submissions to',
          type: 'string',
          description: 'The address that receives each request. Falls back to the contact email.',
          validation: (rule) => rule.email(),
        }),
        defineField({ name: 'cc', title: 'Copy to', type: 'string', validation: (rule) => rule.email() }),
        defineField({
          name: 'senderName',
          title: 'Sender name',
          type: 'string',
          description: 'What the applicant sees as the sender of the confirmation. Defaults to the site name.',
        }),
        defineField({
          name: 'senderEmail',
          title: 'Sender address',
          type: 'string',
          description: 'Must be on the domain verified with the email service. Defaults to the recipient.',
          validation: (rule) => rule.email(),
        }),
        defineField({
          name: 'confirmationSubject',
          title: 'Confirmation email: subject',
          type: 'localeString',
          description: 'Sent to the applicant. {firstName}, {lastName}, {gallery} are filled in.',
        }),
        defineField({
          name: 'confirmationText',
          title: 'Confirmation email: text',
          type: 'localeText',
          rows: 8,
          description: 'Plain text; a blank line starts a new paragraph. {firstName}, {lastName}, {gallery} are filled in.',
        }),
        defineField({
          name: 'successPage',
          title: 'Page shown after sending',
          type: 'reference',
          to: [{ type: 'page' }],
          options: { filter: '!defined(section)' },
          description:
            'A standalone page (Other pages) the applicant lands on once the request is sent - the thank-you page, in the language of the form. Without one, the message below shows under the form instead.',
        }),
        defineField({
          name: 'successMessage',
          title: 'Message under the form after sending',
          type: 'localeText',
          description: 'Optional. Used when no page is chosen above; replaces the standard "thank you" line.',
        }),
      ],
    }),

    /**
     * The VIP hub's "not a VIP yet?" request form and its access page
     * (docs/vip-access.md). Same shape as the application form: everything
     * here is world-readable, so addresses only. The codes and the guest
     * list are not in Sanity at all.
     */
    defineField({
      name: 'vip',
      title: 'VIP access',
      type: 'object',
      group: 'vip',
      options: { collapsible: false },
      fields: [
        defineField({
          name: 'gateOpen',
          title: 'A code is required',
          type: 'boolean',
          initialValue: true,
          description:
            'On: the VIP programme, lounge and hotel deal tabs open only with a code. Off (after the fair, say): they open for everyone. Takes up to five minutes to reach the site.',
        }),
        defineField({
          name: 'contactEmail',
          title: 'VIP team address',
          type: 'string',
          description: 'Shown to VIPs who need help, e.g. vip@ceramic.brussels. Falls back to the contact email.',
          validation: (rule) => rule.email(),
        }),
        defineField({
          name: 'recipient',
          title: 'Send access requests to',
          type: 'string',
          description: 'The address that receives each "not a VIP yet?" request. Falls back to the VIP team address.',
          validation: (rule) => rule.email(),
        }),
        defineField({ name: 'cc', title: 'Copy to', type: 'string', validation: (rule) => rule.email() }),
        defineField({
          name: 'senderName',
          title: 'Sender name',
          type: 'string',
          description: 'What the requester sees as the sender of the confirmation. Defaults to the site name.',
        }),
        defineField({
          name: 'senderEmail',
          title: 'Sender address',
          type: 'string',
          description: 'Must be on the domain verified with the email service. Defaults to the recipient.',
          validation: (rule) => rule.email(),
        }),
        defineField({
          name: 'confirmationSubject',
          title: 'Confirmation email: subject',
          type: 'localeString',
          description: 'Sent to the requester. {firstName}, {lastName}, {institution} are filled in. Empty: no confirmation is sent.',
        }),
        defineField({
          name: 'confirmationText',
          title: 'Confirmation email: text',
          type: 'localeText',
          rows: 6,
          description: 'Plain text; a blank line starts a new paragraph. {firstName}, {lastName}, {institution} are filled in.',
        }),
        defineField({
          name: 'successPage',
          title: 'Page shown after sending',
          type: 'reference',
          to: [{ type: 'page' }],
          options: { filter: '!defined(section)' },
          description: 'A standalone page (Other pages) the requester lands on. Without one, the message below shows under the form.',
        }),
        defineField({
          name: 'successMessage',
          title: 'Message under the form after sending',
          type: 'localeText',
          description: 'Optional. Used when no page is chosen above.',
        }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Site settings' }),
  },
});
