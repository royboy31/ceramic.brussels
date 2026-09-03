import React from 'react';
import type { BlockDecoratorProps, BlockStyleProps } from 'sanity';

/**
 * How the rich-text styling controls look inside the Studio.
 *
 * Editors get swatch buttons rather than a colour picker: the values below are
 * copies of the tokens in src/layouts/Base.astro, so what the Studio shows and
 * what the site renders stay the same thing. Nothing here ends up in the
 * content - a mark is stored as its name ("highlight"), and the page decides
 * what that looks like. Rebranding is a CSS change, not a content migration.
 *
 * Keep these four constants in step with :root in Base.astro if the palette
 * moves.
 */
const ACID = '#fff350';
const INK = '#050505';
const INK_2 = '#55534f';
const GROUND = '#ffffff';

/** Toolbar button: a letter A on the colour the mark actually produces. */
function Swatch({ fill, ink, label }: { fill: string; ink: string; label: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" role="img" aria-label={label}>
      <rect x="1.5" y="1.5" width="14" height="14" rx="3" fill={fill} stroke="rgba(0,0,0,0.25)" />
      <text
        x="8.5"
        y="12.25"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill={ink}
        fontFamily="Helvetica, Arial, sans-serif"
      >
        A
      </text>
    </svg>
  );
}

export const HighlightIcon = () => <Swatch fill={ACID} ink={INK} label="Highlight" />;
export const MutedIcon = () => <Swatch fill={GROUND} ink={INK_2} label="Muted" />;
export const InverseIcon = () => <Swatch fill={INK} ink={GROUND} label="Inverse" />;

/* Previews inside the editor, so a mark looks on screen like it will on the
   page instead of being an invisible state on a toolbar button. */

export const HighlightDecorator = (props: BlockDecoratorProps) => (
  <span style={{ background: ACID, padding: '0 0.15em' }}>{props.children}</span>
);

export const MutedDecorator = (props: BlockDecoratorProps) => (
  <span style={{ color: INK_2 }}>{props.children}</span>
);

export const InverseDecorator = (props: BlockDecoratorProps) => (
  <span style={{ background: INK, color: GROUND, padding: '0 0.2em' }}>{props.children}</span>
);

export const LeadStyle = (props: BlockStyleProps) => (
  <div style={{ fontSize: '1.2em', lineHeight: 1.45 }}>{props.children}</div>
);

export const SmallStyle = (props: BlockStyleProps) => (
  <div style={{ fontSize: '0.85em', color: INK_2 }}>{props.children}</div>
);
