import type { StructureResolver } from 'sanity/structure';

/**
 * Groups the Studio by edition instead of listing document types alphabetically.
 * The team lives in here for the weeks before a fair, so the current edition and
 * its exhibitors are what should be one click away.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Ceramic Brussels')
    .items([
      S.listItem()
        .title('Site settings')
        .id('siteSettings')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings')),

      S.listItem()
        .title('Navigation')
        .id('navigation')
        .child(S.document().schemaType('navigation').documentId('navigation')),

      S.divider(),

      S.listItem()
        .title('Editions')
        .schemaType('edition')
        .child(S.documentTypeList('edition').title('Editions')),

      S.listItem()
        .title('Exhibitors')
        .schemaType('exhibitor')
        .child(
          S.documentTypeList('exhibitor')
            .title('Exhibitors')
            .defaultOrdering([{ field: 'name', direction: 'asc' }]),
        ),

      S.listItem()
        .title('Artists')
        .schemaType('artist')
        .child(
          S.documentTypeList('artist')
            .title('Artists')
            .defaultOrdering([{ field: 'name', direction: 'asc' }]),
        ),

      S.divider(),

      S.listItem()
        .title('News')
        .schemaType('newsItem')
        .child(
          S.documentTypeList('newsItem')
            .title('News')
            .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }]),
        ),

      S.listItem()
        .title('Programme')
        .schemaType('programmeEvent')
        .child(
          S.documentTypeList('programmeEvent')
            .title('Programme')
            .defaultOrdering([{ field: 'startsAt', direction: 'asc' }]),
        ),

      S.listItem()
        .title('Awards')
        .schemaType('award')
        .child(S.documentTypeList('award').title('Awards')),

      S.divider(),

      S.listItem()
        .title('Pages')
        .schemaType('page')
        .child(
          S.documentTypeList('page')
            .title('Pages')
            .defaultOrdering([{ field: 'navOrder', direction: 'asc' }]),
        ),

      S.listItem()
        .title('Partners')
        .schemaType('partner')
        .child(
          S.documentTypeList('partner')
            .title('Partners')
            .defaultOrdering([{ field: 'order', direction: 'asc' }]),
        ),

      S.listItem()
        .title('Press')
        .schemaType('pressClip')
        .child(
          S.documentTypeList('pressClip')
            .title('Press')
            .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }]),
        ),
    ]);
