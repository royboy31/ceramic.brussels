import { sanityClient } from 'sanity:client';
import type { LocaleId } from './locales';
import { DEFAULT_LOCALE } from './locales';

/**
 * All GROQ lives here so the pages stay readable and every query resolves
 * localised fields the same way: ask for the requested language, fall back to
 * English rather than rendering an empty string.
 *
 * Shapes are documented next to each helper. A field a page needs that is not
 * returned here has to be added here - never by querying from a page.
 */

const localised = (field: string) => `coalesce(${field}[$lang], ${field}.${DEFAULT_LOCALE})`;

/**
 * A localised field together with the Style tab an editor set on it, as two
 * keys: `name` holds the text as before, `nameStyle` the styling or null.
 *
 * Emitting a second key rather than changing the shape of the first is what
 * keeps this additive - every component that already reads `title` keeps
 * working untouched, and only the ones that opt in to `titleStyle` render it.
 */
const styled = (name: string, field: string = name) =>
  `"${name}": ${localised(field)}, "${name}Style": ${field}.style`;

/** Image with everything SanityImage.astro needs, plus the caption parts. */
const IMAGE = `{
  ...,
  alt,
  caption,
  workTitle,
  year,
  credit,
  "lqip": asset->metadata.lqip,
  "dimensions": asset->metadata.dimensions
}`;

const SEO = `{
  ${styled('title', 'seo.title')},
  ${styled('description', 'seo.description')},
  "noIndex": seo.noIndex,
  "ogImage": seo.ogImage ${IMAGE}
}`;

/** A `link` object resolved to something a template can render directly. */
const LINK = `{
  kind,
  route,
  anchor,
  ${styled('label')},
  "external": external,
  "internal": internal->{
    _type,
    "slug": coalesce(slug.current, slug[$lang].current, slug.${DEFAULT_LOCALE}.current)
  }
}`;

const VIDEO = `{
  url,
  ${styled('title')},
  poster ${IMAGE}
}`;

const SECTION = `{
  _key,
  anchor,
  ${styled('heading')},
  ${styled('body')},
  "images": images[] ${IMAGE},
  "links": links[] ${LINK}
}`;

const KEY_FIGURES = `keyFigures[]{ _key, value, ${styled('label')} }`;

export type Params = { lang: LocaleId; [key: string]: unknown };

function run<T>(query: string, params: Params): Promise<T> {
  return sanityClient.fetch<T>(query, params);
}

/* ------------------------------------------------------------------ site */

export function getSettings(lang: LocaleId) {
  return run<any>(
    `*[_type == "siteSettings"][0]{
      siteName,
      copyright,
      ${styled('tagline')},
      contactEmail,
      newsletterUrl,
      instagramUrl,
      linkedinUrl,
      facebookUrl,
      youtubeUrl,
      applicationsUrl,
      pressEmail,
      pressKitUrl,
      "pressContacts": pressContacts[]{ _key, name, email, url, instagram, ${styled('region')} },
      "faq": faq[]{ _key, ${styled('question')}, ${styled('answer')} },
      "practicalInfo": {
        "venueName": practicalInfo.venueName,
        "address": practicalInfo.address,
        "mapUrl": practicalInfo.mapUrl,
        ${styled('intro', 'practicalInfo.intro')},
        "heroImage": practicalInfo.heroImage ${IMAGE},
        "access": practicalInfo.access[]{ _key, ${styled('mode')}, ${styled('text')} },
        ${styled('accessibility', 'practicalInfo.accessibility')},
        "hotelDeal": {
          ${styled('text', 'practicalInfo.hotelDeal.text')},
          "url": practicalInfo.hotelDeal.url,
          "partner": practicalInfo.hotelDeal.partner->{ _id, name, url, logo ${IMAGE}, "images": images[] ${IMAGE} }
        },
        "images": practicalInfo.images[] ${IMAGE}
      },
      "defaultSeo": ${SEO.replace(/seo\./g, 'defaultSeo.')}
    }`,
    { lang },
  );
}

/**
 * Pages that opted into the fallback menu, ordered. Standalone pages only -
 * hub tabs are reached through their hub.
 */
export function getNavPages(lang: LocaleId) {
  return run<any[]>(
    `*[_type == "page" && !defined(section) && (defined(navLabel[$lang]) || defined(navLabel.${DEFAULT_LOCALE}))]
      | order(order asc){
      ${styled('label', 'navLabel')},
      "slug": coalesce(slug[$lang].current, slug.${DEFAULT_LOCALE}.current)
    }[defined(slug)]`,
    { lang },
  );
}

const NAV_TARGET = `
  kind,
  route,
  anchor,
  url,
  ${styled('label')},
  "pageSlug": coalesce(page->slug[$lang].current, page->slug.${DEFAULT_LOCALE}.current)
`;

const NAV_ITEMS = `{
  _key,
  ${NAV_TARGET},
  "children": children[]{ _key, ${NAV_TARGET} }
}`;

/**
 * Editor-controlled menu. Returns null when no navigation document exists or it
 * has no items, so the layout can fall back to a built-in menu rather than
 * rendering nothing. Each item may carry `children` - the small sub-items in
 * the menu overlay.
 */
export function getNavigation(lang: LocaleId) {
  return run<{ items: any[]; footerItems: any[] } | null>(
    `*[_type == "navigation"][0]{
      "items": items[] ${NAV_ITEMS},
      "footerItems": footerItems[] ${NAV_ITEMS}
    }`,
    { lang },
  );
}

/* -------------------------------------------------------------- homepage */

/**
 * The curated homepage. Key figures and the film come from the current
 * edition; everything else is picked by an editor on the homepage document.
 */
export function getHomepage(lang: LocaleId) {
  return run<any>(
    `*[_type == "homepage"][0]{
      _id, _type,
      heroImage ${IMAGE},
      ${styled('heroText')},
      "heroLink": heroLink ${LINK},
      "quickLinks": quickLinks[] ${LINK},
      "spotlights": spotlights[]{
        _key,
        ${styled('kicker')},
        ${styled('headline')},
        "link": link ${LINK},
        image ${IMAGE}
      },
      "banner": {
        ${styled('text', 'banner.text')},
        "link": banner.link ${LINK},
        "image": banner.image ${IMAGE}
      },
      "video": coalesce(video ${VIDEO}, *[_type == "edition" && isCurrent == true][0].film ${VIDEO}),
      figuresImage ${IMAGE},
      "figuresLink": figuresLink ${LINK},
      "closingBanner": {
        ${styled('text', 'closingBanner.text')},
        "link": closingBanner.link ${LINK}
      },
      "seo": ${SEO}
    }`,
    { lang },
  );
}

/* --------------------------------------------------------------- edition */

const EDITION_CORE = `
  _id, _type, year, startDate, endDate, venue, isCurrent,
  ticketsUrl, catalogueUrl, overviewUrl, pressClipsUrl,
  ${styled('title')},
  ${styled('ordinal')},
  ${styled('countryFocus')},
  ${styled('intro')},
  cover ${IMAGE},
  datesMark ${IMAGE},
  "guestOfHonour": guestOfHonour->{ _id, name, "slug": slug.current, portrait ${IMAGE} },
  "keyFigures": ${KEY_FIGURES}
`;

/**
 * The edition flagged current, with everything the homepage and visitors-info
 * page need: hours, tickets, figures, film, gallery.
 */
export function getCurrentEdition(lang: LocaleId) {
  return run<any>(
    `*[_type == "edition" && isCurrent == true][0]{
      ${EDITION_CORE},
      ${styled('lastEntry')},
      ${styled('ticketsNote')},
      "fairMapUrl": fairMap.asset->url,
      "openingHours": openingHours[]{
        _key, date,
        ${styled('label')},
        "slots": slots[]{ _key, time, invitationOnly, ${styled('label')} }
      },
      "tickets": tickets[]{ _key, price, ${styled('name')}, ${styled('note')} },
      "film": film ${VIDEO},
      "images": images[] ${IMAGE}
    }`,
    { lang },
  );
}

export function getEditions(lang: LocaleId) {
  return run<any[]>(
    `*[_type == "edition"] | order(year desc){
      ${EDITION_CORE},
      "film": film ${VIDEO},
      "images": images[] ${IMAGE},
      "exhibitorCount": count(*[_type == "exhibitor" && references(^._id)])
    }`,
    { lang },
  );
}

/* ------------------------------------------------------------ exhibitors */

const EXHIBITOR_CARD = `{
  _id, name, sortName, kind, booth, country, countryCode, city, website, instagram,
  soloShow, inCountryFocus,
  "slug": slug.current,
  "year": edition->year,
  ${styled('countryFocusLabel', 'edition->countryFocus')},
  "image": images[0] ${IMAGE},
  "artists": artists[]->{ _id, name, "slug": slug.current },
  ${styled('artistsText')}
}`;

/** Current-edition participants, alphabetical by `sortName` then `name`. */
export function getExhibitors(lang: LocaleId) {
  return run<any[]>(
    `*[_type == "exhibitor" && edition->isCurrent == true]
      | order(lower(coalesce(sortName, name)) asc) ${EXHIBITOR_CARD}`,
    { lang },
  );
}

/** Participants of one edition, for the archive. */
export function getExhibitorsByYear(lang: LocaleId, year: number) {
  return run<any[]>(
    `*[_type == "exhibitor" && edition->year == $year]
      | order(lower(coalesce(sortName, name)) asc) ${EXHIBITOR_CARD}`,
    { lang, year },
  );
}

export function getExhibitorSlugs() {
  return sanityClient.fetch<{ slug: string }[]>(
    `*[_type == "exhibitor" && defined(slug.current)]{ "slug": slug.current }`,
  );
}

export function getExhibitor(lang: LocaleId, slug: string) {
  return run<any>(
    `*[_type == "exhibitor" && slug.current == $slug][0]{
      _id, _type, name, sortName, kind, booth, country, countryCode, city, website, instagram,
      soloShow, inCountryFocus,
      "slug": slug.current,
      "year": edition->year,
      ${styled('countryFocusLabel', 'edition->countryFocus')},
      ${styled('bio')},
      ${styled('artistsText')},
      ${styled('artistsNote')},
      "images": images[] ${IMAGE},
      "artists": artists[]->{
        _id, name, countryCode, "slug": slug.current, portrait ${IMAGE}
      },
      "seo": ${SEO}
    }`,
    { lang, slug },
  );
}

/* --------------------------------------------------------------- artists */

const ARTIST_CARD = `
  _id, name, birthYear, countryCode, website, instagram, gallery,
  ${styled('nationality')},
  ${styled('basedIn')},
  "slug": slug.current,
  portrait ${IMAGE},
  "isGuestOfHonour": count(*[_type == "edition" && guestOfHonour._ref == ^._id]) > 0
`;

export function getArtists(lang: LocaleId) {
  return run<any[]>(
    `*[_type == "artist"] | order(name asc){
      ${ARTIST_CARD},
      "exhibitors": *[_type == "exhibitor" && references(^._id)]{ name, "slug": slug.current, booth }
    }`,
    { lang },
  );
}

export function getArtistSlugs() {
  return sanityClient.fetch<{ slug: string }[]>(
    `*[_type == "artist" && defined(slug.current)]{ "slug": slug.current }`,
  );
}

const ARTIST_FULL = `
  ${ARTIST_CARD},
  _type,
  ${styled('bio')},
  ${styled('intro')},
  ${styled('interview')},
  "sections": sections[] ${SECTION},
  "carousel": carousel[] ${IMAGE},
  "video": video ${VIDEO},
  "works": works[]{
    _key, title, year, dimensions,
    ${styled('materials')},
    image ${IMAGE}
  },
  "exhibitors": *[_type == "exhibitor" && references(^._id)]{
    name, booth, "slug": slug.current, "year": edition->year
  },
  "seo": ${SEO}
`;

export function getArtist(lang: LocaleId, slug: string) {
  return run<any>(`*[_type == "artist" && slug.current == $slug][0]{ ${ARTIST_FULL} }`, {
    lang,
    slug,
  });
}

/**
 * The current edition's guest of honour with the full feature page, plus the
 * guests of previous editions for the archive strip.
 */
export function getGuestOfHonour(lang: LocaleId) {
  return run<any>(
    `{
      "edition": *[_type == "edition" && isCurrent == true][0]{ year, ${styled('title')} },
      "artist": *[_type == "edition" && isCurrent == true][0].guestOfHonour->{ ${ARTIST_FULL} },
      "previous": *[_type == "edition" && isCurrent != true && defined(guestOfHonour)] | order(year desc){
        year,
        "artist": guestOfHonour->{ _id, name, countryCode, "slug": slug.current, portrait ${IMAGE} }
      }
    }`,
    { lang },
  );
}

/* -------------------------------------------------------------- art prize */

/** Laureates grouped by edition, newest first. */
export function getLaureates(lang: LocaleId) {
  return run<any[]>(
    `*[_type == "edition" && count(*[_type == "laureate" && references(^._id)]) > 0] | order(year desc){
      year, isCurrent,
      ${styled('title')},
      "laureates": *[_type == "laureate" && references(^._id)] | order(order asc){
        _id, order,
        ${styled('statement')},
        "images": images[] ${IMAGE},
        "artist": artist->{ ${ARTIST_CARD}, ${styled('bio')} }
      }
    }`,
    { lang },
  );
}

/** Awards grouped by edition, newest first. Both families; filter on `family`. */
export function getAwards(lang: LocaleId) {
  return run<any[]>(
    `*[_type == "award"] | order(edition->year desc, order asc){
      _id, family, order,
      ${styled('name')},
      "year": edition->year,
      ${styled('outcome')},
      ${styled('description')},
      ${styled('citation')},
      "partner": partner->{ _id, name, url, logo ${IMAGE} },
      "laureates": laureates[]->{ _id, name, "slug": slug.current },
      "artist": laureates[0]->{ name, "slug": slug.current },
      "gallery": winnerExhibitor->{ name, "slug": slug.current },
      image ${IMAGE}
    }`,
    { lang },
  );
}

/* ---------------------------------------------------------------- people */

const PERSON = `{
  _id, name, groups, countryCode, website, instagram, email, phone, order,
  "year": edition->year,
  ${styled('role')},
  ${styled('bio')},
  portrait ${IMAGE}
}`;

/**
 * People in one group. Year-bound groups (jury, team) return the current
 * edition's entries unless `year` is given.
 */
export function getPeople(lang: LocaleId, group: string, year?: number) {
  return run<any[]>(
    `*[_type == "person" && $group in groups
        && (!defined(edition) || edition->year == coalesce($year, *[_type == "edition" && isCurrent == true][0].year))]
      | order(order asc, name asc) ${PERSON}`,
    { lang, group, year: year ?? null },
  );
}

/* ------------------------------------------------------------------ news */

export function getNews(lang: LocaleId) {
  return run<any[]>(
    `*[_type == "newsItem" && publishedAt <= now()] | order(publishedAt desc){
      _id, publishedAt, category,
      "slug": slug.current,
      ${styled('title')},
      ${styled('excerpt')},
      cover ${IMAGE}
    }`,
    { lang },
  );
}

export function getNewsSlugs() {
  return sanityClient.fetch<{ slug: string }[]>(
    `*[_type == "newsItem" && defined(slug.current)]{ "slug": slug.current }`,
  );
}

export function getNewsItem(lang: LocaleId, slug: string) {
  return run<any>(
    `*[_type == "newsItem" && slug.current == $slug][0]{
      _id, _type, publishedAt, category,
      "slug": slug.current,
      ${styled('title')},
      ${styled('excerpt')},
      ${styled('body')},
      cover ${IMAGE},
      "seo": ${SEO}
    }`,
    { lang, slug },
  );
}

/* ----------------------------------------------------------------- pages */

const PAGE = `{
  _id, _type, section, order,
  ${styled('title')},
  "tabLabel": coalesce(${localised('tabLabel')}, ${localised('title')}),
  ${styled('intro')},
  ${styled('body')},
  "sections": sections[] ${SECTION},
  "images": images[] ${IMAGE},
  cover ${IMAGE},
  "slugs": { "en": slug.en.current, "fr": slug.fr.current, "nl": slug.nl.current },
  "seo": ${SEO}
}`;

/** Standalone pages only - hub tabs are rendered by their hub route. */
export function getPageSlugs() {
  return sanityClient.fetch<{ slugs: Record<string, string | undefined> }[]>(
    `*[_type == "page" && !defined(section)]{ "slugs": { "en": slug.en.current, "fr": slug.fr.current, "nl": slug.nl.current } }`,
  );
}

export function getPage(lang: LocaleId, slug: string) {
  return run<any>(
    `*[_type == "page" && (slug[$lang].current == $slug || slug.${DEFAULT_LOCALE}.current == $slug)][0] ${PAGE}`,
    { lang, slug },
  );
}

/** The tabs of one hub (about, art-prize, visit…), in order, with content. */
export function getHubPages(lang: LocaleId, section: string) {
  return run<any[]>(`*[_type == "page" && section == $section] | order(order asc) ${PAGE}`, {
    lang,
    section,
  });
}

/* ------------------------------------------------- programme / partners / press */

/** Current-edition events, ordered. Group by day and `section` in the page. */
export function getProgramme(lang: LocaleId) {
  return run<any[]>(
    `*[_type == "programmeEvent" && edition->isCurrent == true] | order(startsAt asc){
      _id, startsAt, endsAt, kind, section, languages, moderator, invitationOnly,
      "slug": slug.current,
      ${styled('title')},
      ${styled('location')},
      ${styled('description')},
      ${styled('speakersText')},
      "speakers": speakers[]->{ _id, _type, name, "slug": slug.current },
      image ${IMAGE}
    }`,
    { lang },
  );
}

const PARTNER = `{
  _id, name, tier, url, instagram, order,
  ${styled('subtitle')},
  ${styled('description')},
  ${styled('currentExhibition')},
  "editions": editions[]->year,
  logo ${IMAGE},
  "images": images[] ${IMAGE}
}`;

/**
 * Every partner, ordered. Filter on `tier` in the page; food & drinks vendors
 * are the `food-drinks` tier. Partners scoped to editions only appear when
 * the current edition is among them.
 */
export function getPartners(lang: LocaleId) {
  return run<any[]>(
    `*[_type == "partner"
        && (!defined(editions) || count(editions) == 0
            || count(editions[@->isCurrent == true]) > 0)]
      | order(order asc, name asc) ${PARTNER}`,
    { lang },
  );
}

export function getPressClips() {
  return sanityClient.fetch<any[]>(
    `*[_type == "pressClip"] | order(publishedAt desc){
      _id, title, outlet, publishedAt, language, url,
      "pdfUrl": pdf.asset->url
    }`,
  );
}
