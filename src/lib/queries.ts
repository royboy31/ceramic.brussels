import { sanityClient } from 'sanity:client';
import type { LocaleId } from './locales';
import { DEFAULT_LOCALE } from './locales';

/**
 * All GROQ lives here so the pages stay readable and every query resolves
 * localised fields the same way: ask for the requested language, fall back to
 * English rather than rendering an empty string.
 */

const localised = (field: string) => `coalesce(${field}[$lang], ${field}.${DEFAULT_LOCALE})`;

const IMAGE = `{
  ...,
  alt,
  credit,
  "lqip": asset->metadata.lqip,
  "dimensions": asset->metadata.dimensions
}`;

const SEO = `{
  "title": ${localised('seo.title')},
  "description": ${localised('seo.description')},
  "noIndex": seo.noIndex,
  "ogImage": seo.ogImage ${IMAGE}
}`;

export type Params = { lang: LocaleId; [key: string]: unknown };

function run<T>(query: string, params: Params): Promise<T> {
  return sanityClient.fetch<T>(query, params);
}

/* ------------------------------------------------------------------ site */

export function getSettings(lang: LocaleId) {
  return run<any>(
    `*[_type == "siteSettings"][0]{
      siteName,
      "tagline": ${localised('tagline')},
      newsletterUrl,
      instagramUrl,
      contactEmail,
      "practicalInfo": {
        "address": practicalInfo.address,
        "openingHours": ${localised('practicalInfo.openingHours')},
        "transport": ${localised('practicalInfo.transport')},
        "accessibility": ${localised('practicalInfo.accessibility')}
      },
      "defaultSeo": ${SEO.replace(/seo\./g, 'defaultSeo.')}
    }`,
    { lang },
  );
}

/** Pages that opted into the main menu, ordered. Used as the fallback menu. */
export function getNavPages(lang: LocaleId) {
  return run<any[]>(
    `*[_type == "page" && (defined(navLabel[$lang]) || defined(navLabel.${DEFAULT_LOCALE}))]
      | order(navOrder asc){
      "label": ${localised('navLabel')},
      "slug": coalesce(slug[$lang].current, slug.${DEFAULT_LOCALE}.current)
    }[defined(slug)]`,
    { lang },
  );
}

const NAV_ITEMS = `{
  _key,
  kind,
  route,
  url,
  "label": ${localised('label')},
  "pageSlug": coalesce(page->slug[$lang].current, page->slug.${DEFAULT_LOCALE}.current)
}`;

/**
 * Editor-controlled menu. Returns null when no navigation document exists or it
 * has no items, so the layout can fall back to a built-in menu rather than
 * rendering nothing.
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

/* --------------------------------------------------------------- edition */

export function getCurrentEdition(lang: LocaleId) {
  return run<any>(
    `*[_type == "edition" && isCurrent == true][0]{
      _id, _type, year, startDate, endDate, venue, catalogueUrl, ticketsUrl,
      "title": ${localised('title')},
      "intro": ${localised('intro')},
      cover ${IMAGE}
    }`,
    { lang },
  );
}

export function getEditions(lang: LocaleId) {
  return run<any[]>(
    `*[_type == "edition"] | order(year desc){
      _id, year, startDate, endDate, venue, isCurrent,
      "title": ${localised('title')},
      cover ${IMAGE},
      "exhibitorCount": count(*[_type == "exhibitor" && references(^._id)])
    }`,
    { lang },
  );
}

/* ------------------------------------------------------------ exhibitors */

const EXHIBITOR_CARD = `{
  _id, name, booth, country, city, website, instagram,
  "slug": slug.current,
  "year": edition->year,
  "image": images[0] ${IMAGE},
  "artists": artists[]->{ _id, name, "slug": slug.current }
}`;

export function getExhibitors(lang: LocaleId) {
  return run<any[]>(
    `*[_type == "exhibitor" && edition->isCurrent == true] | order(name asc) ${EXHIBITOR_CARD}`,
    { lang },
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
      _id, _type, name, booth, country, city, website, instagram,
      "slug": slug.current,
      "year": edition->year,
      "bio": ${localised('bio')},
      "images": images[] ${IMAGE},
      "artists": artists[]->{
        _id, name, nationality, "slug": slug.current, portrait ${IMAGE}
      },
      "seo": ${SEO}
    }`,
    { lang, slug },
  );
}

/* --------------------------------------------------------------- artists */

export function getArtists(lang: LocaleId) {
  return run<any[]>(
    `*[_type == "artist"] | order(name asc){
      _id, name, nationality, birthYear, isGuestOfHonour,
      "slug": slug.current,
      portrait ${IMAGE},
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

export function getArtist(lang: LocaleId, slug: string) {
  return run<any>(
    `*[_type == "artist" && slug.current == $slug][0]{
      _id, _type, name, nationality, birthYear, website, instagram, isGuestOfHonour,
      "slug": slug.current,
      "bio": ${localised('bio')},
      portrait ${IMAGE},
      "works": works[]{
        title, year, dimensions,
        "materials": ${localised('materials')},
        image ${IMAGE}
      },
      "exhibitors": *[_type == "exhibitor" && references(^._id)]{
        name, booth, "slug": slug.current, "year": edition->year
      },
      "seo": ${SEO}
    }`,
    { lang, slug },
  );
}

/* ------------------------------------------------------------------ news */

export function getNews(lang: LocaleId) {
  return run<any[]>(
    `*[_type == "newsItem" && publishedAt <= now()] | order(publishedAt desc){
      _id, publishedAt, category,
      "slug": slug.current,
      "title": ${localised('title')},
      "excerpt": ${localised('excerpt')},
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
      "title": ${localised('title')},
      "excerpt": ${localised('excerpt')},
      "body": ${localised('body')},
      cover ${IMAGE},
      "seo": ${SEO}
    }`,
    { lang, slug },
  );
}

/* ----------------------------------------------------------------- pages */

export function getPageSlugs() {
  return sanityClient.fetch<{ slugs: Record<string, string | undefined> }[]>(
    `*[_type == "page"]{ "slugs": { "en": slug.en.current, "fr": slug.fr.current, "nl": slug.nl.current } }`,
  );
}

export function getPage(lang: LocaleId, slug: string) {
  return run<any>(
    `*[_type == "page" && (slug[$lang].current == $slug || slug.${DEFAULT_LOCALE}.current == $slug)][0]{
      _id, _type,
      "title": ${localised('title')},
      "intro": ${localised('intro')},
      "body": ${localised('body')},
      cover ${IMAGE},
      "slugs": { "en": slug.en.current, "fr": slug.fr.current, "nl": slug.nl.current },
      "seo": ${SEO}
    }`,
    { lang, slug },
  );
}

/* ------------------------------------------------- programme / partners / press */

export function getProgramme(lang: LocaleId) {
  return run<any[]>(
    `*[_type == "programmeEvent" && edition->isCurrent == true] | order(startsAt asc){
      _id, startsAt, endsAt, kind, location,
      "slug": slug.current,
      "title": ${localised('title')},
      "description": ${localised('description')},
      "speakers": speakers[]->{ _id, name, "slug": slug.current }
    }`,
    { lang },
  );
}

export function getPartners(lang: LocaleId) {
  return run<any[]>(
    `*[_type == "partner"] | order(order asc){
      _id, name, tier, url,
      "description": ${localised('description')},
      logo ${IMAGE}
    }`,
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

export function getAwards(lang: LocaleId) {
  return run<any[]>(
    `*[_type == "award"] | order(edition->year desc){
      _id,
      "name": ${localised('name')},
      "year": edition->year,
      "citation": ${localised('citation')},
      "gallery": winnerExhibitor->{ name, "slug": slug.current },
      "artist": winnerArtist->{ name, "slug": slug.current },
      image ${IMAGE}
    }`,
    { lang },
  );
}
