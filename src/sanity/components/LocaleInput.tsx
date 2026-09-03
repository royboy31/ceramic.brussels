import React, { useState } from 'react';
import { Badge, Box, Card, Flex, Tab, TabList, TabPanel, Text } from '@sanity/ui';
import type { ObjectInputProps } from 'sanity';
import { DEFAULT_LOCALE } from '../../lib/locales';
import { useEditingLocale } from './localeState';

/**
 * Renders a localised object (localeString / localeText / localeBlock /
 * localeSlug) as two tabs: what it says, and how it looks.
 *
 * **Content** shows one language - whichever is selected in the top bar, so a
 * field never turns into three stacked inputs.
 *
 * **Style** is the optional `style` member. It is a separate tab rather than
 * another field because styling is a different task from writing: an editor
 * fixing a typo should never scroll past a colour picker, and someone laying
 * out a page should see every control for that field in one place.
 *
 * The tab strip only appears on types that actually have a style member, so
 * slugs and anything else localised keep the plain single-language editor.
 */
export function LocaleInput(props: ObjectInputProps) {
  const locale = useEditingLocale();
  const [tab, setTab] = useState<'content' | 'style'>('content');

  const fieldMembers = props.members.filter(
    (member): member is Extract<typeof member, { kind: 'field' }> => member.kind === 'field',
  );

  // Nothing recognisable to narrow - render normally rather than hiding the
  // editor behind a broken filter.
  if (fieldMembers.length === 0) return props.renderDefault(props);

  const styleMember = fieldMembers.find((m) => m.name === 'style');
  const localeMembers = fieldMembers.filter((m) => m.name !== 'style');
  const active = localeMembers.find((m) => m.name === locale);

  const content = !active ? (
    <Card tone="caution" padding={3} radius={2} border>
      <Text size={1}>
        This field has no {locale.toUpperCase()} version. Add {locale} to the locale list to edit
        it here.
      </Text>
    </Card>
  ) : (
    // Reuse Sanity's own object rendering, narrowed to the chosen language, so
    // validation, comments and the field menu all keep working.
    props.renderDefault({ ...props, members: [active] })
  );

  if (!styleMember) return content;

  // Tells the editor at a glance that a field carries styling, so an unexpected
  // size or colour on the page can be traced without opening every tab.
  const styled = hasStyle(props.value as Record<string, unknown> | undefined);

  return (
    <Card radius={2}>
      <TabList space={1}>
        <Tab
          id="tab-content"
          aria-controls="panel-content"
          label="Content"
          selected={tab === 'content'}
          onClick={() => setTab('content')}
        />
        <Tab
          id="tab-style"
          aria-controls="panel-style"
          selected={tab === 'style'}
          onClick={() => setTab('style')}
          label="Style"
        />
        {styled && (
          <Flex align="center" paddingLeft={2}>
            <Badge tone="primary" fontSize={0}>
              styled
            </Badge>
          </Flex>
        )}
      </TabList>

      <TabPanel id="panel-content" aria-labelledby="tab-content" hidden={tab !== 'content'}>
        <Box paddingTop={3}>{content}</Box>
      </TabPanel>

      <TabPanel id="panel-style" aria-labelledby="tab-style" hidden={tab !== 'style'}>
        <Box paddingTop={3}>
          {props.renderDefault({ ...props, members: [styleMember] })}
        </Box>
      </TabPanel>
    </Card>
  );
}

/** True when the style object holds anything an editor actually chose. */
function hasStyle(value: Record<string, unknown> | undefined): boolean {
  const style = value?.style as Record<string, unknown> | undefined;
  if (!style) return false;
  return Object.entries(style).some(
    ([key, entry]) => key !== '_type' && entry !== undefined && entry !== null && entry !== '',
  );
}

/** The default locale, re-exported so callers do not reach past this module. */
export { DEFAULT_LOCALE };
