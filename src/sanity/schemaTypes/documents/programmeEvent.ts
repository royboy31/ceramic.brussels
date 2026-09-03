import { defineArrayMember, defineField, defineType } from 'sanity';
import { EVENT_KINDS, PROGRAMME_SECTIONS } from '../../../lib/options';

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
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'startsAt',
      title: 'Starts',
      type: 'datetime',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'endsAt', title: 'Ends', type: 'datetime' }),
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
    defineField({ name: 'location', title: 'Location', type: 'localeString', description: 'e.g. talk area, hall B' }),
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
    defineField({ name: 'moderator', title: 'Moderator', type: 'string' }),
    defineField({ name: 'description', title: 'Description', type: 'localeBlock' }),
    defineField({ name: 'image', title: 'Image', type: 'figure' }),
    defineField({
      name: 'invitationOnly',
      title: 'Upon invitation',
      type: 'boolean',
      initialValue: false,
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
