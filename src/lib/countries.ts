/**
 * The design shows a two-letter country code after a gallery's name and city.
 * Newer records carry it in `countryCode`; imported ones often only have the
 * full name in `country`, which this maps. Anything unknown is shown as typed.
 */
const ISO: Record<string, string> = {
  france: 'FR', spain: 'ES', belgium: 'BE', netherlands: 'NL', 'the netherlands': 'NL', norway: 'NO',
  switzerland: 'CH', turkey: 'TR', germany: 'DE', italy: 'IT', 'united kingdom': 'GB', 'united states': 'US',
  portugal: 'PT', denmark: 'DK', sweden: 'SE', austria: 'AT', luxembourg: 'LU', japan: 'JP', china: 'CN',
  korea: 'KR', 'south korea': 'KR',
};

export function countryCode(value?: string): string | undefined {
  if (!value) return undefined;
  if (/^[A-Za-z]{2}$/.test(value)) return value.toUpperCase();
  return ISO[value.trim().toLowerCase()] ?? value;
}

const DISPLAY_LOCALE: Record<string, string> = { en: 'en-GB', fr: 'fr-BE', nl: 'nl-BE' };

/**
 * A country code as the reader's language names it - "Spain", "Espagne",
 * "Spanje" - for the "search by country" menu, where a bare "ES" said little
 * (client feedback, 2026-09-25). Anything that is not a code is returned as is.
 */
export function countryName(code: string, lang: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return code;
  try {
    return new Intl.DisplayNames([DISPLAY_LOCALE[lang] ?? lang], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
