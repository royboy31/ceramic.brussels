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
        'Exactly one edition should be current. It drives the homepage, the programme, VIP, the partners and the key figures. Which editions’ galleries the site shows is the field below.',
      initialValue: false,
      /**
       * Two current editions break the build, and nothing used to say so.
       * On 2026-10-01 both 2026 and 2027 were ticked: an edition that is
       * current is no longer a *past* edition, so `/previous-editions/2026/`
       * stopped being written, the legacy redirect pointing at it had no
       * target, and `scripts/legacy-redirects.mjs` failed the build - leaving
       * Cloudflare serving the last good deploy while nothing an editor
       * published could reach the site. The only signal was a build log.
       *
       * A warning rather than an error on purpose: it has to be possible to
       * fix this state from either document, and a hard error on a condition
       * that already exists can corner an editor. The message names the other
       * year so the way out is obvious.
       */
      validation: (rule) =>
        rule.custom<boolean>(async (value, context) => {
          if (value !== true) return true;
          const id = (context.document?._id ?? '').replace(/^drafts\./, '');
          const others = await context
            .getClient({ apiVersion: '2024-01-01' })
            .fetch<number[]>(
              `*[_type == "edition" && isCurrent == true && !(_id in [$id, "drafts." + $id])] | order(year desc).year`,
              { id },
            );
          if (others.length === 0) return true;
          return `${others.join(' and ')} ${others.length > 1 ? 'are' : 'is'} already the current edition. Only one edition may be current - untick it there first, or the site keeps that year's programme and VIP, and the build fails because this year stops being a past edition.`;
        }).warning(),
    }),
    defineField({
      name: 'showExhibitors',
      title: 'Show this edition’s galleries',
      type: 'boolean',
      group: 'main',
      description:
        'Leave off until this edition’s galleries are announced: the galleries page then skips it and opens on the year before, with year buttons to the earlier ones. Only matters on the current edition - a past edition’s galleries always stay on the site, whatever this says. Separate from Current edition on purpose: that flag also drives the homepage, the programme, VIP, the partners and the key figures, so an edition can be the current one while its gallery list is still being typed in.',
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
    // The designer's site diagram under the access modes on visitors info →
    // practical info. Per edition because it draws the hall; without one the
    // shipped 2027 drawing stays (Visit.astro).
    defineField({
      name: 'venueMap',
      title: 'Venue map',
      type: 'figure',
      group: 'visit',
      description:
        'The site diagram drawn under "how to get there" on practical info: the hall, its entrances and the transport around it. PNG or SVG, about 760 × 536. Alt text describes it for screen readers.',
    }),

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

    /* --- previous editions -----------------------------------------------
       The section at /[lang]/previous-editions/<year> (Figma, Léonie
       2026-09-28; docs/previous-editions-plan.md). Every field here is
       optional and additive: a tab renders what it has, and `tabsFor` in
       src/lib/previousEditions.ts only gives a year a pill once there is
       something behind it. Nothing existing was changed to add them. */
    defineField({
      name: 'archiveLeads',
      title: 'Tab lead paragraphs',
      type: 'array',
      group: 'archive',
      of: [defineArrayMember({ type: 'editionLead' })],
      description: 'The opening paragraph of each previous-editions tab. One entry per tab that has one.',
    }),
    defineField({
      name: 'leadImages',
      title: 'Overview pictures',
      type: 'array',
      group: 'archive',
      of: [defineArrayMember({ type: 'figure' })],
      options: { layout: 'grid' },
      description: 'The pair shown under the lead on the overview tab. The first two are used, side by side, 3:2.',
    }),
    defineField({
      name: 'highlights',
      title: 'Overview highlights',
      type: 'array',
      group: 'archive',
      of: [defineArrayMember({ type: 'editionHighlight' })],
      description: 'The linked list beside the key figures on the overview tab.',
    }),
    defineField({
      name: 'guestInstallation',
      title: 'Guest of honour installation',
      type: 'guestInstallation',
      group: 'archive',
      description: 'What that year\'s guest of honour showed, with its own title, text and pictures.',
    }),
    defineField({
      name: 'focus',
      title: 'Country focus',
      type: 'editionFocus',
      group: 'archive',
      description:
        'The focus tab\'s words and pictures. Its galleries are the exhibitors flagged "In country focus"; its talks are the programme events with the section "Country focus".',
    }),
    defineField({
      name: 'publication',
      title: 'Publication',
      type: 'editionPublication',
      group: 'archive',
      description: 'The fair\'s magazine for that year, embedded on the publication tab.',
    }),
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
