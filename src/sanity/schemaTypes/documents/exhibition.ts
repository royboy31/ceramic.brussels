import { defineArrayMember, defineField, defineType } from 'sanity';

/**
 * A partner institution's exhibition, free to anyone holding a fair ticket.
 *
 * These make the programme hub's **exhibition pass** tab (backend request #48,
 * merged with #36; Léonie's frame of 2026-09-30, "I have created a new
 * « exhibition pass » page in Figma"). The page opens with its own lead and
 * then draws one row per exhibition, alternating the picture's side.
 *
 * **Not a `programmeEvent`, deliberately.** These are months-long shows at
 * *other* venues: no time of day, no on-site location, no programme section.
 * Reusing the event type would have put them in `getProgramme`, which feeds
 * the talks tab, the VIP programme and every past edition's archive, so all
 * three would have had to filter them back out - more work than a type of its
 * own, and a filter is easy to forget when a fourth reader of that query
 * arrives. Decided by Kamindu, 2026-10-01.
 */
export const exhibition = defineType({
  name: 'exhibition',
  title: 'Exhibition (exhibition pass)',
  type: 'document',
  fields: [
    defineField({
      name: 'institution',
      title: 'Institution',
      type: 'localeString',
      description: 'The venue, as the heading reads it: "BPS22 — Art Museum of the Province of Hainaut".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'edition',
      title: 'Edition',
      type: 'reference',
      to: [{ type: 'edition' }],
      description: 'Which fair this exhibition is free with. The tab shows the current edition’s.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'artist',
      title: 'Artist',
      type: 'string',
      description:
        'The artist shown, if the exhibition is one artist’s: "Emmanuel Van der Auwera". A name, not a reference - these are other venues’ artists, who have no page here. Optional: the frame’s CID row has none.',
    }),
    defineField({
      name: 'exhibitionTitle',
      title: 'Exhibition title',
      type: 'localeString',
      description: 'Rendered in italic beside the artist: "Emmanuel Van der Auwera / *Juggernaut*".',
    }),
    defineField({
      name: 'city',
      title: 'Postcode and city',
      type: 'string',
      description: 'The chip at the right of the row, written as the frame writes it: "6000 Charleroi".',
    }),
    defineField({
      name: 'startDate',
      title: 'First day',
      type: 'date',
      description:
        'Optional. Left empty the row reads "→ 18 APR. 2027", which is how the frame draws an exhibition that opened before the fair.',
    }),
    defineField({
      name: 'endDate',
      title: 'Last day',
      type: 'date',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'localeText',
      rows: 5,
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'link',
      description: 'The row’s "discover the exhibition" button - usually the institution’s own page for the show.',
    }),
    defineField({
      name: 'images',
      title: 'Pictures',
      type: 'array',
      of: [defineArrayMember({ type: 'figure' })],
      options: { layout: 'grid' },
      description: 'The row’s slideshow. The frame shows three; any number works, and one picture simply does not slide.',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      initialValue: 100,
      description: 'Low numbers first. Ties fall back to the institution’s name.',
    }),
  ],
  orderings: [{ title: 'Order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
  preview: {
    select: { title: 'institution.en', artist: 'artist', year: 'edition.year', media: 'images.0' },
    prepare: ({ title, artist, year, media }) => ({
      title: title ?? '(unnamed exhibition)',
      subtitle: [year, artist].filter(Boolean).join(' · '),
      media,
    }),
  },
});
