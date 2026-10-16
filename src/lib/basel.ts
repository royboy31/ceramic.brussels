import type { LocaleId } from './locales';

/**
 * ceramic basel, the sister fair, and the one address on this site that
 * leaves it: the last row of the menu (Base.astro) and the marquee above
 * the header (CrossBanner.astro) both read it from here.
 *
 * That site is bilingual - French at the root, English under /en/, per its
 * own hreflang (checked 2026-10-15) - so Dutch takes the English page, as
 * every other missing translation here falls back to English.
 */
export const BASEL_URL: Record<LocaleId, string> = {
  en: 'https://www.ceramic-basel.com/en/',
  fr: 'https://www.ceramic-basel.com/',
  nl: 'https://www.ceramic-basel.com/en/',
};
