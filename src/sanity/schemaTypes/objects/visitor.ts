import { defineArrayMember, defineField, defineType } from 'sanity';
import { FAQ_CATEGORIES } from '../../../lib/options';

/**
 * Structured practical information. The design lays opening hours, tickets
 * and access out as labelled rows rather than prose, so each is a small object
 * an editor fills in per line instead of formatting a text block.
 */

/** "19,200 visitors" on the homepage and the past-editions pages. */
export const keyFigure = defineType({
  name: 'keyFigure',
  title: 'Key figure',
  type: 'object',
  options: { columns: 2 },
  fields: [
    defineField({
      name: 'value',
      title: 'Number',
      type: 'string',
      description: 'As it should read, e.g. 19,200 or 200+',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'localeString',
      validation: (rule) => rule.required(),
    }),
    // Optional, additive (request #25): the homepage makes a figure with a
    // link clickable - 19,200 visitors → about, 50k followers → Instagram.
    defineField({
      name: 'link',
      title: 'Link',
      type: 'link',
      description: 'Optional. Where the figure leads on the homepage, e.g. "exhibitors" or the Instagram page.',
    }),
  ],
  preview: {
    select: { value: 'value', label: 'label.en' },
    prepare: ({ value, label }) => ({ title: `${value ?? ''} ${label ?? ''}`.trim() }),
  },
});

/** One line under a day: "14—17:00 · Preview (upon invitation)". */
export const openingSlot = defineType({
  name: 'openingSlot',
  title: 'Time slot',
  type: 'object',
  options: { columns: 2 },
  fields: [
    defineField({
      name: 'time',
      title: 'Time',
      type: 'string',
      description: 'e.g. 11—19:00',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'label', title: 'Label', type: 'localeString' }),
    defineField({
      name: 'invitationOnly',
      title: 'Upon invitation',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: { time: 'time', label: 'label.en', inv: 'invitationOnly' },
    prepare: ({ time, label, inv }) => ({
      title: `${time ?? ''}  ${label ?? ''}`.trim(),
      subtitle: inv ? 'upon invitation' : undefined,
    }),
  },
});

/** A day, or a run of days, in the opening hours table. */
export const openingDay = defineType({
  name: 'openingDay',
  title: 'Day',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Day',
      type: 'localeString',
      description: 'As displayed, e.g. "Thursday 21 — Saturday 23 January 2027".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      // Kept for existing rows, hidden: the Day label is required and is what
      // the page prints, so the date is never read.
      hidden: true,
    }),
    defineField({
      name: 'slots',
      title: 'Time slots',
      type: 'array',
      of: [defineArrayMember({ type: 'openingSlot' })],
    }),
  ],
  preview: {
    select: { label: 'label.en', slots: 'slots' },
    prepare: ({ label, slots }) => ({
      title: label ?? '(no day)',
      subtitle: (slots ?? []).map((s: any) => s.time).join(' · '),
    }),
  },
});

/** One row of the ticket table. */
export const ticketType = defineType({
  name: 'ticketType',
  title: 'Ticket',
  type: 'object',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'localeString',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'price',
      title: 'Price',
      type: 'string',
      description: 'As displayed: 20€, 1,25€, Free',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'note',
      title: 'Conditions',
      type: 'localeText',
      description: 'Shown in brackets after the price.',
    }),
  ],
  preview: {
    select: { name: 'name.en', price: 'price' },
    prepare: ({ name, price }) => ({ title: name ?? '(unnamed)', subtitle: price }),
  },
});

/** "By public transport — Metro lines 2 and 6 …" */
export const accessMode = defineType({
  name: 'accessMode',
  title: 'Access',
  type: 'object',
  fields: [
    defineField({
      name: 'mode',
      title: 'How',
      type: 'localeString',
      description: 'e.g. By public transport, By bike, Car park',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'text', title: 'Details', type: 'localeText' }),
  ],
  preview: {
    select: { mode: 'mode.en', text: 'text.en' },
    prepare: ({ mode, text }) => ({ title: mode ?? '(no mode)', subtitle: text }),
  },
});

export const faqItem = defineType({
  name: 'faqItem',
  title: 'Question',
  type: 'object',
  fields: [
    defineField({
      name: 'question',
      title: 'Question',
      type: 'localeString',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'answer', title: 'Answer', type: 'localeBlock' }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      description: 'The heading this question sits under on the FAQ page, and its filter pill. Unsorted questions go last, under "Other".',
      options: { list: [...FAQ_CATEGORIES] },
    }),
  ],
  preview: {
    select: { question: 'question.en', category: 'category' },
    prepare: ({ question, category }) => ({
      title: question ?? '(no question)',
      subtitle: FAQ_CATEGORIES.find((c) => c.value === category)?.title,
    }),
  },
});

/** Press contact per region, listed on the press page. */
export const pressContact = defineType({
  name: 'pressContact',
  title: 'Press contact',
  type: 'object',
  fields: [
    defineField({ name: 'region', title: 'Region', type: 'localeString', description: 'e.g. Benelux, France, International' }),
    defineField({ name: 'name', title: 'Agency or person', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'email', title: 'Email', type: 'string' }),
    defineField({ name: 'url', title: 'Website', type: 'url' }),
    defineField({ name: 'instagram', title: 'Instagram handle', type: 'string' }),
  ],
  preview: {
    select: { name: 'name', region: 'region.en' },
    prepare: ({ name, region }) => ({ title: name, subtitle: region }),
  },
});

/**
 * A labelled link in the previous editions overview's "highlights" column
 * (BACKEND-REQUEST #33). The label is the editor's sentence - "10 art prize
 * laureates" - and the link is usually another tab of the same edition.
 */
export const editionHighlight = defineType({
  name: 'editionHighlight',
  title: 'Highlight',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'localeString',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'link', title: 'Link', type: 'link' }),
  ],
  preview: {
    select: { label: 'label.en' },
    prepare: ({ label }) => ({ title: label ?? 'Highlight' }),
  },
});

/**
 * One previous-editions tab's opening paragraph (BACKEND-REQUEST #32). Each
 * of the seven tabs has its own on the frames, so they are a list keyed by
 * tab rather than one field per tab.
 */
export const editionLead = defineType({
  name: 'editionLead',
  title: 'Tab lead',
  type: 'object',
  fields: [
    defineField({
      name: 'tab',
      title: 'Tab',
      type: 'string',
      options: {
        list: [
          { title: 'Overview', value: 'overview' },
          { title: 'Guest of honour', value: 'guest-of-honour' },
          { title: 'Exhibitors', value: 'exhibitors' },
          { title: 'Art prize', value: 'art-prize' },
          { title: 'Country focus', value: 'focus' },
          { title: 'Programme', value: 'programme' },
          { title: 'Publication', value: 'publication' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'lead', title: 'Lead paragraph', type: 'localeBlock' }),
  ],
  preview: {
    select: { tab: 'tab' },
    prepare: ({ tab }) => ({ title: tab ?? 'Tab lead' }),
  },
});

/**
 * What the guest of honour showed at that fair (BACKEND-REQUEST #34): the
 * installation's own title, the text about it and who wrote it, with its
 * pictures. On the edition and not on the artist, because it belongs to one
 * year - 2025's guest has been followed by two others since.
 */
export const guestInstallation = defineType({
  name: 'guestInstallation',
  title: 'Installation',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'localeString',
      description: 'e.g. "AT TWILIGHT, ceramic brussels 2025"',
    }),
    defineField({ name: 'text', title: 'Text', type: 'localeBlock' }),
    defineField({ name: 'author', title: 'Written by', type: 'string', description: 'Shown as a signature under the text.' }),
    defineField({
      name: 'images',
      title: 'Pictures',
      type: 'array',
      of: [defineArrayMember({ type: 'figure' })],
      options: { layout: 'grid' },
    }),
  ],
});

/**
 * The country focus tab (BACKEND-REQUEST #35). The galleries are the
 * edition's exhibitors flagged "In country focus" - this object only holds
 * the words and the pictures around them. Its talks are the edition's
 * programme events with the section "Country focus".
 */
export const editionFocus = defineType({
  name: 'editionFocus',
  title: 'Country focus',
  type: 'object',
  fields: [
    defineField({
      name: 'lead',
      title: 'Lead paragraph',
      type: 'localeBlock',
      description: 'Shown above the pictures. Links inside it work as anywhere else.',
    }),
    defineField({
      name: 'images',
      title: 'Pictures',
      type: 'array',
      of: [defineArrayMember({ type: 'figure' })],
      options: { layout: 'grid' },
    }),
    defineField({
      name: 'talkImages',
      title: 'Talks pictures',
      type: 'array',
      of: [defineArrayMember({ type: 'figure' })],
      options: { layout: 'grid' },
      description: 'The slideshow beside the talks programme.',
    }),
  ],
});

/** The fair's magazine for that year (BACKEND-REQUEST #36). */
export const editionPublication = defineType({
  name: 'editionPublication',
  title: 'Publication',
  type: 'object',
  fields: [
    defineField({
      name: 'url',
      title: 'Reader URL',
      type: 'url',
      description: 'The page-flip reader, embedded full width, e.g. https://online.fliphtml5.com/qogyd/xffh/',
    }),
    defineField({ name: 'title', title: 'Title', type: 'localeString' }),
    defineField({ name: 'cover', title: 'Cover', type: 'figure' }),
  ],
});
