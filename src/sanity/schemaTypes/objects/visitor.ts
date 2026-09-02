import { defineArrayMember, defineField, defineType } from 'sanity';

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
      description: 'First day this row covers. Used for structured data, not shown.',
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
  ],
  preview: {
    select: { question: 'question.en' },
    prepare: ({ question }) => ({ title: question ?? '(no question)' }),
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
