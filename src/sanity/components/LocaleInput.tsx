import React from 'react';
import { Card, Text } from '@sanity/ui';
import type { ObjectInputProps } from 'sanity';
import { DEFAULT_LOCALE } from '../../lib/locales';
import { useEditingLocale } from './localeState';

/**
 * Renders a localised object (localeString / localeText / localeBlock /
 * localeSlug) in whichever language is selected in the top bar - one language,
 * no per-field switcher.
 */
export function LocaleInput(props: ObjectInputProps) {
  const locale = useEditingLocale();

  const fieldMembers = props.members.filter(
    (member): member is Extract<typeof member, { kind: 'field' }> => member.kind === 'field',
  );

  // Nothing recognisable to narrow - render normally rather than hiding the
  // editor behind a broken filter.
  if (fieldMembers.length === 0) return props.renderDefault(props);

  const active = fieldMembers.find((m) => m.name === locale);

  if (!active) {
    return (
      <Card tone="caution" padding={3} radius={2} border>
        <Text size={1}>
          This field has no {locale.toUpperCase()} version. Add {locale} to the locale list to edit
          it here.
        </Text>
      </Card>
    );
  }

  // Reuse Sanity's own object rendering, narrowed to the chosen language, so
  // validation, comments and the field menu all keep working.
  return props.renderDefault({ ...props, members: [active] });
}

/** Suffix for field titles, e.g. "Title (FR)". Keeps context visible when scrolling. */
export function localeFieldTitleSuffix(locale: string): string {
  return locale === DEFAULT_LOCALE ? '' : ` (${locale.toUpperCase()})`;
}
