import { defineArrayMember, defineField, defineType } from 'sanity';
import { EVENT_KINDS, EVENT_VENUES, PROGRAMME_SECTIONS } from '../../../lib/options';

/**
 * One entry in the programme: a talk, a roundtable, the award ceremony, a
 * preview. The talks tab groups them by day; `section` decides which
 * programme tab they belong to.
 */
/** Re-exported so the schemas stay the obvious place to look for them. */
export { EVENT_KINDS, PROGRAMME_SECTIONS } from '../../../lib/options';

export const programmeEvent = defineType({
  name: 'programmeEvent',
  title: 'Programme event',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'localeString',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title.en', maxLength: 96 },
    }),
    defineField({
      name: 'edition',
      title: 'Edition',
      type: 'reference',
      to: [{ type: 'edition' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'section',
      title: 'Programme tab',
      type: 'string',
      options: { list: [...PROGRAMME_SECTIONS], layout: 'radio' },
      initialValue: 'talks',
      description:
        'The tab that lists it, for the current edition. "VIP programme" is the VIP hub’s locked tab, shown to visitors with a code. "Awards" is the programme’s award ceremony tab, which shows a day’s events as one block.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'venue',
      title: 'On-site or off-site',
      type: 'string',
      options: { list: [...EVENT_VENUES], layout: 'radio' },
      initialValue: 'off-site',
      description: 'The VIP programme tab filters its events on this.',
      hidden: ({ document }) => document?.section !== 'vip',
    }),
    defineField({
      name: 'startsAt',
      title: 'Starts',
      type: 'datetime',
      validation: (rule) => rule.required(),
    }),
    // An event that repeats has no one date to print: the VIP frames date the
    // discovery tours "everyday - 11:00 / 16:00" and the lounge aperitivos
    // "everyday - 17:30 -> 19:00". Written once here, it stands in for the
    // formatted time wherever the page would print it (request #15). A
    // recurrence model would carry more than these two blocks ever need.
    defineField({
      name: 'whenText',
      title: 'When (free text)',
      type: 'localeString',
      description:
        'Shown instead of the time when the event repeats: "everyday — 11:00 / 16:00". Leave empty for a normal, dated event.',
    }),
    // Ends, location, moderator, description and "upon invitation" are kept for
    // the imported data but hidden: the design's programme row has no place for
    // them, so nothing an editor typed there would ever reach the site.
    defineField({ name: 'endsAt', title: 'Ends', type: 'datetime', hidden: true }),
    defineField({
      name: 'kind',
      title: 'Type',
      type: 'string',
      options: { list: [...EVENT_KINDS] },
      initialValue: 'talk',
    }),
    defineField({
      name: 'languages',
      title: 'Languages',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      options: {
        list: [
          { title: 'English', value: 'EN' },
          { title: 'Français', value: 'FR' },
          { title: 'Nederlands', value: 'NL' },
          { title: 'Español', value: 'ES' },
        ],
        layout: 'grid',
      },
      description: 'Languages the event is held in.',
    }),
    // The award ceremony tab draws it as the hall chip ("HALL C"); hidden
    // elsewhere, where the programme row has no place for it.
    defineField({
      name: 'location',
      title: 'Location',
      type: 'localeString',
      description: 'The hall, e.g. "Hall C". Shown on the award ceremony tab.',
      hidden: ({ document }) => document?.section !== 'awards',
    }),
    defineField({
      name: 'speakers',
      title: 'Speakers',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'artist' }, { type: 'person' }] })],
      description: 'Speakers who have a document. Free text below covers everyone else.',
    }),
    defineField({
      name: 'speakersText',
      title: 'Speakers (free text)',
      type: 'localeText',
      description:
        'As displayed: "with Christine Germain-Donnat (French Ministry of Culture), Bertrand Mazeirat (Musée Ariana, CH)…"',
    }),
    defineField({ name: 'moderator', title: 'Moderator', type: 'string', hidden: true }),
    // Shown for VIP events, whose row in the design carries a paragraph;
    // hidden elsewhere, where the programme row has no place for it.
    defineField({
      name: 'description',
      title: 'Description',
      type: 'localeBlock',
      hidden: ({ document }) => document?.section !== 'vip',
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'figure',
      description: 'One picture, as before. The slideshow below wins when it has any.',
    }),
    // The same shape as `award.images` (request #5): the accordion rows of the
    // talks tab and the VIP programme draw their pictures through the shared
    // Slideshow, which shows one slide without its counter (request #9).
    defineField({
      name: 'images',
      title: 'Slideshow',
      type: 'array',
      of: [defineArrayMember({ type: 'figure' })],
      options: { layout: 'grid' },
      description: 'Several pictures for this event, each with its caption. Replaces the single image above.',
    }),
    // "book your visit ↗", "discover Puilaetco →": the label and the target
    // both change per event, so neither can be a fixed string in the page
    // (request #14). The shared `link` object gives the editor the choice of a
    // page of this site, a document or an external address, and the arrow
    // follows from it.
    defineField({
      name: 'link',
      title: 'Link',
      type: 'link',
      description: 'The pill that ends the row: "book your visit", "discover Puilaetco". Left empty, no pill is drawn.',
    }),
    defineField({
      name: 'invitationOnly',
      title: 'Upon invitation',
      type: 'boolean',
      initialValue: false,
      hidden: true,
    }),
  ],
  orderings: [
    { title: 'Start time', name: 'startsAsc', by: [{ field: 'startsAt', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'title.en', startsAt: 'startsAt', kind: 'kind', section: 'section', media: 'image' },
    prepare: ({ title, startsAt, kind, section, media }) => ({
      title: title ?? '(untitled)',
      subtitle: [startsAt ? startsAt.slice(0, 16).replace('T', ' ') : null, kind, section]
        .filter(Boolean)
        .join(' · '),
      media,
    }),
  },
});
