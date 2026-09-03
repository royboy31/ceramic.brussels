import {
  EXHIBITOR_KINDS,
  PARTNER_TIERS,
  EVENT_KINDS,
  PROGRAMME_SECTIONS,
  NEWS_CATEGORIES,
  type Option,
} from '../lib/options';
import { LOCALES } from '../lib/locales';

/**
 * What the admin panel is allowed to write - the security boundary of the
 * whole feature.
 *
 * The panel holds one Sanity write token, which can change anything in the
 * dataset. Nothing outside this file is patchable: a field absent here cannot
 * be set however the request is shaped, so a bug in the UI cannot turn into a
 * dataset-wide rewrite.
 *
 * Deliberately excluded, and why:
 *   slug        changing it breaks live URLs, hreflang and inbound links
 *   references  edition/artist/partner links need the Studio search UI
 *   images      uploads are a different mechanism (Sanity assets)
 *   localeBlock Portable Text - an array of blocks, not something a form edits
 *   seo         nested object; low value here, easy in the Studio
 */

export type FieldKind =
  | 'string'
  | 'text'
  | 'url'
  | 'email'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'select'
  | 'localeString'
  | 'localeText';

export interface EditableField {
  name: string;
  label: string;
  kind: FieldKind;
  options?: readonly Option[];
  help?: string;
  required?: boolean;
  max?: number;
}

export interface EditableType {
  name: string;
  label: string;
  plural: string;
  titleField: string;
  order: string;
  fields: EditableField[];
}

const LOCALE_NOTE =
  'One per language. Leave a translation empty and the site falls back to English.';

export const EDITABLE_TYPES: EditableType[] = [
  {
    name: 'exhibitor',
    label: 'Exhibitor',
    plural: 'Exhibitors',
    titleField: 'name',
    order: 'coalesce(sortName, name) asc',
    fields: [
      { name: 'name', label: 'Name', kind: 'string', required: true, max: 200 },
      {
        name: 'sortName',
        label: 'Sort name',
        kind: 'string',
        help: 'Used for A-Z ordering when the display name starts with The, Galerie and so on.',
        max: 200,
      },
      { name: 'kind', label: 'Type', kind: 'select', options: EXHIBITOR_KINDS, required: true },
      { name: 'booth', label: 'Booth', kind: 'string', max: 20 },
      { name: 'city', label: 'City', kind: 'string', max: 120 },
      { name: 'soloShow', label: 'Solo show', kind: 'boolean' },
      { name: 'inCountryFocus', label: 'In country focus', kind: 'boolean' },
      { name: 'website', label: 'Website', kind: 'url' },
      {
        name: 'instagram',
        label: 'Instagram',
        kind: 'string',
        help: 'Handle without the @.',
        max: 60,
      },
      { name: 'artistsText', label: 'Artists (free text)', kind: 'localeString', help: LOCALE_NOTE },
    ],
  },
  {
    name: 'person',
    label: 'Person',
    plural: 'People',
    titleField: 'name',
    order: 'coalesce(order, 999) asc, name asc',
    fields: [
      { name: 'name', label: 'Name', kind: 'string', required: true, max: 200 },
      { name: 'role', label: 'Role', kind: 'localeString', help: LOCALE_NOTE },
      { name: 'website', label: 'Website', kind: 'url' },
      { name: 'instagram', label: 'Instagram', kind: 'string', max: 60 },
      { name: 'email', label: 'Email', kind: 'email' },
      { name: 'phone', label: 'Phone', kind: 'string', max: 40 },
      { name: 'order', label: 'Order', kind: 'number', help: 'Lower numbers come first.' },
    ],
  },
  {
    name: 'partner',
    label: 'Partner',
    plural: 'Partners',
    titleField: 'name',
    order: 'coalesce(order, 999) asc, name asc',
    fields: [
      { name: 'name', label: 'Name', kind: 'string', required: true, max: 200 },
      { name: 'tier', label: 'Tier', kind: 'select', options: PARTNER_TIERS, required: true },
      { name: 'subtitle', label: 'Subtitle', kind: 'localeString', help: LOCALE_NOTE },
      {
        name: 'currentExhibition',
        label: 'Current exhibition',
        kind: 'localeString',
        help: LOCALE_NOTE,
      },
      { name: 'url', label: 'Website', kind: 'url' },
      { name: 'instagram', label: 'Instagram', kind: 'string', max: 60 },
      { name: 'order', label: 'Order', kind: 'number', help: 'Lower numbers come first.' },
    ],
  },
  {
    name: 'newsItem',
    label: 'News item',
    plural: 'News',
    titleField: 'title.en',
    order: 'publishedAt desc',
    fields: [
      { name: 'title', label: 'Title', kind: 'localeString', required: true, help: LOCALE_NOTE },
      { name: 'publishedAt', label: 'Published', kind: 'datetime' },
      { name: 'category', label: 'Category', kind: 'select', options: NEWS_CATEGORIES },
      { name: 'excerpt', label: 'Excerpt', kind: 'localeText', help: LOCALE_NOTE },
    ],
  },
  {
    name: 'programmeEvent',
    label: 'Programme event',
    plural: 'Programme',
    titleField: 'title.en',
    order: 'startsAt asc',
    fields: [
      { name: 'title', label: 'Title', kind: 'localeString', required: true, help: LOCALE_NOTE },
      {
        name: 'section',
        label: 'Section',
        kind: 'select',
        options: PROGRAMME_SECTIONS,
        required: true,
      },
      { name: 'kind', label: 'Type', kind: 'select', options: EVENT_KINDS },
      { name: 'startsAt', label: 'Starts', kind: 'datetime' },
      { name: 'endsAt', label: 'Ends', kind: 'datetime' },
      { name: 'location', label: 'Location', kind: 'localeString', help: LOCALE_NOTE },
      { name: 'speakersText', label: 'Speakers (free text)', kind: 'localeText', help: LOCALE_NOTE },
      { name: 'moderator', label: 'Moderator', kind: 'string', max: 200 },
      { name: 'invitationOnly', label: 'Invitation only', kind: 'boolean' },
    ],
  },
  {
    name: 'pressClip',
    label: 'Press clip',
    plural: 'Press',
    titleField: 'title',
    order: 'publishedAt desc',
    fields: [
      { name: 'title', label: 'Title', kind: 'string', required: true, max: 300 },
      { name: 'outlet', label: 'Outlet', kind: 'string', max: 200 },
      { name: 'publishedAt', label: 'Published', kind: 'date' },
      { name: 'url', label: 'URL', kind: 'url' },
    ],
  },
];

export const findType = (name: string) => EDITABLE_TYPES.find((t) => t.name === name);

export const findField = (type: EditableType, name: string) =>
  type.fields.find((f) => f.name === name);

/** Every path the panel may read back for one document. */
export function projectionFor(type: EditableType): string {
  const locales = LOCALES.map((l) => l.id).join(', ');
  const parts = ['_id', '_type', '_rev', '_updatedAt'];
  for (const field of type.fields) {
    const localised = field.kind === 'localeString' || field.kind === 'localeText';
    parts.push(localised ? '"' + field.name + '": ' + field.name + '{' + locales + '}' : field.name);
  }
  return '{ ' + parts.join(', ') + ' }';
}
