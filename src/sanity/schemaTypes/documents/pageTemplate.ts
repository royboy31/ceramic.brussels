import { defineField, defineType } from 'sanity';
import { DashboardIcon } from '@sanity/icons/Dashboard';
import { sectionsField } from '../objects/pageBuilder';

/**
 * A ready-made stack of sections an editor can apply to a page.
 *
 * Templates are content, not code, so the team can make as many as they
 * like: build a page the way they want it, choose "Save as template" from
 * its menu, and every page after that can start from it with "Apply
 * template". Applying copies the sections - the page and the template never
 * stay linked, so editing one does not touch the other.
 *
 * `starterFor` decides which Create-menu entries offer it, and `sample` lets
 * a template carry example text so a fresh page shows what goes where.
 */
export const pageTemplate = defineType({
  name: 'pageTemplate',
  title: 'Page template',
  type: 'document',
  icon: DashboardIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
      description: 'How it appears in the template picker, e.g. "Text in two columns with photos".',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      description: 'One line on when to use it.',
    }),
    defineField({
      name: 'appliesTo',
      title: 'Offered for',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Pages and hub tabs', value: 'page' },
          { title: 'Homepage', value: 'homepage' },
          { title: 'Artist profiles', value: 'artist' },
        ],
        layout: 'grid',
      },
      initialValue: ['page'],
      description: 'Where the template picker shows this one. A template made from a page is offered for pages.',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      initialValue: 100,
      description: 'Position in the picker. Lower comes first.',
    }),
    defineField({
      name: 'intro',
      title: 'Lead paragraph',
      type: 'localeText',
      description: 'Optional. Copied into the page’s lead paragraph when the template is applied to an empty one.',
    }),
    sectionsField({
      description: 'The blocks a page made from this template starts with. Fill them with example text so a new page shows what goes where.',
    }),
  ],
  orderings: [{ title: 'Order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
  preview: {
    select: { title: 'title', description: 'description', sections: 'sections', appliesTo: 'appliesTo' },
    prepare: ({ title, description, sections, appliesTo }) => ({
      title: title ?? '(unnamed template)',
      subtitle: [
        `${sections?.length ?? 0} sections`,
        appliesTo?.length ? `for ${appliesTo.join(', ')}` : null,
        description,
      ]
        .filter(Boolean)
        .join('  ·  '),
    }),
  },
});
