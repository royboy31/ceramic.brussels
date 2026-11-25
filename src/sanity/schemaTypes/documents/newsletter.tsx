import { defineArrayMember, defineField, defineType } from 'sanity';
import { EnvelopeIcon } from '@sanity/icons/Envelope';
import { HighlightIcon, HighlightDecorator } from '../../components/richTextMarks';
import { THEME_OPTIONS, TEXT_COLOURS } from '../../../newsletter/themes';

/**
 * Newsletters (Roy, 2026-11-25: "start working on newsletter cms in Sanity").
 *
 * One document is one campaign in one language: its theme (the four looks
 * Lilanga built from Félicie's Mailchimp campaigns), its subject and preview
 * text, and a stack of sections. The Studio shows it as the email will look,
 * at desktop and phone width, and sends it through Mailchimp from the same
 * pane (src/sanity/components/NewsletterPane.tsx →
 * src/server/routes/newsletter-mailchimp.ts). src/newsletter/render.ts turns
 * it into the HTML; nothing here is read by the website.
 *
 * The styling controls are fixed choices (yellow background, yellow
 * underline, a few named colours, a few sizes), never free values, so a
 * newsletter cannot drift off the design. Like everything in this dataset a
 * saved newsletter is readable through the public API before it is sent.
 */

/* ----------------------------------------------------------- rich text */

const YellowUnderlineIcon = () => (
  <span style={{ textDecoration: 'underline', textDecorationColor: '#ffee00', textDecorationThickness: 3, fontWeight: 700 }}>U</span>
);
const YellowUnderline = (props: { children?: React.ReactNode }) => (
  <span style={{ textDecoration: 'underline', textDecorationColor: '#ffee00', textDecorationThickness: 3, textUnderlineOffset: 3 }}>{props.children}</span>
);

export const nlRichText = defineType({
  name: 'nlRichText',
  title: 'Text',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        { title: 'Normal', value: 'normal' },
        { title: 'Large', value: 'big' },
        { title: 'Small', value: 'small' },
        { title: 'Italic paragraph', value: 'italic' },
        { title: 'Drop capital (large first letter)', value: 'dropcap' },
      ],
      lists: [{ title: 'Bullets', value: 'bullet' }],
      marks: {
        decorators: [
          { title: 'Bold', value: 'strong' },
          { title: 'Italic', value: 'em' },
          { title: 'Yellow background', value: 'highlight', icon: HighlightIcon, component: HighlightDecorator },
          { title: 'Yellow underline', value: 'yellowUnderline', icon: YellowUnderlineIcon, component: YellowUnderline },
        ],
        annotations: [
          {
            name: 'link',
            title: 'Link',
            type: 'object',
            fields: [
              defineField({
                name: 'href',
                title: 'Address',
                type: 'url',
                validation: (rule) => rule.uri({ scheme: ['http', 'https', 'mailto'] }),
              }),
            ],
          },
          {
            name: 'textColour',
            title: 'Text colour',
            type: 'object',
            fields: [
              defineField({
                name: 'colour',
                title: 'Colour',
                type: 'string',
                options: { list: Object.entries(TEXT_COLOURS).map(([value, c]) => ({ value, title: c.title })), layout: 'radio' },
              }),
            ],
          },
          {
            name: 'textSize',
            title: 'Text size',
            type: 'object',
            fields: [
              defineField({
                name: 'size',
                title: 'Size',
                type: 'number',
                options: {
                  list: [
                    { title: 'Small (12)', value: 12 },
                    { title: 'Medium (18)', value: 18 },
                    { title: 'Large (24)', value: 24 },
                    { title: 'Very large (32)', value: 32 },
                    { title: 'Huge (40)', value: 40 },
                  ],
                  layout: 'radio',
                },
              }),
            ],
          },
        ],
      },
    }),
  ],
});

/* ------------------------------------------------------- column items */

const plain = (name: string, title: string, field: { title: string; rows?: number; description?: string }) =>
  defineType({
    name,
    title,
    type: 'object',
    fields: [
      defineField({ name: 'text', title: field.title, type: field.rows ? 'text' : 'string', rows: field.rows, description: field.description }),
    ],
    preview: { select: { title: 'text' }, prepare: ({ title }: { title?: string }) => ({ title: title || '(empty)', subtitle: title ? field.title : undefined }) },
  } as any);

export const nlLabel = plain('nlLabel', 'Label bar', { title: 'Label', description: 'The bar over a column: "your exclusive VIP access", "agenda"…' });
export const nlSubtitle = defineType({
  name: 'nlSubtitle',
  title: 'Subtitle',
  type: 'object',
  fields: [
    defineField({ name: 'text', title: 'Subtitle', type: 'string' }),
    defineField({ name: 'upright', title: 'Upright capitals instead of italic', type: 'boolean', initialValue: false }),
    defineField({ name: 'dot', title: 'End with a dot (●)', type: 'boolean', initialValue: true }),
  ],
  preview: { select: { title: 'text' }, prepare: ({ title }) => ({ title: title || '(empty)', subtitle: 'Subtitle' }) },
});
export const nlHeadline = defineType({
  name: 'nlHeadline',
  title: 'Headline',
  type: 'object',
  fields: [
    defineField({ name: 'text', title: 'Headline', type: 'text', rows: 3 }),
    defineField({
      name: 'size',
      title: 'Size',
      type: 'number',
      options: { list: [18, 22, 26, 32, 40].map((v) => ({ title: `${v}`, value: v })), layout: 'radio', direction: 'horizontal' },
      description: 'Leave empty for the theme’s size.',
    }),
  ],
  preview: { select: { title: 'text' }, prepare: ({ title }) => ({ title: title || '(empty)', subtitle: 'Headline' }) },
});
export const nlText = defineType({
  name: 'nlText',
  title: 'Text',
  type: 'object',
  fields: [defineField({ name: 'body', title: 'Text', type: 'nlRichText' })],
  preview: {
    select: { body: 'body' },
    prepare: ({ body }) => ({
      title: (body ?? []).map((b: any) => (b.children ?? []).map((c: any) => c.text).join('')).join(' ').slice(0, 80) || '(empty)',
      subtitle: 'Text',
    }),
  },
});

const buttonFields = [
  defineField({ name: 'label', title: 'Text', type: 'text', rows: 3, description: 'Line breaks are kept: "book your / Discovery Tour / → here ←".' }),
  defineField({ name: 'url', title: 'Link', type: 'url', validation: (rule) => rule.uri({ scheme: ['http', 'https', 'mailto'] }) }),
  defineField({
    name: 'style',
    title: 'Look',
    type: 'string',
    options: { list: [{ title: 'Oval, filled', value: 'oval' }, { title: 'Outlined', value: 'outline' }], layout: 'radio', direction: 'horizontal' },
    initialValue: 'oval',
  }),
];

export const nlButton = defineType({
  name: 'nlButton',
  title: 'Button',
  type: 'object',
  fields: [
    ...buttonFields,
    defineField({
      name: 'align',
      title: 'Position',
      type: 'string',
      options: { list: [{ title: 'Centre', value: 'center' }, { title: 'Left', value: 'left' }], layout: 'radio', direction: 'horizontal' },
      initialValue: 'center',
    }),
  ],
  preview: { select: { title: 'label', subtitle: 'url' }, prepare: ({ title, subtitle }) => ({ title: (title || '(no text)').replace(/\n/g, ' '), subtitle: `Button · ${subtitle ?? 'no link'}` }) },
});

export const nlImage = defineType({
  name: 'nlImage',
  title: 'Image',
  type: 'object',
  fields: [
    defineField({ name: 'image', title: 'Image', type: 'figure', description: 'Give it alt text: it is what a reader sees with images off.' }),
    defineField({ name: 'url', title: 'Link', type: 'url', validation: (rule) => rule.uri({ scheme: ['http', 'https'] }) }),
    defineField({
      name: 'aspect',
      title: 'Shape',
      type: 'string',
      options: {
        list: [
          { title: 'As uploaded', value: '' },
          { title: 'Landscape 4:3', value: '1.333' },
          { title: 'Wide 16:9', value: '1.778' },
          { title: 'Square', value: '1' },
          { title: 'Portrait 3:4', value: '0.75' },
        ],
      },
    }),
  ],
  preview: { select: { media: 'image', title: 'image.alt' }, prepare: ({ media, title }) => ({ media, title: title || 'Image', subtitle: 'Image' }) },
});

export const nlInfoCard = defineType({
  name: 'nlInfoCard',
  title: 'Info card',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', initialValue: 'Practical info' }),
    defineField({
      name: 'rows',
      title: 'Lines',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'nlInfoRow',
          fields: [
            defineField({ name: 'key', title: 'Name', type: 'string' }),
            defineField({ name: 'value', title: 'Value', type: 'text', rows: 2 }),
          ],
          preview: { select: { title: 'key', subtitle: 'value' } },
        }),
      ],
    }),
    defineField({ name: 'note', title: 'Note at the bottom', type: 'string', description: 'In the dotted oval: "free, upon registration".' }),
  ],
  preview: { select: { title: 'title' }, prepare: ({ title }) => ({ title: title || 'Info card', subtitle: 'Info card' }) },
});

export const nlList = defineType({
  name: 'nlList',
  title: 'List with lines',
  type: 'object',
  fields: [defineField({ name: 'items', title: 'Lines', type: 'array', of: [{ type: 'string' }] })],
  preview: { select: { items: 'items' }, prepare: ({ items }) => ({ title: (items ?? [])[0] ?? '(empty)', subtitle: `List · ${(items ?? []).length} lines` }) },
});

export const nlOffer = defineType({
  name: 'nlOffer',
  title: 'Offer box (dotted)',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', description: '"special rate"' }),
    defineField({ name: 'body', title: 'Text', type: 'nlRichText' }),
    defineField({ name: 'button', title: 'Button', type: 'object', fields: buttonFields }),
  ],
  preview: { select: { title: 'title' }, prepare: ({ title }) => ({ title: title || 'Offer', subtitle: 'Offer box' }) },
});

export const nlVipCode = defineType({
  name: 'nlVipCode',
  title: 'VIP code',
  type: 'object',
  description: 'Each guest sees their own code (Mailchimp merge field *|VIPCODE|*).',
  fields: [defineField({ name: 'label', title: 'Label', type: 'string', initialValue: 'Your VIP code:' })],
  preview: { select: { title: 'label' }, prepare: ({ title }) => ({ title: title || 'Your VIP code:', subtitle: 'VIP code (personal)' }) },
});

export const nlFigures = defineType({
  name: 'nlFigures',
  title: 'Key figures',
  type: 'object',
  fields: [
    defineField({
      name: 'items',
      title: 'Figures',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'nlFigure',
          fields: [
            defineField({ name: 'number', title: 'Number', type: 'string', description: '"65"' }),
            defineField({ name: 'text', title: 'Text', type: 'string', description: '"exhibitors"' }),
          ],
          preview: { select: { title: 'number', subtitle: 'text' } },
        }),
      ],
    }),
  ],
  preview: { select: { items: 'items' }, prepare: ({ items }) => ({ title: (items ?? []).map((f: any) => `${f.number} ${f.text}`).join(', ') || 'Key figures', subtitle: 'Key figures' }) },
});

const ITEM_TYPES = ['nlLabel', 'nlSubtitle', 'nlHeadline', 'nlText', 'nlButton', 'nlImage', 'nlInfoCard', 'nlList', 'nlOffer', 'nlVipCode', 'nlFigures'];

export const nlColumn = defineType({
  name: 'nlColumn',
  title: 'Column',
  type: 'object',
  fields: [defineField({ name: 'items', title: 'Content', type: 'array', of: ITEM_TYPES.map((type) => defineArrayMember({ type })) })],
});

/* ------------------------------------------------------------ sections */

const hidden = defineField({ name: 'hidden', title: 'Hide this section', type: 'boolean', initialValue: false });

const summary = (col: any) =>
  (col?.items ?? [])
    .map((i: any) => i.text ?? i.title ?? i.label ?? (i._type === 'nlImage' ? 'image' : i._type === 'nlVipCode' ? 'VIP code' : ''))
    .filter(Boolean)
    .join(' · ')
    .replace(/\n/g, ' ')
    .slice(0, 60);

export const nlRow = defineType({
  name: 'nlRow',
  title: 'Row (one or two columns)',
  type: 'object',
  fields: [
    defineField({ name: 'left', title: 'Left column (or the whole width when the right one is empty)', type: 'nlColumn' }),
    defineField({ name: 'right', title: 'Right column', type: 'nlColumn', description: 'On a phone it goes under the left one.' }),
    defineField({
      name: 'align',
      title: 'Columns aligned',
      type: 'string',
      options: { list: [{ title: 'At the top', value: 'top' }, { title: 'In the middle', value: 'middle' }], layout: 'radio', direction: 'horizontal' },
      initialValue: 'top',
    }),
    defineField({
      name: 'background',
      title: 'Background',
      type: 'string',
      options: {
        list: [
          { title: 'None', value: '' },
          { title: 'Yellow', value: 'highlight' },
          { title: 'Ochre', value: 'accent' },
          { title: 'Header colour', value: 'header' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
    }),
    hidden,
  ],
  preview: {
    select: { left: 'left', right: 'right', hidden: 'hidden' },
    prepare: ({ left, right, hidden: h }) => ({
      title: [summary(left), summary(right)].filter(Boolean).join('  |  ') || 'Empty row',
      subtitle: `${right?.items?.length ? 'Two columns' : 'Full width'}${h ? ' · hidden' : ''}`,
    }),
  },
});

export const nlHeader = defineType({
  name: 'nlHeader',
  title: 'Title band',
  type: 'object',
  description: 'The big title on the theme’s header colour: "ceramic brussels monthly / November edition".',
  fields: [defineField({ name: 'title', title: 'Title', type: 'text', rows: 2 }), defineField({ name: 'edition', title: 'Second line', type: 'string' }), hidden],
  preview: { select: { title: 'title', subtitle: 'edition' }, prepare: ({ title, subtitle }) => ({ title: title || 'Title band', subtitle: `Title band${subtitle ? ` · ${subtitle}` : ''}` }) },
});

export const nlBanner = defineType({
  name: 'nlBanner',
  title: 'Yellow banner',
  type: 'object',
  fields: [defineField({ name: 'text', title: 'Text', type: 'string' }), defineField({ name: 'url', title: 'Link', type: 'url' }), hidden],
  preview: { select: { title: 'text' }, prepare: ({ title }) => ({ title: title || 'Banner', subtitle: 'Yellow banner' }) },
});

export const nlHero = defineType({
  name: 'nlHero',
  title: 'Top photo with title',
  type: 'object',
  fields: [
    defineField({ name: 'image', title: 'Photo', type: 'figure', description: 'Cut to 660 × 283 around its focus point.' }),
    defineField({ name: 'title', title: 'Title', type: 'text', rows: 2 }),
    defineField({
      name: 'layout',
      title: 'Layout',
      type: 'string',
      options: { list: [{ title: 'Title over the photo, with the logo', value: 'over' }, { title: 'Title under the photo', value: 'under' }], layout: 'radio' },
      initialValue: 'over',
    }),
    defineField({ name: 'url', title: 'Link (title under the photo only)', type: 'url' }),
    hidden,
  ],
  preview: { select: { title: 'title', media: 'image' }, prepare: ({ title, media }) => ({ title: title || 'Top photo', media, subtitle: 'Top photo' }) },
});

export const nlRule = defineType({
  name: 'nlRule',
  title: 'Line',
  type: 'object',
  fields: [hidden],
  preview: { prepare: () => ({ title: '———', subtitle: 'Line between rows' }) },
});

export const nlPartners = defineType({
  name: 'nlPartners',
  title: 'Partner logos',
  type: 'object',
  fields: [
    defineField({
      name: 'logos',
      title: 'Logos (two per line)',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'nlLogo',
          fields: [defineField({ name: 'image', title: 'Logo', type: 'figure' }), defineField({ name: 'url', title: 'Link', type: 'url' })],
          preview: { select: { media: 'image', title: 'image.alt' } },
        }),
      ],
    }),
    hidden,
  ],
  preview: { select: { logos: 'logos' }, prepare: ({ logos }) => ({ title: `${(logos ?? []).length} logos`, subtitle: 'Partner logos' }) },
});

/* ------------------------------------------------------------ document */

export const newsletter = defineType({
  name: 'newsletter',
  title: 'Newsletter',
  type: 'document',
  icon: EnvelopeIcon,
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'settings', title: 'Settings' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Name',
      type: 'string',
      group: 'settings',
      description: 'For you and the Mailchimp campaign list, not shown to readers: "VIP news, November 2026 (EN)".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'theme',
      title: 'Template',
      type: 'string',
      group: ['settings', 'content'],
      options: { list: THEME_OPTIONS, layout: 'radio' },
      initialValue: 'monthly',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'language',
      title: 'Language',
      type: 'string',
      group: 'settings',
      options: { list: [{ title: 'English', value: 'en' }, { title: 'Français', value: 'fr' }, { title: 'Nederlands', value: 'nl' }], layout: 'radio', direction: 'horizontal' },
      initialValue: 'en',
    }),
    defineField({
      name: 'subject',
      title: 'Subject line',
      type: 'string',
      group: ['settings', 'content'],
      validation: (rule) => rule.required().max(150),
    }),
    defineField({
      name: 'previewText',
      title: 'Preview text',
      type: 'string',
      group: ['settings', 'content'],
      description: 'The grey line after the subject in the inbox.',
      validation: (rule) => rule.max(150),
    }),
    defineField({
      name: 'translations',
      title: 'Other languages',
      type: 'object',
      group: 'settings',
      description: 'The web version of this newsletter in the other languages (Mailchimp’s campaign link). Filled ones get a button at the top.',
      options: { collapsible: true, collapsed: true },
      fields: (['en', 'fr', 'nl'] as const).map((l) => defineField({ name: l, title: { en: 'English', fr: 'Français', nl: 'Nederlands' }[l], type: 'url' })),
    }),
    defineField({
      name: 'footer',
      title: 'Footer',
      type: 'string',
      group: 'settings',
      options: { list: [{ title: 'ceramic brussels', value: 'brussels' }, { title: 'ceramic basel', value: 'basel' }], layout: 'radio', direction: 'horizontal' },
      description: 'Leave empty for the template’s own.',
    }),
    defineField({
      name: 'sections',
      title: 'Sections',
      type: 'array',
      group: 'content',
      of: ['nlHeader', 'nlBanner', 'nlHero', 'nlRow', 'nlRule', 'nlPartners'].map((type) => defineArrayMember({ type })),
    }),
    /**
     * Written by the send pane, never typed: the Mailchimp campaign this
     * newsletter is (one per newsletter, updated until sent) and every test
     * and send, with who did it.
     */
    defineField({
      name: 'mailchimp',
      title: 'Mailchimp',
      type: 'object',
      group: 'settings',
      readOnly: true,
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({ name: 'campaignId', title: 'Campaign id', type: 'string' }),
        defineField({ name: 'webId', title: 'Campaign web id', type: 'number' }),
        defineField({ name: 'status', title: 'Status', type: 'string' }),
        defineField({ name: 'archiveUrl', title: 'Web version', type: 'url' }),
        defineField({
          name: 'log',
          title: 'History',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'nlSendLog',
              fields: [
                defineField({ name: 'at', title: 'When', type: 'datetime' }),
                defineField({ name: 'by', title: 'Who', type: 'string' }),
                defineField({ name: 'action', title: 'What', type: 'string' }),
                defineField({ name: 'detail', title: 'Detail', type: 'string' }),
              ],
              preview: { select: { title: 'action', subtitle: 'detail', at: 'at', by: 'by' }, prepare: ({ title, subtitle, at, by }) => ({ title: `${title} · ${by ?? ''}`, subtitle: `${at ? new Date(at).toLocaleString() : ''} ${subtitle ?? ''}` }) },
            }),
          ],
        }),
      ],
    }),
  ],
  orderings: [{ title: 'Newest first', name: 'updatedDesc', by: [{ field: '_updatedAt', direction: 'desc' }] }],
  preview: {
    select: { title: 'title', theme: 'theme', language: 'language', status: 'mailchimp.status', media: 'sections.0.image' },
    prepare: ({ title, theme, language, status }) => ({
      title: title || 'Newsletter',
      subtitle: [theme, (language ?? 'en').toUpperCase(), status === 'sent' ? 'sent' : status ? `Mailchimp: ${status}` : 'not sent'].filter(Boolean).join(' · '),
    }),
  },
});

export const newsletterTypes = [
  nlRichText,
  nlLabel,
  nlSubtitle,
  nlHeadline,
  nlText,
  nlButton,
  nlImage,
  nlInfoCard,
  nlList,
  nlOffer,
  nlVipCode,
  nlFigures,
  nlColumn,
  nlRow,
  nlHeader,
  nlBanner,
  nlHero,
  nlRule,
  nlPartners,
];
