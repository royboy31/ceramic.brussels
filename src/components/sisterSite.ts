import type { LocaleId } from '../lib/locales';

/**
 * ceramic basel, the sister fair. The two sites each carry the other: their
 * banner and the last row of their menu point here, these point there
 * (Lilanga, 2026-10-15). Both ends of the pair are drawn in code, not in
 * Sanity - it is an arrangement between the two fairs, not something an
 * editor sets - so this is the one place the address is written down.
 *
 * It sits beside the components rather than in `src/lib/`, which is the
 * backend half, for the reason `exhibitorBadges.ts` gives.
 *
 * Their French site is the root and their English one `/en/`; they have no
 * Dutch, so a Dutch page is sent to the English one.
 *
 * **The final address, not the bare domain.** Their banner used to point at
 * `https://www.ceramic.brussels/`, which 301s to `/en/`, and every French
 * visitor who followed it landed on this site in English (found and fixed on
 * their side, 2026-10-14). `www.ceramic-basel.com` is the host their own
 * canonical names, and both paths answer 200 with no hop.
 */
export function sisterSiteUrl(lang: LocaleId): string {
  return lang === 'fr' ? 'https://www.ceramic-basel.com/' : 'https://www.ceramic-basel.com/en/';
}
