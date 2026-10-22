/**
 * Third-party measurement the site may load - each one only after the visitor
 * has agreed to its category in the cookie banner (src/components/CookieConsent.astro).
 * An empty id switches that tracker off and takes its category out of the banner.
 *
 * Adding a tracker: put its id here, load it in CookieConsent's script, say
 * what it does in the banner strings (consent.* in i18n.ts, all three
 * locales), and bump CONSENT_VERSION - an earlier "yes" only covers what the
 * visitor was told about then, so everyone is asked again.
 */
export const CONSENT_VERSION = 2;

/**
 * The hosts trackers actually load on. Everywhere else (pages.dev, branch
 * previews, localhost) the banner works but sends nothing, so the team's own
 * testing never lands in the client's numbers. To test a tracker elsewhere,
 * set localStorage `cb-tracking-test` to `1` in that browser.
 */
export const TRACKING_HOSTS = ['www.ceramic.brussels', 'ceramic.brussels'];

export const TRACKERS = {
  /**
   * Google Analytics 4. The first is the property the old site reports to, so
   * the numbers carry on across the move; the second is the one Perelweb owns
   * (2026-10-07), since nobody at the fair could confirm access to the first.
   */
  ga4: ['G-XVTPYEC66H', 'G-DP54EJ7WWZ'],
  /** Microsoft Clarity: heatmaps and session recordings. Part of "statistics". */
  clarity: 'ytowj5wohc',
  /** Meta pixel, for campaigns. Not in use yet. */
  metaPixel: '',
};

/**
 * What the statistics trackers do before a visitor has chosen (Roy, 2026-10-07:
 * "for the first month at least, I want to track everything").
 * - 'none': nothing loads before "accept" (the site as launched).
 * - 'cookieless': GA4 in Consent Mode "advanced" and Clarity without cookies
 *   load for everyone; their cookies wait for "accept".
 * - 'full': GA4 and Clarity load with their cookies for everyone who has not
 *   refused.
 * "refuse" always stops them. Set back to 'none' to return to strict consent.
 *
 * 'full' from 2026-10-07 for two months, Roy's call: back to 'none' (or
 * 'cookieless') around 2026-12-07, and change consent.body to match.
 */
export const PRE_CONSENT: 'none' | 'cookieless' | 'full' = 'full';

export type ConsentCategory = 'analytics' | 'marketing';

/** The banner's categories: only those with a tracker behind them. */
export function categoriesInUse(): ConsentCategory[] {
  const categories: ConsentCategory[] = [];
  if (TRACKERS.ga4.length || TRACKERS.clarity) categories.push('analytics');
  if (TRACKERS.metaPixel) categories.push('marketing');
  return categories;
}
