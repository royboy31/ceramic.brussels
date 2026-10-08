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
 * Since 2026-10-08 an interview can also **be** a page: give it a slug and
 * an Interview text and it is built at /<lang>/stories/<slug> in the
 * interview layout Léonie drew (`StoryInterview.astro`), with this card
 * leading to it.
 *
 * Without a slug nothing changes - the card's own link says where "read the
 * interview" goes: a news item (an interview published here), a page of this
 * site (the guest of honour's interview tab), or the site that hosts the
 * series (Ceramics Now). That keeps interviews out of the news list unless
 * they are news items too.
 *
 * The page's four fields are hidden on a collectors' voice, which is a card
 * pointing at Ceramics Now and has no page of its own here.
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
    // The interview's own page (Léonie, 2026-10-08). Everything here is
    // optional: a story without a slug is the card it has always been.
    defineField({
      name: 'slug',
      title: 'Slugs',
      type: 'localeSlug',
      description:
        'Fill these in and the interview gets a page of its own at /stories/… in each language, in the interview layout. Leave them empty and this stays a card linking somewhere else.',
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
      description:
        'Only used while the interview has no page of its own. A news item, a page of this site, or an external address; with neither, the card has no link.',
    }),
    defineField({
      name: 'body',
      title: 'The interview',
      type: 'localeBlock',
      description:
        'The whole interview. Style a paragraph “Quote” to make it the big pull quote — the line under it becomes the name below it. Style a question “Minor heading” (or set it bold from end to end); the paragraphs after it are its answer, with the speaker’s initials in bold at the start. Anything before the first question is the lead under the title.',
      hidden: ({ document }) => document?.kind !== 'interview',
    }),
    defineField({
      name: 'links',
      title: 'Buttons under the name',
      type: 'array',
      of: [{ type: 'link' }],
      description: 'Optional, e.g. “instagram” or “website” for the person or gallery interviewed. Drawn as pills under the title.',
      hidden: ({ document }) => document?.kind !== 'interview',
    }),
    defineField({
      name: 'images',
      title: 'Photographs under the interview',
      type: 'array',
      of: [{ type: 'figure' }],
      options: { layout: 'grid' },
      description: 'Optional, three across at the foot of the page. Leave it empty and the page ends on the text.',
      hidden: ({ document }) => document?.kind !== 'interview',
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
