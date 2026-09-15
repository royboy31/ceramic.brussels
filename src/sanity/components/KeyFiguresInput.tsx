import React, { useEffect, useState } from 'react';
import { Button, Card, Flex, Stack, Text } from '@sanity/ui';
import { useClient, type ObjectInputProps } from 'sanity';

/**
 * The key figures block's form, with the figures it will show under its
 * fields. The numbers belong to an edition - the homepage, /editions and the
 * year pages all read the same list - so they are edited there; this shows
 * them here, says which edition, and has a button to it. Without it the block
 * held only its link and looked empty (feedback, 2026-09-11: "stats not
 * showing").
 */

interface Figures {
  _id: string;
  year?: number;
  figures?: { _key: string; value?: string; label?: string }[];
}

const FIELDS = `{ _id, year, "figures": keyFigures[]{ _key, value, "label": label.en } }`;

export function KeyFiguresInput(props: ObjectInputProps) {
  const client = useClient({ apiVersion: '2025-02-19' });
  const ref = (props.value as { edition?: { _ref?: string } } | undefined)?.edition?._ref;
  const [data, setData] = useState<Figures | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    const query = ref
      ? `*[_id == $ref][0]${FIELDS}`
      : `*[_type == "edition" && count(keyFigures) > 0 && !(_id in path("drafts.**"))] | order(year desc)[0]${FIELDS}`;
    client
      .fetch<Figures | null>(query, ref ? { ref } : {})
      .then((result) => live && setData(result))
      .catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, [client, ref]);

  const heading =
    data === undefined ? 'Loading the figures…' : data?.figures?.length ? `Shows the ${data.year} figures` : 'This edition has no key figures yet';

  return (
    <Stack gap={4}>
      {props.renderDefault(props)}
      <Card padding={3} radius={2} tone="primary" border>
        <Stack gap={3}>
          <Text size={1} weight="semibold">
            {heading}
          </Text>
          {data?.figures?.map((figure) => (
            <Text key={figure._key} size={1}>
              <strong>{figure.value}</strong> {figure.label}
            </Text>
          ))}
          {data?._id && (
            <Flex>
              <Button
                as="a"
                href={`#/intent/edit/id=${data._id.replace(/^drafts\./, '')};type=edition;path=keyFigures`}
                mode="ghost"
                text={`Edit the ${data.year} figures`}
              />
            </Flex>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
