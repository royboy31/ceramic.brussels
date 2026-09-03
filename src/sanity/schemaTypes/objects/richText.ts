import { defineArrayMember } from 'sanity';
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
 * `marks.annotations` is intentionally not set. Leaving it out keeps Sanity's
 * built-in link annotation; naming one here would collide with the project's
 * own `link` object type, which is a different thing (a route/document/URL
 * picker for pill buttons, not an inline anchor).
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
  },
});
