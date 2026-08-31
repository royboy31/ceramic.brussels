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

export const DEFAULT_LOCALE: LocaleId = 'en';

export const LOCALE_IDS = LOCALES.map((l) => l.id) as LocaleId[];

export function isLocale(value: string | undefined): value is LocaleId {
  return !!value && (LOCALE_IDS as string[]).includes(value);
}
