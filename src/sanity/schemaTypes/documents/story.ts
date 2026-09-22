import { defineField, defineType } from 'sanity';

/** The two lists on press & media → stories. Labels are `press.interviews` / `press.collectorsVoices` in STRINGS. */
export const STORY_KINDS = [
  { title: 'Interview', value: 'interview' },
  { title: 'Collectors’ voice', value: 'collectors-voice' },
] as const;

/**
 * A story card on press & media → stories (the designer's hand-off of
 * 2026-09-21, backend request #21): an interview - a portrait, the person's
 * name, the role they speak in ("guest of honour", "main partner"), a few
 * lines and "read the interview →" - or an entry of the collectors' voices
 * series, dated, with a picture, a title and the same link.
 *
 * A story is a card, not a page: its link says where "read the interview"
 * goes - a news item (an interview published here), a page of this site
 * (the guest of honour's interview tab), or the site that hosts the series
 * (Ceramics Now). That keeps interviews out of the news list unless they
 * are news items too.
 */
export const story = defineType({
  name: 'story',
  title: 'Story',
  type: 'document',
  fields: [
    defineField({
      name: 'kind',
      title: 'List',
      type: 'string',
      options: { list: [...STORY_KINDS], layout: 'radio' },
      initialValue: 'interview',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Name or title',
      type: 'localeString',
      description: 'An interview: the person’s name. A collectors’ voice: the piece’s title.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Speaks as',
      type: 'localeString',
      description: 'The line in capitals under the name: guest of honour, main partner, media partner…',
      hidden: ({ document }) => document?.kind !== 'interview',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Date',
      type: 'date',
      description: 'Shown as month and year on a collectors’ voice; orders both lists, newest first.',
      initialValue: () => new Date().toISOString().slice(0, 10),
    }),
    defineField({ name: 'image', title: 'Picture', type: 'figure' }),
    defineField({
      name: 'text',
      title: 'Text',
      type: 'localeText',
      description: 'A few lines on the card.',
    }),
    defineField({
      name: 'link',
      title: 'Where “read the interview” goes',
      type: 'link',
      description: 'A news item, a page of this site, or an external address. Without one the card has no link.',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Lower comes first; stories with the same order go newest first.',
      initialValue: 100,
    }),
  ],
  orderings: [
    { title: 'Order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }, { field: 'publishedAt', direction: 'desc' }] },
    { title: 'Newest first', name: 'publishedDesc', by: [{ field: 'publishedAt', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'title.en', kind: 'kind', role: 'role.en', date: 'publishedAt', media: 'image' },
    prepare: ({ title, kind, role, date, media }) => ({
      title: title ?? '(untitled)',
      subtitle: [STORY_KINDS.find((k) => k.value === kind)?.title ?? kind, role, date].filter(Boolean).join(' · '),
      media,
    }),
  },
});
