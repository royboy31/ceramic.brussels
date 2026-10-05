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
 * launch, which goes out in English and French (Kamindu, 2026-10-05).
 *
 * **This hides a button, nothing else.** `LOCALES` above is untouched, so
 * /nl/ still builds, the Studio still has its Dutch fields, and every Dutch
 * page keeps its URL and its hreflang - a visitor who has one bookmarked, or
 * arrives from a search result, lands on it as before and still sees NL as
 * their current language with English and French offered underneath. Nothing
 * is deleted and no translation is lost.
 *
 * To put Dutch back: delete this and the `SWITCHER_LOCALES` import in
 * `Header.astro`, which reads `LOCALES` again.
 */
const HELD_BACK: LocaleId[] = ['nl'];

export const SWITCHER_LOCALES = LOCALES.filter((l) => !HELD_BACK.includes(l.id));

export const DEFAULT_LOCALE: LocaleId = 'en';

export const LOCALE_IDS = LOCALES.map((l) => l.id) as LocaleId[];

export function isLocale(value: string | undefined): value is LocaleId {
  return !!value && (LOCALE_IDS as string[]).includes(value);
}
