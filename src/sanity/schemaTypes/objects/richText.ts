import { defineArrayMember, defineField } from 'sanity';
import { DocumentIcon } from '@sanity/icons/Document';
import { LINKABLE_TYPES } from './link';
import { SiteLinkInput } from '../../components/SiteLinkInput';
import {
  HighlightIcon,
  MutedIcon,
  InverseIcon,
  HighlightDecorator,
  MutedDecorator,
  InverseDecorator,
  LeadStyle,
  SmallStyle,
} from '../../components/richTextMarks';

/**
 * The one rich-text configuration, shared by every localeBlock field.
 *
 * The rule this follows: an editor picks a *role*, never a value. There is no
 * font-size box and no colour picker, so text cannot leave the type scale or
 * the palette - "Lead" and "Highlight" mean whatever src/components/
 * PortableText.astro says they mean, and the design owns that.
 *
 * The style list is deliberately shorter than Sanity's default. H1 belongs to
 * the page title, and H5/H6 had no rendering - they silently came out as
 * paragraphs. Every block in the dataset is `normal`, so trimming the list
 * orphans nothing.
 *
 * Two kinds of link, because they fail differently. An address typed into the
 * URL box is frozen: `https://ceramic.brussels/en/art-prize#laureates-2`, the
 * shape the old site's text came in with, opens the live site from a staging
 * page, keeps its English in a French text and goes on pointing at an anchor
 * no page has any more. "Link to this site" stores what it points at instead
 * - a section and tab, or a document - and src/lib/links.ts turns that into a
 * relative path in the page's own language when the page is built, so it
 * follows a renamed slug or a moved tab.
 *
 * `link` is Sanity's own default annotation, repeated field for field: naming
 * any annotation here drops the default, and the text in the dataset carries
 * some 1,600 `link` marks that must keep opening. The inline object is not the
 * project's `link` object type (the route/document/URL picker for pill
 * buttons) - an annotation is its own type, which is how the default already
 * lived beside it.
 */
export const richTextBlock = defineArrayMember({
  type: 'block',

  styles: [
    { title: 'Normal', value: 'normal' },
    { title: 'Lead', value: 'lead', component: LeadStyle },
    { title: 'Small', value: 'small', component: SmallStyle },
    { title: 'Heading', value: 'h2' },
    { title: 'Subheading', value: 'h3' },
    { title: 'Minor heading', value: 'h4' },
    { title: 'Quote', value: 'blockquote' },
  ],

  lists: [
    { title: 'Bulleted', value: 'bullet' },
    { title: 'Numbered', value: 'number' },
  ],

  marks: {
    decorators: [
      { title: 'Bold', value: 'strong' },
      { title: 'Italic', value: 'em' },
      { title: 'Underline', value: 'underline' },
      { title: 'Strike', value: 'strike-through' },
      { title: 'Code', value: 'code' },
      { title: 'Highlight', value: 'highlight', icon: HighlightIcon, component: HighlightDecorator },
      { title: 'Muted', value: 'muted', icon: MutedIcon, component: MutedDecorator },
      { title: 'Inverse', value: 'inverse', icon: InverseIcon, component: InverseDecorator },
    ],
    annotations: [
      {
        type: 'object',
        name: 'internalLink',
        title: 'Link to this site',
        icon: DocumentIcon,
        options: { modal: { type: 'dialog', width: 1 } },
        // One search box over every page the site builds and every document
        // with a page, which also takes a typed path (SiteLinkInput.tsx).
        components: { input: SiteLinkInput },
        fields: [
          // Picked from the list or typed: "art-prize/laureates", "exhibitors/2025",
          // "/fr/a-propos/equipe". links.ts `sitePath` puts it in the page's language.
          defineField({ name: 'path', title: 'Page', type: 'string' }),
          // A document stays a reference, so the link follows a renamed slug.
          defineField({
            name: 'internal',
            title: 'Document',
            type: 'reference',
            to: LINKABLE_TYPES.map((type) => ({ type })),
          }),
        ],
        validation: (Rule) =>
          Rule.custom((value: any) =>
            value?.internal?._ref || value?.path?.trim() ? true : 'Pick a page or a document, or type a path.',
          ),
      },
      {
        type: 'object',
        name: 'link',
        title: 'External link',
        options: { modal: { type: 'popover' } },
        fields: [
          {
            name: 'href',
            type: 'url',
            title: 'Link',
            description: 'A web, email or phone address. For a page of this site use "Link to this site".',
            validation: (Rule) =>
              Rule.uri({ scheme: ['http', 'https', 'tel', 'mailto'], allowRelative: true }),
          },
        ],
      },
    ],
  },
});
