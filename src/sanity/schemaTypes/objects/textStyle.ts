import { defineField, defineType } from 'sanity';
import {
  ALIGNMENTS,
  COLOURS,
  SIZES,
  SPACING,
  TRANSFORMS,
  WEIGHTS,
} from '../../../lib/textStyle';

/**
 * The Style tab that sits beside the content of every localised field.
 *
 * Editors pick tokens; the "Advanced" group underneath takes a literal value
 * for the cases a token cannot express. The token is what should normally be
 * used - it stores a name rather than a measurement, so the type scale and the
 * palette can be retuned later without touching content. A literal is baked
 * into the document and will survive a rebrand whether or not you want it to.
 *
 * Every value here is optional and every field renders unstyled when nothing
 * is set, so adding this to a type changes no existing document.
 */
export const textStyle = defineType({
  name: 'textStyle',
  title: 'Style',
  type: 'object',
  options: { collapsible: false },
  groups: [
    { name: 'type', title: 'Type', default: true },
    { name: 'colour', title: 'Colour' },
    { name: 'layout', title: 'Layout' },
    { name: 'advanced', title: 'Advanced' },
  ],
  fields: [
    defineField({
      name: 'size',
      title: 'Size',
      type: 'string',
      group: 'type',
      options: { list: [...SIZES] },
    }),
    defineField({
      name: 'weight',
      title: 'Weight',
      type: 'string',
      group: 'type',
      options: { list: [...WEIGHTS], layout: 'radio', direction: 'horizontal' },
    }),
    defineField({
      name: 'transform',
      title: 'Capitalisation',
      type: 'string',
      group: 'type',
      options: { list: [...TRANSFORMS] },
    }),
    defineField({ name: 'italic', title: 'Italic', type: 'boolean', group: 'type' }),
    defineField({ name: 'underline', title: 'Underline', type: 'boolean', group: 'type' }),

    defineField({
      name: 'colour',
      title: 'Text colour',
      type: 'string',
      group: 'colour',
      options: { list: [...COLOURS] },
    }),
    defineField({
      name: 'background',
      title: 'Background',
      type: 'string',
      group: 'colour',
      options: { list: [...COLOURS] },
      description: 'Adds padding around the text automatically.',
    }),

    defineField({
      name: 'align',
      title: 'Alignment',
      type: 'string',
      group: 'layout',
      options: { list: [...ALIGNMENTS], layout: 'radio', direction: 'horizontal' },
    }),
    defineField({
      name: 'marginTop',
      title: 'Space above',
      type: 'string',
      group: 'layout',
      options: { list: [...SPACING] },
    }),
    defineField({
      name: 'marginBottom',
      title: 'Space below',
      type: 'string',
      group: 'layout',
      options: { list: [...SPACING] },
    }),

    defineField({
      name: 'customSize',
      title: 'Exact size',
      type: 'string',
      group: 'advanced',
      description: 'Overrides Size. Any CSS length, e.g. 2.5rem, 42px, clamp(2rem, 5vw, 4rem).',
    }),
    defineField({
      name: 'customColour',
      title: 'Exact text colour',
      type: 'string',
      group: 'advanced',
      description: 'Overrides Text colour. A hex or rgb() value, e.g. #b3261e.',
    }),
    defineField({
      name: 'customBackground',
      title: 'Exact background',
      type: 'string',
      group: 'advanced',
      description: 'Overrides Background.',
    }),
    defineField({
      name: 'lineHeight',
      title: 'Line height',
      type: 'string',
      group: 'advanced',
      description: 'A number such as 1.2, or a length.',
    }),
    defineField({
      name: 'letterSpacing',
      title: 'Letter spacing',
      type: 'string',
      group: 'advanced',
      description: 'A length such as 0.02em or -0.5px.',
    }),
  ],
});
