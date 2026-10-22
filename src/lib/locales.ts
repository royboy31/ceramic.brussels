/**
 * Single source of truth for languages. Used by the Sanity schemas to build
 * localised field objects and by Astro to generate routes, so the two can
 * never drift apart.
 */
export const LOCALES = [
  { id: 'en', title: 'English' },
  { id: 'fr', title: 'Français' },
  { id: 'nl', title: 'Nederlands' },
] as const;

export type LocaleId = (typeof LOCALES)[number]['id'];

/**
 * The languages the header's switcher offers. Dutch is held back for the
 * launch, which went out in English and French (Kamindu, 2026-10-05), and is
 * **off the site** since 2026-10-17 while it is retranslated: the old site's
 * Dutch is machine-made and in places says something other than the English.
 *
 * `LOCALES` above is untouched, so /nl/ still builds, the Studio still has
 * its Dutch fields, and every Dutch page keeps its URL and its hreflang -
 * which `scripts/legacy-redirects.mjs` reads to find the Dutch target of
 * every old-site rule. Nothing is deleted and no translation is lost; the
 * pages are simply not served.
 *
 * Being held back now lives in three places, and putting Dutch back means
 * all three:
 *
 * 1. **here** - out of the switcher (`SWITCHER_LOCALES`, read by
 *    `Header.astro`) and out of search (`isHeldBack`, below);
 * 2. **`public/_redirects`** - the three `/nl` rules at the top of the file,
 *    a 302 to the English homepage for every Dutch address;
 * 3. **`src/middleware.ts`** - the same 302 for the VIP hub's locked tabs,
 *    which the Worker answers and a `_redirects` rule never reaches.
 *
 * `/preview/nl/…` is deliberately untouched: the drafts preview still renders
 * Dutch, so the retranslation can be read page by page before it goes live.
 */
// On this branch alone, nothing is held back: the kamindu preview is where
// the Dutch retranslation is read, switcher button included. On main this
// line says ['nl'] - never carry this change there.
const HELD_BACK: LocaleId[] = [];

export const SWITCHER_LOCALES = LOCALES.filter((l) => !HELD_BACK.includes(l.id));

/**
 * A held-back language's pages are also kept out of search: `Base.astro` sends
 * `<meta name="robots" content="noindex">` on them, and because
 * `scripts/sitemap-noindex.mjs` drops every page whose HTML says noindex, they
 * leave the sitemap by the same stroke. The pages still build - the rules in
 * `public/_redirects` send the visitor to the English homepage before one of
 * them is ever served.
 */
export const isHeldBack = (lang: LocaleId) => HELD_BACK.includes(lang);

export const DEFAULT_LOCALE: LocaleId = 'en';

export const LOCALE_IDS = LOCALES.map((l) => l.id) as LocaleId[];

export function isLocale(value: string | undefined): value is LocaleId {
  return !!value && (LOCALE_IDS as string[]).includes(value);
}
