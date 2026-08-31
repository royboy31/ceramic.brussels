import React, { useCallback } from 'react';
import { Box, Card, Flex, Select, Stack, Text } from '@sanity/ui';
import type { NavbarProps } from 'sanity';
import { LOCALES, DEFAULT_LOCALE, type LocaleId } from '../../lib/locales';
import { setEditingLocale, useEditingLocale } from './localeState';

/**
 * Adds a language selector to the Studio chrome. Whatever is chosen here is the
 * language every localised field shows, across every document.
 *
 * Sanity's default navbar has no injection slot, so this renders it unchanged
 * and puts the selector in a strip directly beneath it - full width, always
 * visible, and it survives a reload.
 */
export function StudioNavbar(props: NavbarProps) {
  const locale = useEditingLocale();

  const onChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setEditingLocale(event.currentTarget.value as LocaleId);
  }, []);

  const active = LOCALES.find((l) => l.id === locale);

  return (
    <Stack>
      {props.renderDefault(props)}

      <Card paddingX={3} paddingY={2} borderBottom tone={locale === DEFAULT_LOCALE ? 'default' : 'primary'}>
        <Flex align="center" gap={3}>
          <Text size={1} weight="medium">
            Editing language
          </Text>

          <Box style={{ minWidth: '11rem' }}>
            <Select
              value={locale}
              onChange={onChange}
              fontSize={1}
              padding={2}
              aria-label="Language to edit content in"
            >
              {LOCALES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} ({l.id.toUpperCase()})
                </option>
              ))}
            </Select>
          </Box>

          <Text size={1} muted>
            {locale === DEFAULT_LOCALE
              ? 'Every field below is shown in English.'
              : `Every field below is shown in ${active?.title}. Empty fields fall back to ${DEFAULT_LOCALE.toUpperCase()}.`}
          </Text>
        </Flex>
      </Card>
    </Stack>
  );
}
