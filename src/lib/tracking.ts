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
export const CONSENT_VERSION = 1;

/**
 * The hosts trackers actually load on. Everywhere else (pages.dev, branch
 * previews, localhost) the banner works but sends nothing, so the team's own
 * testing never lands in the client's numbers. To test a tracker elsewhere,
 * set localStorage `cb-tracking-test` to `1` in that browser.
 */
export const TRACKING_HOSTS = ['www.ceramic.brussels', 'ceramic.brussels'];

export const TRACKERS = {
  /** Google Analytics 4: the property the old site reports to, so the numbers carry on across the move. */
  ga4: 'G-XVTPYEC66H',
  /** Meta pixel, for campaigns. Not in use yet. */
  metaPixel: '',
};

export type ConsentCategory = 'analytics' | 'marketing';

/** The banner's categories: only those with a tracker behind them. */
export function categoriesInUse(): ConsentCategory[] {
  const categories: ConsentCategory[] = [];
  if (TRACKERS.ga4) categories.push('analytics');
  if (TRACKERS.metaPixel) categories.push('marketing');
  return categories;
}
