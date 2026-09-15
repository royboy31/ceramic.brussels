import type { Template } from 'sanity';
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

/*
 * There are no "new tab" templates. A hub's tabs are fixed in code
 * (src/lib/hubs.ts) and only those get a route, so a page made as an extra
 * tab showed a pill that led to a 404. Every built-in tab already has its
 * page, reached from its hub's folder in the sidebar.
 */

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

/**
 * The document behind a main page, made by its section folder in the sidebar
 * the first time a section has none: structure.ts passes the section and the
 * slug that makes the page the hub root, or the listing page. Parameterised,
 * so it never shows in the Create menu.
 *
 * It starts with no blocks. Starter blocks ("Introduction", "Details"…) were
 * headings with no text, and publishing the page as it opened put three empty
 * headings on the live exhibitors page (2026-09-11).
 */
const mainPageTemplate: Template = {
  id: 'page-main',
  title: 'Main page',
  schemaType: 'page',
  parameters: [
    { name: 'section', type: 'string' },
    { name: 'slug', type: 'string' },
    { name: 'title', type: 'string' },
  ],
  value: ({ section, slug, title }: { section: string; slug: string; title: string }) => ({
    section,
    order: 0,
    title: { en: title },
    slug: { en: { _type: 'slug', current: slug } },
  }),
};

export const templates: Template[] = [...pageTemplates, ...exhibitorTemplates, mainPageTemplate];
