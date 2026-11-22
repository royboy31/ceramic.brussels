import { LOCALE_IDS, type LocaleId } from './locales';

/**
 * The exhibitors platform (docs/exhibitors-platform.md): one address,
 * `/[lang]/exhibitors/platform/`, rendered by the Worker in two states - the
 * password form (Figma 1813:716) for everyone, the platform page (1813:964)
 * once src/middleware.ts has found an exhibitor session. It is never
 * prerendered, so there is no static file to fetch around the gate, and it
 * hangs off the exhibitors listing, whose segment is `exhibitors` in all
 * three languages (the listing routes are untranslated, unlike the hubs).
 */

/** Locale-less path, for `localePath`. */
export const PLATFORM_PATH = 'exhibitors/platform';

/** The language of a platform request, or null for any other path. */
export function platformFromPath(pathname: string): LocaleId | null {
  const [lang, a, b, ...rest] = pathname.split('/').filter(Boolean);
  if (!lang || !(LOCALE_IDS as readonly string[]).includes(lang) || rest.length) return null;
  return a === 'exhibitors' && b === 'platform' ? (lang as LocaleId) : null;
}

/**
 * Every language's platform path, with and without the trailing slash - what
 * `_routes.json` sends to the Worker and robots.txt disallows (the
 * `_vip-paths.json` channel in src/integrations/vip-routes.mjs).
 */
export function platformPaths(): string[] {
  return LOCALE_IDS.flatMap((lang) => {
    const path = `/${lang}/${PLATFORM_PATH}`;
    return [path, `${path}/`];
  });
}
