/**
 * The closed value lists shared by the Sanity schemas and the admin panel.
 *
 * They live here rather than in the schema files because the admin panel runs
 * in a Cloudflare Worker: importing a constant out of a schema module would
 * pull `sanity` - the whole Studio SDK - into the Worker bundle. This module
 * imports nothing, so both sides can read the same list and the two cannot
 * drift.
 */

export const EXHIBITOR_KINDS = [
  { title: 'Gallery', value: 'gallery' },
  { title: 'Publisher', value: 'publisher' },
  { title: 'Jury prize solo show', value: 'jury-prize' },
  { title: 'Tribute / special presentation', value: 'tribute' },
] as const;

export const PARTNER_TIERS = [
  { title: 'Main partner', value: 'main' },
  { title: 'Institution', value: 'institutional' },
  { title: 'Hotel', value: 'hotel' },
  { title: 'Event partner', value: 'event' },
  { title: 'Media', value: 'media' },
  { title: 'Exhibition pass', value: 'exhibition-pass' },
  { title: 'Art prize partner', value: 'art-prize' },
  { title: 'Food & drinks', value: 'food-drinks' },
  { title: 'Supplier', value: 'supplier' },
] as const;

export const EVENT_KINDS = [
  { title: 'Artist talk', value: 'artist-talk' },
  { title: 'Roundtable', value: 'roundtable' },
  { title: 'Talk', value: 'talk' },
  { title: 'Book launch', value: 'book-launch' },
  { title: 'Guided tour', value: 'tour' },
  { title: 'Workshop', value: 'workshop' },
  { title: 'Award ceremony', value: 'ceremony' },
  { title: 'Preview / vernissage', value: 'opening' },
  { title: 'Other', value: 'other' },
] as const;

export const PROGRAMME_SECTIONS = [
  { title: 'Talks', value: 'talks' },
  { title: 'Awards', value: 'awards' },
  { title: 'VIP programme', value: 'vip' },
  { title: 'Partner project', value: 'project' },
] as const;

export const NEWS_CATEGORIES = [
  { title: 'Announcement', value: 'announcement' },
  { title: 'Programme', value: 'programme' },
  { title: 'Recap', value: 'recap' },
  { title: 'Press release', value: 'press-release' },
] as const;

export type Option = { readonly title: string; readonly value: string };
