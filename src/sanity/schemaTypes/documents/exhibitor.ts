import { defineArrayMember, defineField, defineType } from 'sanity';
import { EXHIBITOR_KINDS } from '../../../lib/options';
import { countryCodeField } from '../objects/country';

/**
 * A participant in one edition: a gallery, a publisher, the jury-prize solo
 * show, or a tribute presentation. The heaviest content type on the site.
 *
 * One document per participation, so a gallery that comes back next year gets
 * a fresh document with that year's booth, artists and images. The exhibitor
 * filters in the design (solo show / country focus / publishers / jury prize)
 * all read from `kind` and the two flags below, never from the name.
 */
/** Re-exported so the schemas stay the obvious place to look for them. */
export { EXHIBITOR_KINDS } from '../../../lib/options';

export const exhibitor = defineType({
  name: 'exhibitor',
  title: 'Exhibitor',
  type: 'document',
  groups: [
    { name: 'main', title: 'Gallery', default: true },
    { name: 'artists', title: 'Artists' },
    { name: 'media', title: 'Images' },
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
      name: 'sortName',
      title: 'Sort as',
      type: 'string',
      group: 'main',
      description:
        'Only when the list should ignore a prefix: "Bernard Jordan" files Galerie Bernard Jordan under B.',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'main',
      options: { source: 'name', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'edition',
      title: 'Edition',
      type: 'reference',
      group: 'main',
      to: [{ type: 'edition' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'kind',
      title: 'Type',
      type: 'string',
      group: 'main',
      options: { list: [...EXHIBITOR_KINDS], layout: 'radio' },
      initialValue: 'gallery',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'booth',
      title: 'Booth',
      type: 'string',
      group: 'main',
      description: 'Stand number, e.g. B12',
    }),
    defineField({ name: 'city', title: 'City', type: 'string', group: 'main' }),
    countryCodeField({ group: 'main' }),
    defineField({
      name: 'country',
      title: 'Country',
      type: 'string',
      group: 'main',
      description: 'Full name, for search and the filter input.',
    }),
    defineField({
      name: 'soloShow',
      title: 'Solo show',
      type: 'boolean',
      group: 'main',
      description: 'Shows the solo-show badge on the card.',
      initialValue: false,
    }),
    defineField({
      name: 'inCountryFocus',
      title: 'Part of the country focus',
      type: 'boolean',
      group: 'main',
      description: 'Shows the focus badge (e.g. "focus España") on the card.',
      initialValue: false,
    }),
    defineField({ name: 'bio', title: 'About the gallery', type: 'localeBlock', group: 'main' }),
    defineField({ name: 'website', title: 'Website', type: 'url', group: 'main' }),
    defineField({
      name: 'instagram',
      title: 'Instagram handle',
      type: 'string',
      group: 'main',
      description: 'Without the @',
    }),

    /* --- artists ---------------------------------------------------------- */
    defineField({
      name: 'artists',
      title: 'Presenting',
      type: 'array',
      group: 'artists',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'artist' }] })],
      description: 'Artists shown at the booth. Each needs an artist document.',
    }),
    defineField({
      name: 'artistsText',
      title: 'Presenting (free text)',
      type: 'localeString',
      group: 'artists',
      description: 'Used instead of the list above when the artists have no documents of their own.',
    }),
    defineField({
      name: 'artistsNote',
      title: 'About the presentation',
      type: 'localeBlock',
      group: 'artists',
      description: 'The paragraph next to the artist names, about what the booth shows.',
    }),

    /* --- images ----------------------------------------------------------- */
    defineField({
      name: 'images',
      title: 'Slideshow',
      type: 'array',
      group: 'media',
      of: [defineArrayMember({ type: 'figure' })],
      options: { layout: 'grid' },
      description: 'First image is the card image. Fill caption, work title and year on each.',
    }),
    defineField({
      name: 'importNote',
      title: 'Import notes',
      type: 'text',
      group: 'media',
      rows: 4,
      readOnly: true,
      description: 'Image captions from the old site, left here by the import script so the images can be re-uploaded with their captions.',
    }),
    defineField({ name: 'seo', title: 'SEO', type: 'seo', group: 'meta' }),
  ],
  orderings: [
    { title: 'Name', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] },
    { title: 'Booth', name: 'boothAsc', by: [{ field: 'booth', direction: 'asc' }] },
  ],
  preview: {
    select: {
      title: 'name',
      booth: 'booth',
      country: 'countryCode',
      year: 'edition.year',
      kind: 'kind',
      solo: 'soloShow',
      media: 'images.0',
    },
    prepare: ({ title, booth, country, year, kind, solo, media }) => ({
      title,
      subtitle: [
        booth,
        country,
        year,
        kind && kind !== 'gallery' ? kind : null,
        solo ? 'solo show' : null,
      ]
        .filter(Boolean)
        .join(' · '),
      media,
    }),
  },
});
