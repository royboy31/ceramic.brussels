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
 * The languages the header's switcher offers. **All three, since 2026-11-06**:
 * the fair asked for Dutch to go online and the retranslation it was waiting
 * for is in the dataset (`scripts/nl-3-pages-2026-10-17.mjs` and
 * `scripts/nl-fill-2026-10-17.mjs`, 2026-10-17, plus the 2027 gallery bios of
 * 2026-10-28 - see [[nl-retranslation]]).
 *
 * Dutch was out of the switcher from the launch, which went out in English
 * and French (Kamindu, 2026-10-05), and **off the site** from 2026-10-17
 * while it was retranslated: the old site's Dutch was machine-made and in
 * places said something other than the English. It never stopped building,
 * so no URL, hreflang or Studio field changed when it came back.
 *
 * To hold a language back again, put its id in the list here and mind the
 * other two places, which this list does not reach on its own:
 *
 * 1. **here** - out of the switcher (`SWITCHER_LOCALES`, read by
 *    `Header.astro`) and out of search (`isHeldBack`, below);
 * 2. **`public/_redirects`** - a 302 to the English homepage for every
 *    address in that language, at the top of the file, above the generated
 *    block;
 * 3. **`src/middleware.ts`** - the same 302 for the VIP hub's locked tabs,
 *    which the Worker answers and a `_redirects` rule never reaches. That one
 *    reads `isHeldBack`, so it follows this list by itself.
 *
 * `/preview/…` is untouched either way: the drafts preview renders every
 * language in `LOCALES`, so a translation can always be read before it goes
 * live.
 */
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
