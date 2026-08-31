import { defineField, defineType } from 'sanity';

/** Singleton. Pinned at the top of the Studio - never listed, never duplicated. */
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({
      name: 'siteName',
      title: 'Site name',
      type: 'string',
      initialValue: 'Ceramic Brussels',
    }),
    defineField({ name: 'tagline', title: 'Tagline', type: 'localeString' }),
    defineField({ name: 'defaultSeo', title: 'Default SEO', type: 'seo' }),
    defineField({ name: 'newsletterUrl', title: 'Newsletter signup URL', type: 'url' }),
    defineField({ name: 'instagramUrl', title: 'Instagram URL', type: 'url' }),
    defineField({ name: 'contactEmail', title: 'Contact email', type: 'string' }),
    defineField({
      name: 'practicalInfo',
      title: 'Practical information',
      type: 'object',
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({ name: 'address', title: 'Address', type: 'text', rows: 3 }),
        defineField({ name: 'openingHours', title: 'Opening hours', type: 'localeText' }),
        defineField({ name: 'transport', title: 'Getting there', type: 'localeText' }),
        defineField({ name: 'accessibility', title: 'Accessibility', type: 'localeText' }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Site settings' }),
  },
});
