import type { Template } from 'sanity';
import { PAGE_SECTIONS } from './schemaTypes/objects/routes';
import { EXHIBITOR_KINDS } from '../lib/options';

/**
 * Starting points offered in the Studio's Create menu.
 *
 * A `page` is a shape rather than a thing: the same document type is a hub
 * tab, a plain text page, or a sectioned one, and which it is depends on
 * fields buried in the Placement tab. An editor creating one from scratch has
 * to know that. A template sets those fields up front, so the choice happens
 * once, by name, at the moment of creating.
 *
 * These only seed the placement and a small starter stack. The layouts
 * themselves - which blocks, in which order - are `pageTemplate` documents
 * the team maintains in the Studio and applies from the page's menu, so a
 * new layout never needs a deploy. See TemplateActions.tsx.
 *
 * Localised fields take the plain `{ en: '…' }` shape; French and Dutch are
 * left empty on purpose, because an empty translation falls back to English
 * and a pre-filled English one masquerading as a translation does not.
 */

/** A titled, empty text block. Headings are prompts - editors rename them. */
const text = (key: string, heading: string, layout: 'full' | 'single' | 'half' = 'full') => ({
  _key: key,
  _type: 'contentSection',
  heading: { en: heading },
  layout,
});

/** The three-part shape most text pages in the design use. */
const STARTER_SECTIONS = [text('s1', 'Introduction'), text('s2', 'Details'), text('s3', 'Practical information')];

/**
 * One per hub, so "new tab of the art prize" is a single click that lands in
 * the right place. Without it an editor has to know that `section` is what
 * makes a page a tab, and pick the right value from a list of seven.
 */
const hubTabTemplates: Template[] = PAGE_SECTIONS.map((hub) => ({
  id: `page-hub-${hub.value}`,
  title: `${hub.title} — new tab`,
  description: `A page that appears as a pill tab under ${hub.title}. Apply a template from its menu to change the layout.`,
  schemaType: 'page',
  value: {
    section: hub.value,
    order: 100,
    sections: STARTER_SECTIONS,
  },
}));

const pageTemplates: Template[] = [
  {
    id: 'page-text',
    title: 'Standalone page — plain text',
    description: 'A page of its own, outside every hub: legal text, an open call, a notice.',
    schemaType: 'page',
    // No `section`, which is what makes it standalone. `order` only matters if
    // it is later given a navigation label.
    value: { order: 100, sections: [text('s1', 'Introduction', 'single')] },
  },
  {
    id: 'page-sections',
    title: 'Standalone page — sections and closing images',
    description: 'The usual editorial shape: a lead paragraph, titled sections, a row of photos.',
    schemaType: 'page',
    value: { order: 100, sections: STARTER_SECTIONS },
  },
];

/**
 * Exhibitors differ mainly by `kind`, which drives the badges and the grouping
 * on the exhibitors page. Naming the kinds in the Create menu saves picking a
 * radio button whose consequences are not obvious.
 *
 * `edition` is deliberately not preset. It is required, and pointing every new
 * exhibitor at whatever is current today would quietly file next year's
 * galleries under this year's fair.
 */
const exhibitorTemplates: Template[] = EXHIBITOR_KINDS.map((kind) => ({
  id: `exhibitor-${kind.value}`,
  title: `Exhibitor — ${kind.title.toLowerCase()}`,
  description: 'Remember to set the edition; it decides which fair this belongs to.',
  schemaType: 'exhibitor',
  value: {
    kind: kind.value,
    // The jury prize is a solo show by definition; the badge should not have to
    // be remembered separately.
    ...(kind.value === 'jury-prize' ? { soloShow: true } : {}),
  },
}));

export const templates: Template[] = [...hubTabTemplates, ...pageTemplates, ...exhibitorTemplates];
