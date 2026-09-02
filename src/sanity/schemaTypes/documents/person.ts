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
      name: 'edition',
      title: 'Edition',
      type: 'reference',
      to: [{ type: 'edition' }],
      description: 'For jury and team: the year this entry applies to. Leave empty for the advisory board.',
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'localeString',
      description: 'The bold line under the name: "Director of Keramis", "co-director".',
    }),
    countryCodeField(),
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
    select: { title: 'name', role: 'role.en', groups: 'groups', year: 'edition.year', media: 'portrait' },
    prepare: ({ title, role, groups, year, media }) => ({
      title,
      subtitle: [(groups ?? []).join(', '), year, role].filter(Boolean).join(' · '),
      media,
    }),
  },
});
