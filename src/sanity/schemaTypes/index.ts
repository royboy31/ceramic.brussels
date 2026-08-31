import type { SchemaTypeDefinition } from 'sanity';

import { localeString, localeText, localeBlock, localeSlug } from './objects/localeString';
import { figure } from './objects/figure';
import { seo } from './objects/seo';
import { link } from './objects/link';
import { artwork } from './objects/artwork';
import { navItem } from './objects/navItem';

import { edition } from './documents/edition';
import { exhibitor } from './documents/exhibitor';
import { artist } from './documents/artist';
import { newsItem } from './documents/newsItem';
import { page } from './documents/page';
import { programmeEvent } from './documents/programmeEvent';
import { partner } from './documents/partner';
import { pressClip } from './documents/pressClip';
import { award } from './documents/award';
import { siteSettings } from './documents/siteSettings';
import { navigation } from './documents/navigation';

export const objectTypes: SchemaTypeDefinition[] = [
  localeString,
  localeText,
  localeBlock,
  localeSlug,
  figure,
  seo,
  link,
  artwork,
  navItem,
];

export const documentTypes: SchemaTypeDefinition[] = [
  edition,
  exhibitor,
  artist,
  newsItem,
  page,
  programmeEvent,
  partner,
  pressClip,
  award,
  siteSettings,
  navigation,
];

export const schemaTypes: SchemaTypeDefinition[] = [...objectTypes, ...documentTypes];
