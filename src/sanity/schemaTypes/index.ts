import type { SchemaTypeDefinition } from 'sanity';

import { localeString, localeText, localeBlock, localeSlug } from './objects/localeString';
import { figure } from './objects/figure';
import { seo } from './objects/seo';
import { textStyle } from './objects/textStyle';
import { link } from './objects/link';
import { artwork } from './objects/artwork';
import { navItem, navChild } from './objects/navItem';
import { contentSection, spotlight, video } from './objects/section';
import { pageBuilderTypes } from './objects/pageBuilder';
import {
  keyFigure,
  openingSlot,
  openingDay,
  ticketType,
  accessMode,
  faqItem,
  pressContact,
} from './objects/visitor';

import { edition } from './documents/edition';
import { exhibitor } from './documents/exhibitor';
import { artist } from './documents/artist';
import { laureate } from './documents/laureate';
import { award } from './documents/award';
import { person } from './documents/person';
import { newsItem } from './documents/newsItem';
import { page } from './documents/page';
import { pageTemplate } from './documents/pageTemplate';
import { programmeEvent } from './documents/programmeEvent';
import { partner } from './documents/partner';
import { pressClip } from './documents/pressClip';
import { homepage } from './documents/homepage';
import { siteSettings } from './documents/siteSettings';
import { navigation } from './documents/navigation';

export const objectTypes: SchemaTypeDefinition[] = [
  localeString,
  localeText,
  localeBlock,
  localeSlug,
  figure,
  seo,
  textStyle,
  link,
  artwork,
  navChild,
  navItem,
  contentSection,
  spotlight,
  video,
  ...pageBuilderTypes,
  keyFigure,
  openingSlot,
  openingDay,
  ticketType,
  accessMode,
  faqItem,
  pressContact,
];

export const documentTypes: SchemaTypeDefinition[] = [
  edition,
  exhibitor,
  artist,
  laureate,
  award,
  person,
  newsItem,
  page,
  pageTemplate,
  programmeEvent,
  partner,
  pressClip,
  homepage,
  siteSettings,
  navigation,
];

export const schemaTypes: SchemaTypeDefinition[] = [...objectTypes, ...documentTypes];
