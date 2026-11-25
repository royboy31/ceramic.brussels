/**
 * The four newsletter looks, measured from Félicie's campaigns by Lilanga
 * (newsletters/README.md on the `newsletter-vip` branch). A theme is only
 * colours, type sizes and the footer: the blocks are the same in every
 * newsletter, so a new theme is one entry here and one line in the schema's
 * list (THEME_OPTIONS below feeds it).
 *
 * Shared by the Studio preview and the Worker that sends, so what Félicie
 * previews is byte for byte what Mailchimp receives.
 */

export interface Theme {
  title: string;
  /** Around the newsletter, in the mail app. */
  page: string;
  /** The newsletter itself. */
  sheet: string;
  text: string;
  textSize: number;
  textLineHeight: string;
  headline: string;
  headlineSize: number;
  /** The bars over a column: YOUR EXCLUSIVE VIP ACCESS, AGENDA… */
  labelBg: string;
  labelText: string;
  labelSize: number;
  subtitle: string;
  subtitleSize: number;
  /** The oval buttons. */
  buttonBg: string;
  buttonText: string;
  /** Outlined buttons, the info card's lines, the dotted offer box. */
  line: string;
  /** The thin rule between rows. */
  rule: string;
  /** Yellow banner and "yellow background" text. */
  highlight: string;
  highlightText: string;
  /** The second colour some campaigns use for a block (monthly's Basel row). */
  accent: string;
  /** The coloured header band (monthly yellow, Basel ochre); empty = none. */
  header: string;
  headerText: string;
  legal: string;
  /** Which fair the footer logo and dates belong to. */
  footer: 'brussels' | 'basel';
}

const YELLOW = '#ffee00';
const OCHRE = '#c39c27';

export const THEMES: Record<string, Theme> = {
  vip: {
    title: 'VIPs of ceramic (black)',
    page: '#e9e9e6',
    // Pure black, not #121212: the logo and partner images are cut on black
    // and would show as darker boxes (README, "Theme").
    sheet: '#000000',
    text: '#ffffff',
    textSize: 14,
    textLineHeight: '150%',
    headline: '#ffffff',
    headlineSize: 23,
    labelBg: '#ffffff',
    labelText: '#000000',
    labelSize: 18,
    subtitle: '#ffffff',
    subtitleSize: 16,
    buttonBg: '#ffffff',
    buttonText: '#000000',
    line: '#ffffff',
    rule: '#4a4a4a',
    highlight: YELLOW,
    highlightText: '#000000',
    accent: OCHRE,
    header: '',
    headerText: '#000000',
    legal: '#6b6b6b',
    footer: 'brussels',
  },
  monthly: {
    title: 'Monthly (white, yellow header)',
    page: '#e9e9e6',
    sheet: '#ffffff',
    text: '#000000',
    textSize: 12.5,
    textLineHeight: '128%',
    headline: '#000000',
    headlineSize: 22,
    labelBg: '#000000',
    labelText: '#ffffff',
    labelSize: 22,
    subtitle: '#000000',
    subtitleSize: 19,
    buttonBg: '#bfbfbf',
    buttonText: '#000000',
    line: '#000000',
    rule: '#000000',
    highlight: YELLOW,
    highlightText: '#000000',
    accent: OCHRE,
    header: YELLOW,
    headerText: '#000000',
    legal: '#6b6b6b',
    footer: 'brussels',
  },
  galleries: {
    title: 'Participating galleries (white and yellow)',
    page: '#e9e9e6',
    sheet: '#ffffff',
    text: '#000000',
    textSize: 15.5,
    textLineHeight: '125%',
    headline: '#000000',
    headlineSize: 21.5,
    labelBg: '#000000',
    labelText: '#ffffff',
    labelSize: 21,
    subtitle: '#000000',
    subtitleSize: 19,
    buttonBg: YELLOW,
    buttonText: '#000000',
    line: '#000000',
    rule: '#000000',
    highlight: YELLOW,
    highlightText: '#000000',
    accent: YELLOW,
    header: '',
    headerText: '#000000',
    legal: '#6b6b6b',
    // The original campaign carries ceramic basel's footer (README, "worth a
    // look"); the newsletter's own Footer field decides, this is the default.
    footer: 'brussels',
  },
  basel: {
    title: 'Destination Basel (white and ochre)',
    page: '#e9e9e6',
    sheet: '#ffffff',
    text: '#000000',
    textSize: 14,
    textLineHeight: '130%',
    headline: '#000000',
    headlineSize: 23,
    labelBg: OCHRE,
    labelText: '#000000',
    labelSize: 21,
    subtitle: '#000000',
    subtitleSize: 18,
    buttonBg: OCHRE,
    buttonText: '#000000',
    line: OCHRE,
    rule: OCHRE,
    highlight: YELLOW,
    highlightText: '#000000',
    accent: OCHRE,
    header: OCHRE,
    headerText: '#000000',
    legal: '#6b6b6b',
    footer: 'basel',
  },
};

export const THEME_OPTIONS = Object.entries(THEMES).map(([value, t]) => ({ value, title: t.title }));

/**
 * The colours an editor may give a piece of text (the "Text colour" mark).
 * Named, never free: a picked hex could make text vanish on one theme, a
 * name maps to a colour that works on each.
 */
export const TEXT_COLOURS: Record<string, { title: string; value: (t: Theme) => string }> = {
  highlight: { title: 'Yellow', value: (t) => t.highlight },
  accent: { title: 'Ochre', value: (t) => t.accent },
  grey: { title: 'Grey', value: () => '#8a8a8a' },
};

export const themeOf = (name?: string): Theme => THEMES[name ?? ''] ?? THEMES.monthly;
