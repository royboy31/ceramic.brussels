/**
 * Per-field styling: the tokens editors choose from, and the code that turns a
 * stored style into CSS.
 *
 * This module is the single source of truth for both halves. The Studio builds
 * its dropdowns from these lists and the pages render from the same maps, so a
 * value an editor can pick is always a value the site can draw.
 *
 * Two rules shape the design:
 *
 * 1. **A token stores its name, not its value.** `size: 'lg'` is stored, not
 *    `1.5rem`, so the scale can be retuned in one place without a content
 *    migration. Only the free-text overrides store a literal.
 *
 * 2. **Overrides are sanitised, never trusted.** The values reach a `style`
 *    attribute, so anything that could close a declaration and start another
 *    is rejected rather than escaped - see `safeCssValue`.
 */

export interface Option {
  readonly title: string;
  readonly value: string;
}

/* ---------- the token scales ---------- */

export const SIZES = [
  { title: 'Extra small', value: 'xs' },
  { title: 'Small', value: 'sm' },
  { title: 'Body', value: 'base' },
  { title: 'Medium', value: 'md' },
  { title: 'Large', value: 'lg' },
  { title: 'Extra large', value: 'xl' },
  { title: 'Display', value: 'display' },
  { title: 'Hero', value: 'hero' },
] as const;

const SIZE_CSS: Record<string, string> = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  md: '1.125rem',
  lg: '1.5rem',
  xl: '2rem',
  display: 'clamp(2.25rem, 5vw, 3.25rem)',
  hero: 'clamp(3rem, 9vw, 6rem)',
};

export const WEIGHTS = [
  { title: 'Regular', value: 'regular' },
  { title: 'Medium', value: 'medium' },
  { title: 'Bold', value: 'bold' },
] as const;

const WEIGHT_CSS: Record<string, string> = { regular: '400', medium: '500', bold: '700' };

export const COLOURS = [
  { title: 'Ink', value: 'ink' },
  { title: 'Muted', value: 'muted' },
  { title: 'Faint', value: 'faint' },
  { title: 'Accent', value: 'accent' },
  { title: 'Acid', value: 'acid' },
  { title: 'Paper', value: 'paper' },
  { title: 'White', value: 'ground' },
] as const;

const COLOUR_CSS: Record<string, string> = {
  ink: 'var(--ink)',
  muted: 'var(--ink-2)',
  faint: 'var(--ink-3)',
  accent: 'var(--accent)',
  acid: 'var(--acid)',
  paper: 'var(--paper)',
  ground: 'var(--ground)',
};

export const ALIGNMENTS = [
  { title: 'Left', value: 'left' },
  { title: 'Centre', value: 'center' },
  { title: 'Right', value: 'right' },
] as const;

export const TRANSFORMS = [
  { title: 'As typed', value: 'none' },
  { title: 'UPPERCASE', value: 'uppercase' },
  { title: 'lowercase', value: 'lowercase' },
  { title: 'Capitalise', value: 'capitalize' },
] as const;

export const SPACING = [
  { title: 'None', value: 'none' },
  { title: 'Extra small', value: 'xs' },
  { title: 'Small', value: 'sm' },
  { title: 'Medium', value: 'md' },
  { title: 'Large', value: 'lg' },
  { title: 'Extra large', value: 'xl' },
] as const;

const SPACING_CSS: Record<string, string> = {
  none: '0',
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '2rem',
  xl: '3rem',
};

/* ---------- the stored shape ---------- */

export interface TextStyle {
  size?: string;
  customSize?: string;
  weight?: string;
  colour?: string;
  customColour?: string;
  background?: string;
  customBackground?: string;
  align?: string;
  transform?: string;
  lineHeight?: string;
  letterSpacing?: string;
  marginTop?: string;
  marginBottom?: string;
  italic?: boolean;
  underline?: boolean;
}

/**
 * Lets a free-text override through only if it cannot escape the declaration
 * it lands in. Anything with a semicolon, brace, url() or comment is dropped
 * rather than sanitised, because a half-cleaned value is worse than no value.
 */
export function safeCssValue(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value || value.length > 60) return null;
  if (/[;{}<>\\]/.test(value)) return null;
  if (/url\s*\(|expression|@import|javascript:|\/\*/i.test(value)) return null;
  // Lengths, percentages, hex/rgb/hsl colours, keywords, calc/clamp/var.
  if (!/^[a-zA-Z0-9\s.,%#()+\-*/]+$/.test(value)) return null;
  return value;
}

const token = (map: Record<string, string>, key: string | undefined) =>
  key && key in map ? map[key] : null;

/**
 * Turns a stored style into declarations for a `style` attribute.
 * Returns an empty string when nothing is set, so an unstyled field renders
 * exactly the markup it always did.
 */
export function styleToCss(style: TextStyle | null | undefined): string {
  if (!style) return '';
  const out: string[] = [];

  const size = safeCssValue(style.customSize) ?? token(SIZE_CSS, style.size);
  if (size) out.push(`font-size:${size}`);

  const weight = token(WEIGHT_CSS, style.weight);
  if (weight) out.push(`font-weight:${weight}`);

  const colour = safeCssValue(style.customColour) ?? token(COLOUR_CSS, style.colour);
  if (colour) out.push(`color:${colour}`);

  const background = safeCssValue(style.customBackground) ?? token(COLOUR_CSS, style.background);
  if (background) out.push(`background-color:${background}`);

  if (style.align && ALIGNMENTS.some((a) => a.value === style.align)) {
    out.push(`text-align:${style.align}`);
  }
  if (style.transform && style.transform !== 'none' && TRANSFORMS.some((t) => t.value === style.transform)) {
    out.push(`text-transform:${style.transform}`);
  }

  const lineHeight = safeCssValue(style.lineHeight);
  if (lineHeight) out.push(`line-height:${lineHeight}`);

  const letterSpacing = safeCssValue(style.letterSpacing);
  if (letterSpacing) out.push(`letter-spacing:${letterSpacing}`);

  const marginTop = token(SPACING_CSS, style.marginTop);
  if (marginTop) out.push(`margin-top:${marginTop}`);

  const marginBottom = token(SPACING_CSS, style.marginBottom);
  if (marginBottom) out.push(`margin-bottom:${marginBottom}`);

  if (style.italic) out.push('font-style:italic');
  if (style.underline) out.push('text-decoration:underline');

  // Padding only when there is a background, or the colour hugs the text.
  if (background) out.push('padding:0.15em 0.4em');

  return out.join(';');
}

/**
 * Spread onto any element: `<h1 {...styleAttrs(data.titleStyle)}>`.
 * Astro drops a `style` of undefined, so unstyled fields stay clean.
 */
export function styleAttrs(style: TextStyle | null | undefined): { style?: string } {
  const css = styleToCss(style);
  return css ? { style: css } : {};
}
