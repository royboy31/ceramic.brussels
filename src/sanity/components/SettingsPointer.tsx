import { Card, Stack, Text } from '@sanity/ui';
import { LaunchIcon } from '@sanity/icons/Launch';

/**
 * A line in a page form pointing at a field that lives somewhere else.
 *
 * Some of what a page prints is not on the page: the VIP hotel tab's "special
 * rate" panel is on Site settings, because Visitors info prints the same
 * hotel deal and the two must not drift. An editor standing on the hotel page
 * has no way to know that, and went looking for the rate in the page form
 * (Kamindu, 2026-10-01). This says where it is and opens it.
 *
 * The Studio is on hash routing, so the href is a plain in-app link; it is
 * rendered from `SETTINGS_POINTERS` in page.ts, never typed by an editor, so
 * there is nothing here to validate.
 */
export function SettingsPointer(props: { href: string; title: string; note: string }) {
  const { href, title, note } = props;
  return (
    <Card padding={3} radius={2} tone="primary" border>
      <Stack space={3}>
        <Text size={1} weight="semibold">
          {note}
        </Text>
        <Text size={1}>
          <a href={href} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35em' }}>
            {title} <LaunchIcon />
          </a>
        </Text>
      </Stack>
    </Card>
  );
}
