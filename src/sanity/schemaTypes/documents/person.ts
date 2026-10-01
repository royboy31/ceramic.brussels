import { defineArrayMember, defineField, defineType } from 'sanity';
import { countryCodeField } from '../objects/country';

/**
 * People who are not artists: the advisory board, the team, art-prize jury
 * members and collaborators. One document per person; `groups` says where
 * they appear and `edition` scopes the year-bound roles (jury, team).
 *
 * The design renders all of them with the same card: name, bold-italic role,
 * portrait, bio, instagram / website pills.
 */
export const PERSON_GROUPS = [
  { title: 'Advisory board', value: 'advisory-board' },
  { title: 'Team', value: 'team' },
  { title: 'Art prize jury', value: 'jury' },
  { title: 'Collaborator', value: 'collaborator' },
] as const;

export const person = defineType({
  name: 'person',
  title: 'Person',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'groups',
      title: 'Appears in',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      options: { list: [...PERSON_GROUPS], layout: 'grid' },
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'editions',
      title: 'Editions',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'edition' }] })],
      description:
        'For jury and team: every year this person served. One person, several years - Jean-Marc Dimanche sits on the 2025 and 2027 juries as one record (#46). Leave empty for the advisory board.',
    }),
    defineField({
      // The single reference `editions` replaced (#46): one year per person
      // meant a returning juror vanished from every year but one. Hidden, not
      // deleted - scripts/migrate-person-editions.mjs moved each value into
      // the array, and the queries still read a straggler (an unmigrated
      // draft) so nothing silently drops.
      name: 'edition',
      title: 'Edition (replaced by Editions)',
      type: 'reference',
      to: [{ type: 'edition' }],
      hidden: true,
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'localeString',
      description: 'The bold line under the name: "Director of Keramis", "co-director".',
    }),
    // Shown after the name on the jury and advisory board cards, exponent
    // style (client feedback, 2026-09-23). Hidden before that; the values
    // were kept, so most members already have one.
    countryCodeField({
      title: 'Nationality (code)',
      description: 'Two letters after the name on the jury and advisory board: BE, FR, NL, GB… Leave empty to show none.',
    }),
    defineField({ name: 'bio', title: 'Biography', type: 'localeBlock' }),
    defineField({ name: 'portrait', title: 'Portrait', type: 'figure' }),
    defineField({ name: 'website', title: 'Website', type: 'url' }),
    defineField({ name: 'instagram', title: 'Instagram handle', type: 'string', description: 'Without the @' }),
    defineField({ name: 'email', title: 'Email', type: 'string', description: 'Team only. Shown publicly.' }),
    defineField({ name: 'phone', title: 'Phone', type: 'string', description: 'Team only. Shown publicly.' }),
    defineField({ name: 'order', title: 'Order', type: 'number', initialValue: 100 }),
  ],
  orderings: [
    { title: 'Order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
    { title: 'Name', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] },
  ],
  preview: {
    select: {
      title: 'name', role: 'role.en', groups: 'groups', media: 'portrait',
      // Previews cannot map an array, so the first four years are picked
      // by index - nobody has served more, and a fifth would only fall
      // off the subtitle, not the site.
      y0: 'editions.0.year', y1: 'editions.1.year', y2: 'editions.2.year', y3: 'editions.3.year',
      year: 'edition.year',
    },
    prepare: ({ title, role, groups, year, media, y0, y1, y2, y3 }) => ({
      title,
      subtitle: [(groups ?? []).join(', '), [y0, y1, y2, y3, year].filter(Boolean).join('/'), role]
        .filter(Boolean)
        .join(' · '),
      media,
    }),
  },
});
