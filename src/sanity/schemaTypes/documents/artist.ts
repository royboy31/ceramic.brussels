import { defineArrayMember, defineField, defineType } from 'sanity';
import { countryCodeField } from '../objects/country';

/**
 * Anyone who makes work: artists shown at booths, art-prize laureates, and
 * the guest of honour. One document per person, reused across editions -
 * which edition they were laureate or guest of honour in is recorded on the
 * `laureate` document and the `edition` document respectively, not here.
 *
 * The "feature" group holds what the guest-of-honour page needs on top of a
 * plain profile: a lead paragraph, titled sections, a carousel and a video.
 */
export const artist = defineType({
  name: 'artist',
  title: 'Artist',
  type: 'document',
  groups: [
    { name: 'main', title: 'Profile', default: true },
    { name: 'feature', title: 'Feature page' },
    { name: 'meta', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      group: 'main',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'main',
      options: { source: 'name', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'birthYear', title: 'Year of birth', type: 'number', group: 'main' }),
    countryCodeField({ group: 'main', title: 'Nationality (code)' }),
    defineField({
      name: 'nationality',
      title: 'Nationality',
      type: 'localeString',
      group: 'main',
      description: 'As displayed: "France", "Belgian"…',
    }),
    defineField({
      name: 'basedIn',
      title: 'Based in',
      type: 'localeString',
      group: 'main',
      description: 'City or country, e.g. "Norway", "Paris". Shown as "Based in …".',
    }),
    defineField({ name: 'bio', title: 'Biography', type: 'localeBlock', group: 'main' }),
    defineField({ name: 'portrait', title: 'Portrait', type: 'figure', group: 'main' }),
    defineField({
      name: 'works',
      title: 'Works',
      type: 'array',
      group: 'main',
      of: [defineArrayMember({ type: 'artwork' })],
      options: { layout: 'grid' },
    }),
    defineField({ name: 'website', title: 'Website', type: 'url', group: 'main' }),
    defineField({
      name: 'instagram',
      title: 'Instagram handle',
      type: 'string',
      group: 'main',
      description: 'Without the @',
    }),
    defineField({
      name: 'gallery',
      title: 'Represented by',
      type: 'string',
      group: 'main',
      description: 'Free text, e.g. "Galerie Lelong, Paris". Used on the guest-of-honour page.',
    }),

    /* --- feature page ------------------------------------------------------ */
    defineField({
      name: 'intro',
      title: 'Lead paragraph',
      type: 'localeBlock',
      group: 'feature',
      description: 'The large opening text next to the portrait.',
    }),
    defineField({
      name: 'sections',
      title: 'Sections',
      type: 'array',
      group: 'feature',
      of: [defineArrayMember({ type: 'contentSection' })],
      description: 'e.g. "biography", "sculptural practice". Each gets a heading and a rule.',
    }),
    defineField({
      name: 'carousel',
      title: 'Image carousel',
      type: 'array',
      group: 'feature',
      of: [defineArrayMember({ type: 'figure' })],
      options: { layout: 'grid' },
    }),
    defineField({ name: 'video', title: 'Video', type: 'video', group: 'feature' }),
    defineField({
      name: 'interview',
      title: 'Interview',
      type: 'localeBlock',
      group: 'feature',
      description: 'The "interview" tab on the guest-of-honour page.',
    }),
    defineField({ name: 'seo', title: 'SEO', type: 'seo', group: 'meta' }),
  ],
  orderings: [{ title: 'Name', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] }],
  preview: {
    select: {
      title: 'name',
      country: 'countryCode',
      year: 'birthYear',
      media: 'portrait',
    },
    prepare: ({ title, country, year, media }) => ({
      title,
      subtitle: [year ? `°${year}` : null, country].filter(Boolean).join(' · '),
      media,
    }),
  },
});
