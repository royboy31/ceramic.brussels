import type { LocaleId } from './locales';
import { currentClient, isPreview } from './previewContext';
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
    "slug": coalesce(slug.current, slug[$lang].current, slug.${DEFAULT_LOCALE}.current),
    // A hub tab or listing page lives at its hub's path, not at its slug;
    // a past exhibitor under its year. links.ts works out which.
    section,
    "tab": slug.${DEFAULT_LOCALE}.current,
    "year": edition->year,
    "current": edition->isCurrent == true
  }
}`;

const VIDEO = `{
  url,
  ${styled('title')},
  poster ${IMAGE}
}`;

const KEY_FIGURES = `keyFigures[]{ _key, value, ${styled('label')} }`;

const PERSON = `{
  _id, name, groups, countryCode, website, instagram, email, phone, order,
  "year": edition->year,
  ${styled('role')},
  ${styled('bio')},
  portrait ${IMAGE}
}`;

const PARTNER = `{
  _id, name, tier, url, instagram, order,
  ${styled('subtitle')},
  ${styled('description')},
  ${styled('currentExhibition')},
  "editions": editions[]->year,
  logo ${IMAGE},
  "images": images[] ${IMAGE}
}`;

/** Partners that are not scoped to an edition, or are scoped to the current one. */
const PARTNER_IS_LISTED = `(!defined(editions) || count(editions) == 0 || count(editions[@->isCurrent == true]) > 0)`;

const NEWS_CARD = `{
  _id, publishedAt, category,
  "slug": slug.current,
  ${styled('title')},
  ${styled('excerpt')},
  cover ${IMAGE}
}`;

/**
 * The page builder: one projection for every block type, keyed on `_type`.
 * Hidden blocks are dropped here so no page has to remember to. Blocks that
 * pull from other content (people, key figures, news) are resolved in place,
 * so a page renders from this one result.
 *
 * Adding a block type means adding a branch here, its schema in
 * src/sanity/schemaTypes/objects/pageBuilder.ts, and its component in
 * src/components/sections/.
 */
const SECTIONS = `sections[hidden != true]{
  _key, _type, anchor,
  _type == "contentSection" => {
    layout,
    ${styled('heading')},
    ${styled('body')},
    "images": images[] ${IMAGE},
    "links": links[] ${LINK}
  },
  _type == "imageTextSection" => {
    imageSide,
    image ${IMAGE},
    ${styled('heading')},
    ${styled('body')},
    "links": links[] ${LINK}
  },
  _type == "gallerySection" => {
    columns, captions,
    ${styled('heading')},
    "images": images[] ${IMAGE}
  },
  _type == "slideshowSection" => {
    aspect,
    ${styled('heading')},
    "images": images[] ${IMAGE}
  },
  _type == "videoSection" => {
    ${styled('heading')},
    "video": select(
      defined(video.url) => video ${VIDEO},
      *[_type == "edition" && defined(film.url)] | order(year desc)[0].film ${VIDEO}
    )
  },
  _type == "quoteSection" => {
    ${styled('quote')},
    ${styled('attribution')}
  },
  _type == "spotlight" => {
    ${styled('kicker')},
    ${styled('headline')},
    "link": link ${LINK},
    image ${IMAGE}
  },
  _type == "bannerSection" => {
    style,
    ${styled('text')},
    "link": link ${LINK},
    image ${IMAGE}
  },
  _type == "linksSection" => {
    variant,
    "links": links[] ${LINK}
  },
  _type == "headingSection" => {
    ${styled('title')}
  },
  _type == "peopleSection" => {
    group,
    ${styled('heading')},
    "people": select(
      defined(group) => *[_type == "person" && ^.group in groups
        && (!defined(edition) || edition->year == *[_type == "edition" && isCurrent == true][0].year)]
        | order(order asc, name asc) ${PERSON},
      people[]-> ${PERSON}
    )
  },
  _type == "partnersSection" => {
    display, tier,
    ${styled('heading')},
    ${styled('body')},
    "partners": select(
      defined(tier) => *[_type == "partner" && tier == ^.tier && ${PARTNER_IS_LISTED}]
        | order(order asc, name asc) ${PARTNER},
      partners[]-> ${PARTNER}
    )
  },
  _type == "keyFiguresSection" => {
    image ${IMAGE},
    "link": link ${LINK},
    // The edition the editor picked, or the newest one that has figures.
    "edition": select(
      defined(edition) => edition->{ year, "keyFigures": ${KEY_FIGURES} },
      *[_type == "edition" && count(keyFigures) > 0] | order(year desc)[0]{ year, "keyFigures": ${KEY_FIGURES} }
    )
  },
  _type == "newsSection" => {
    count,
    ${styled('heading')},
    "items": *[_type == "newsItem" && publishedAt <= now()] | order(publishedAt desc)[0...6] ${NEWS_CARD}
  },
  _type == "faqSection" => {
    ${styled('heading')},
    "items": items[]{ _key, ${styled('question')}, ${styled('answer')} }
  },
  _type == "embedSection" => {
    url, height,
    ${styled('heading')}
  }
}`;

export type Params = { lang: LocaleId; [key: string]: unknown };

/**
 * One request per distinct query for the life of a build.
 *
 * Base.astro asks for the settings, the navigation and the current edition
 * on every page, and a build renders ~700 pages, so without this a build
 * sent the same handful of queries nearly three thousand times - enough,
 * across the branch previews of a working week, to use up the free plan's
 * monthly request quota (2026-09-05). The content cannot change under a
 * build, so the first answer is the right answer for every page.
 *
 * Not in `astro dev`, where the process lives for hours and an edit in the
 * Studio should show on the next reload. Not in a preview render either: it
 * reads drafts through a different client and must see every keystroke.
 */
const memo = new Map<string, Promise<unknown>>();

/**
 * How many requests a build may make before it is stopped.
 *
 * Shared queries run once thanks to the memo, but every exhibitor and artist
 * page asks for its own document by slug, in each language, so a build makes
 * about a thousand distinct requests (2026-09-06: 216 exhibitors and 44
 * artists). The per-page regression this exists to catch made 3,500-4,500,
 * which is what emptied the first project's monthly quota in four days. The
 * ceiling sits between the two with room for the 2027 exhibitor list; raise
 * it when the content grows past it, not when a query is added to Base.astro.
 * The total is printed when the build exits.
 */
const BUILD_REQUEST_CEILING = 2500;
let buildRequests = 0;
if (import.meta.env.PROD && typeof process !== 'undefined' && typeof process.on === 'function') {
  process.on('exit', () => {
    if (buildRequests) console.log(`[sanity] ${buildRequests} request(s) made during this build`);
  });
}

// `currentClient` is the build-time client, or the drafts-reading one inside a
// preview request - see src/lib/previewContext.ts.
function run<T>(query: string, params: Record<string, unknown> = {}): Promise<T> {
  if (!import.meta.env.PROD || isPreview()) return currentClient().fetch<T>(query, params);
  const key = `${query}\u0000${JSON.stringify(params)}`;
  let pending = memo.get(key) as Promise<T> | undefined;
  if (!pending) {
    if (++buildRequests > BUILD_REQUEST_CEILING) {
      throw new Error(
        `[sanity] this build has made more than ${BUILD_REQUEST_CEILING} requests; ` +
          'a query is being run per page instead of once - route it through run() with stable params',
      );
    }
    pending = currentClient().fetch<T>(query, params);
    // A failed request is not an answer; let the next caller try again.
    pending.catch(() => memo.delete(key));
    memo.set(key, pending);
  }
  return pending;
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
  "pageSlug": coalesce(page->slug[$lang].current, page->slug.${DEFAULT_LOCALE}.current),
  "pageSection": page->section,
  "pageTab": page->slug.${DEFAULT_LOCALE}.current
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
      "sections": ${SECTIONS},
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
      "fairMapUrl": fairMap.asset->url,
      "film": film ${VIDEO},
      "images": images[] ${IMAGE},
      "exhibitorCount": count(*[_type == "exhibitor" && references(^._id)])
    }`,
    { lang },
  );
}

/** The past editions' years, newest first, for their archive pages. */
export function getPastEditionYears() {
  return run<number[]>(`*[_type == "edition" && isCurrent != true && defined(year)] | order(year desc).year`);
}

/**
 * One past edition with everything its year page shows, as the old site's
 * past-editions pages had it: the facts, the art prize (laureates, awards,
 * jury), the programme, the team and the photos - all read from the records
 * that point at the edition.
 */
export function getEditionArchive(lang: LocaleId, year: number) {
  return run<any>(
    `*[_type == "edition" && year == $year][0]{
      ${EDITION_CORE},
      "fairMapUrl": fairMap.asset->url,
      "film": film ${VIDEO},
      "images": images[] ${IMAGE},
      "exhibitorCount": count(*[_type == "exhibitor" && references(^._id)]),
      "laureates": *[_type == "laureate" && references(^._id)] | order(order asc){
        _id, "artist": artist->{ name, "slug": slug.current, ${styled('nationality')} }
      },
      "awards": *[_type == "award" && family == "art-prize" && references(^._id)] | order(order asc){
        _id, ${styled('name')}, ${styled('outcome')},
        "laureates": laureates[]->{ _id, name, "slug": slug.current }
      },
      "jury": *[_type == "person" && "jury" in groups && references(^._id)] | order(order asc, name asc){
        _id, name, ${styled('role')}
      },
      "people": *[_type == "person" && references(^._id) && count(groups[@ in ["team", "collaborator", "advisory-board"]]) > 0]
        | order(order asc, name asc){ _id, name, ${styled('role')} },
      "events": *[_type == "programmeEvent" && references(^._id) && defined(startsAt)] | order(startsAt asc){
        _id, startsAt, ${styled('title')}, ${styled('speakersText')},
        "speakers": speakers[]->{ _id, _type, name, "slug": slug.current }
      }
    }`,
    { lang, year },
  );
}

/* ------------------------------------------------------------ exhibitors */

const EXHIBITOR_CARD = `{
  _id, name, sortName, kind, booth, country, countryCode, city, website, instagram,
  soloShow, inCountryFocus,
  "slug": slug.current,
  "year": edition->year,
  "current": edition->isCurrent == true,
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

/**
 * Every exhibitor page to build. The old site kept one list per year
 * (/exhibitors, /exhibitors/2025, /exhibitors/2024), and a gallery that comes
 * back has one record per year, often on the same slug - so the current
 * edition's records live at /exhibitors/<slug> and a past edition's at
 * /exhibitors/<year>/<slug>, and no record hides behind another.
 */
export function getExhibitorPaths() {
  return run<{ current: string[]; past: { year: number; slug: string }[] }>(
    `{
      "current": *[_type == "exhibitor" && edition->isCurrent == true && defined(slug.current)].slug.current,
      "past": *[_type == "exhibitor" && edition->isCurrent != true && defined(slug.current) && defined(edition->year)]{
        "year": edition->year, "slug": slug.current
      }
    }`,
  );
}

const EXHIBITOR_FULL = `{
  _id, _type, name, sortName, kind, booth, country, countryCode, city, website, instagram,
  soloShow, inCountryFocus,
  "slug": slug.current,
  "year": edition->year,
  "current": edition->isCurrent == true,
  ${styled('countryFocusLabel', 'edition->countryFocus')},
  ${styled('bio')},
  ${styled('artistsText')},
  "images": images[] ${IMAGE},
  "artists": artists[]->{
    _id, name, countryCode, "slug": slug.current, portrait ${IMAGE}
  },
  "seo": ${SEO}
}`;

/** True while statically building: every page of a type is rendered, so fetch the type once. */
const building = () => import.meta.env.PROD && !isPreview();

/**
 * One exhibitor: the current edition's with this slug, or with `year`, that
 * year's. A build fetches every exhibitor once per language and picks from
 * that, rather than one request per page (216 records, three languages).
 */
export async function getExhibitor(lang: LocaleId, slug: string, year?: number) {
  const matches = (e: any) => e.slug === slug && (year ? e.year === year : e.current);
  if (building()) {
    const all = await run<any[]>(`*[_type == "exhibitor" && defined(slug.current)] ${EXHIBITOR_FULL}`, { lang });
    return all.find(matches) ?? null;
  }
  return run<any>(
    `*[_type == "exhibitor" && slug.current == $slug
        && (($year == null && edition->isCurrent == true) || edition->year == $year)][0] ${EXHIBITOR_FULL}`,
    { lang, slug, year: year ?? null },
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
  return run<{ slug: string }[]>(
    `*[_type == "artist" && defined(slug.current)]{ "slug": slug.current }`,
  );
}

const ARTIST_FULL = `
  ${ARTIST_CARD},
  _type,
  ${styled('bio')},
  ${styled('intro')},
  ${styled('interview')},
  "sections": ${SECTIONS},
  "carousel": carousel[] ${IMAGE},
  "video": video ${VIDEO},
  "works": works[]{
    _key, title, year, dimensions,
    ${styled('materials')},
    image ${IMAGE}
  },
  "exhibitors": *[_type == "exhibitor" && references(^._id)] | order(edition->year desc){
    name, booth, "slug": slug.current, "year": edition->year, "current": edition->isCurrent == true
  },
  "seo": ${SEO}
`;

/** One artist. A build fetches them all once per language, as for exhibitors. */
export async function getArtist(lang: LocaleId, slug: string) {
  if (building()) {
    const all = await run<any[]>(`*[_type == "artist" && defined(slug.current)]{ ${ARTIST_FULL} }`, { lang });
    return all.find((a) => a.slug === slug) ?? null;
  }
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
    `*[_type == "newsItem" && publishedAt <= now()] | order(publishedAt desc) ${NEWS_CARD}`,
    { lang },
  );
}

export function getNewsSlugs() {
  return run<{ slug: string }[]>(
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
  "sections": ${SECTIONS},
  "images": images[] ${IMAGE},
  cover ${IMAGE},
  "slugs": { "en": slug.en.current, "fr": slug.fr.current, "nl": slug.nl.current },
  "seo": ${SEO}
}`;

/** Standalone pages only - hub tabs are rendered by their hub route. */
export function getPageSlugs() {
  return run<{ slugs: Record<string, string | undefined> }[]>(
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

/**
 * The main page behind a listing route (exhibitors, artists, news): its lead
 * paragraph, SEO and section stack wrap the list the route generates. One
 * page per section; the Studio's "Main pages" entry opens it. Null until an
 * editor has made one, and the page renders without it.
 */
export function getMainPage(lang: LocaleId, section: string) {
  return run<any>(`*[_type == "page" && section == $section] | order(order asc)[0] ${PAGE}`, { lang, section });
}

/* ------------------------------------------------- programme / partners / press */

/**
 * The programme: the current edition's events, and until it has any dated
 * ones, the newest edition's that does - the old site kept showing its last
 * programme until the next was out, and the design's talks are 2026's.
 * Group by day and `section` in the page.
 */
export function getProgramme(lang: LocaleId) {
  return run<any[]>(
    `*[_type == "programmeEvent" && edition._ref == coalesce(
        *[_type == "edition" && isCurrent == true
          && count(*[_type == "programmeEvent" && references(^._id) && defined(startsAt)]) > 0][0]._id,
        *[_type == "edition"
          && count(*[_type == "programmeEvent" && references(^._id) && defined(startsAt) && section in ["talks", "vip", "project"]]) > 0]
          | order(year desc)[0]._id
      )] | order(startsAt asc){
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

/**
 * Every partner, ordered. Filter on `tier` in the page; food & drinks vendors
 * are the `food-drinks` tier. Partners scoped to editions only appear when
 * the current edition is among them.
 */
export function getPartners(lang: LocaleId) {
  return run<any[]>(
    `*[_type == "partner" && ${PARTNER_IS_LISTED}]
      | order(order asc, name asc) ${PARTNER}`,
    { lang },
  );
}

export function getPressClips() {
  return run<any[]>(
    `*[_type == "pressClip"] | order(publishedAt desc){
      _id, title, outlet, publishedAt, language, url,
      "pdfUrl": pdf.asset->url
    }`,
  );
}
