import { defineArrayMember, defineField, defineType } from 'sanity';

/**
 * The anchor every dated document hangs from. One per fair year.
 *
 * Everything that changes from one edition to the next but is not a list of
 * its own lives here: dates, opening hours, ticket prices, the guest of
 * honour, the country focus, the key figures quoted afterwards, and the links
 * to catalogue and photo galleries. The current edition drives the homepage,
 * the exhibitor list and the visitors-info page; older ones become the
 * past-editions archive.
 */
export const edition = defineType({
  name: 'edition',
  title: 'Edition',
  type: 'document',
  groups: [
    { name: 'main', title: 'Edition', default: true },
    { name: 'visit', title: 'Hours & tickets' },
    { name: 'archive', title: 'Figures & archive' },
  ],
  fields: [
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      group: 'main',
      validation: (rule) => rule.required().min(2020).max(2100).integer(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'localeString',
      group: 'main',
      description: 'e.g. ceramic brussels 2027',
    }),
    defineField({
      name: 'ordinal',
      title: 'Ordinal',
      type: 'localeString',
      group: 'main',
      description: 'e.g. "4th edition" / "4e édition" / "4de editie". Used in intro copy.',
    }),
    defineField({
      name: 'startDate',
      title: 'First day',
      type: 'date',
      group: 'main',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'endDate',
      title: 'Last day',
      type: 'date',
      group: 'main',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'isCurrent',
      title: 'Current edition',
      type: 'boolean',
      group: 'main',
      description:
        'Exactly one edition should be current. It drives the homepage, the exhibitor list and visitors info.',
      initialValue: false,
    }),
    defineField({
      name: 'datesMark',
      title: 'Dates mark',
      type: 'figure',
      group: 'main',
      description: 'The hand-drawn "20~24 jan. 2027" artwork shown in the header. SVG or PNG.',
    }),
    defineField({
      name: 'venue',
      title: 'Venue',
      type: 'string',
      group: 'main',
      initialValue: 'Tour & Taxis, Brussels',
    }),
    defineField({
      name: 'guestOfHonour',
      title: 'Guest of honour',
      type: 'reference',
      group: 'main',
      to: [{ type: 'artist' }],
    }),
    defineField({
      name: 'countryFocus',
      title: 'Country focus',
      type: 'localeString',
      group: 'main',
      description: 'Badge text on exhibitor cards, e.g. "focus España". Leave empty if there is none.',
    }),
    defineField({ name: 'intro', title: 'Introduction', type: 'localeBlock', group: 'main' }),
    defineField({ name: 'cover', title: 'Cover image', type: 'figure', group: 'main' }),

    /* --- hours & tickets ------------------------------------------------ */
    defineField({
      name: 'openingHours',
      title: 'Opening hours',
      type: 'array',
      group: 'visit',
      of: [defineArrayMember({ type: 'openingDay' })],
    }),
    defineField({
      name: 'lastEntry',
      title: 'Last entry note',
      type: 'localeString',
      group: 'visit',
      description: 'e.g. "Last entry 30 minutes before closing."',
    }),
    defineField({
      name: 'tickets',
      title: 'Tickets',
      type: 'array',
      group: 'visit',
      of: [defineArrayMember({ type: 'ticketType' })],
    }),
    defineField({ name: 'ticketsUrl', title: 'Ticketing URL', type: 'url', group: 'visit' }),
    defineField({
      name: 'ticketsNote',
      title: 'Ticket conditions',
      type: 'localeText',
      group: 'visit',
      description: 'Small print under the table: on-site sales, refunds, cloakroom…',
    }),
    defineField({ name: 'fairMap', title: 'Floor plan (PDF)', type: 'file', group: 'visit' }),

    /* --- figures & archive ---------------------------------------------- */
    defineField({
      name: 'keyFigures',
      title: 'Key figures',
      type: 'array',
      group: 'archive',
      of: [defineArrayMember({ type: 'keyFigure' })],
      description: 'Filled in after the fair: visitors, exhibitors, artists, VIPs, press clips.',
    }),
    defineField({
      name: 'images',
      title: 'Photo gallery',
      type: 'array',
      group: 'archive',
      of: [defineArrayMember({ type: 'figure' })],
      options: { layout: 'grid' },
      description: 'The "ceramic brussels 2026 in images" gallery.',
    }),
    defineField({ name: 'film', title: 'Film', type: 'video', group: 'archive' }),
    defineField({ name: 'catalogueUrl', title: 'Catalogue URL', type: 'url', group: 'archive' }),
    defineField({ name: 'overviewUrl', title: 'Overview / brochure URL', type: 'url', group: 'archive' }),
    defineField({ name: 'pressClipsUrl', title: 'Press clips URL', type: 'url', group: 'archive' }),
  ],
  orderings: [
    { title: 'Year, newest first', name: 'yearDesc', by: [{ field: 'year', direction: 'desc' }] },
  ],
  preview: {
    select: { year: 'year', isCurrent: 'isCurrent', media: 'cover' },
    prepare: ({ year, isCurrent, media }) => ({
      title: `ceramic brussels ${year ?? '--'}`,
      subtitle: isCurrent ? 'Current edition' : 'Archive',
      media,
    }),
  },
});
