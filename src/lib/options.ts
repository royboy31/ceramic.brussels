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
  // Felicie's three filters on the institutions tab (2026-10-06): the
  // institutional tier split in two, with the exhibition pass beside it.
  { title: 'Organization', value: 'organization' },
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
  { title: 'VIP programme (VIP hub, behind the code)', value: 'vip' },
  { title: 'La Cambre (partner project)', value: 'project' },
  // The talks a past edition's country focus co-curated, shown on that
  // edition's focus tab and nowhere on the current programme (#35).
  { title: 'Country focus (previous editions)', value: 'focus' },
] as const;

/** Where a VIP programme event happens: the filter pills on the VIP programme tab. Labels in STRINGS as `vip.venue.<value>`. */
export const EVENT_VENUES = [
  { title: 'On-site (at the fair)', value: 'on-site' },
  { title: 'Off-site (in town)', value: 'off-site' },
] as const;

export const NEWS_CATEGORIES = [
  { title: 'Announcement', value: 'announcement' },
  { title: 'Programme', value: 'programme' },
  { title: 'Recap', value: 'recap' },
  { title: 'Press release', value: 'press-release' },
] as const;

/**
 * The headings the visitors-info FAQ groups its questions under, and the
 * filter pills above them (client mock-up of 2026-09-15). Labels are in
 * STRINGS as `faq.category.<value>`; the Studio shows these English titles.
 * Tiphaine, 2026-09-24: "Coming to the fair" is "Visiting the fair" (same
 * value, so no question moves), "Advisory board" went (no question used
 * it), "Programme & Artworks" came in.
 */
export const FAQ_CATEGORIES = [
  { title: 'Tickets', value: 'tickets' },
  { title: 'Visiting the fair', value: 'visiting' },
  { title: 'Food & drinks', value: 'food-drinks' },
  { title: 'Programme & Artworks', value: 'programme-artworks' },
  { title: 'Media', value: 'media' },
  { title: 'Other', value: 'other' },
] as const;

export type Option = { readonly title: string; readonly value: string };
