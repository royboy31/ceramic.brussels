import type { StructureResolver } from 'sanity/structure';
import { PARTNER_TIERS } from './schemaTypes/documents/partner';
import { PERSON_GROUPS } from './schemaTypes/documents/person';
import { PAGE_SECTIONS } from './schemaTypes/objects/routes';

/**
 * Groups the Studio the way the site is organised rather than listing document
 * types alphabetically. The team lives in here for the weeks before a fair, so
 * the current edition's exhibitors, laureates and programme are one click away,
 * and the hub pages (about, art prize, visitors info…) show their tabs together.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('ceramic brussels')
    .items([
      S.listItem()
        .title('Homepage')
        .id('homepage')
        .child(S.document().schemaType('homepage').documentId('homepage')),

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
          S.list()
            .title('Exhibitors')
            .items([
              S.listItem()
                .title('Current edition')
                .id('exhibitors-current')
                .child(
                  S.documentList()
                    .title('Exhibitors — current edition')
                    .schemaType('exhibitor')
                    .filter('_type == "exhibitor" && edition->isCurrent == true')
                    .defaultOrdering([{ field: 'name', direction: 'asc' }]),
                ),
              S.listItem()
                .title('All editions')
                .id('exhibitors-all')
                .child(
                  S.documentTypeList('exhibitor')
                    .title('All exhibitors')
                    .defaultOrdering([{ field: 'name', direction: 'asc' }]),
                ),
            ]),
        ),

      S.listItem()
        .title('Artists')
        .schemaType('artist')
        .child(
          S.documentTypeList('artist')
            .title('Artists')
            .defaultOrdering([{ field: 'name', direction: 'asc' }]),
        ),

      // The guest of honour is a reference on the current edition; this opens
      // the artist behind it so editors find it under the name the site uses.
      S.listItem()
        .title('Guest of honour')
        .id('guest-of-honour')
        .child(
          S.documentList()
            .title('Guest of honour')
            .schemaType('artist')
            .filter('_type == "artist" && _id in *[_type == "edition" && isCurrent == true].guestOfHonour._ref'),
        ),

      S.divider(),

      S.listItem()
        .title('Art prize')
        .id('art-prize')
        .child(
          S.list()
            .title('Art prize')
            .items([
              S.listItem()
                .title('Laureates')
                .schemaType('laureate')
                .child(
                  S.documentTypeList('laureate')
                    .title('Laureates')
                    .defaultOrdering([{ field: 'order', direction: 'asc' }]),
                ),
              S.listItem()
                .title('Awards')
                .schemaType('award')
                .child(
                  S.documentTypeList('award')
                    .title('Awards')
                    .defaultOrdering([{ field: 'order', direction: 'asc' }]),
                ),
              S.listItem()
                .title('Jury')
                .id('jury')
                .child(
                  S.documentList()
                    .title('Jury')
                    .schemaType('person')
                    .filter('_type == "person" && "jury" in groups')
                    .defaultOrdering([{ field: 'order', direction: 'asc' }]),
                ),
              S.listItem()
                .title('Pages')
                .id('art-prize-pages')
                .child(
                  S.documentList()
                    .title('Art prize pages')
                    .schemaType('page')
                    .filter('_type == "page" && section == "art-prize"')
                    .defaultOrdering([{ field: 'order', direction: 'asc' }]),
                ),
            ]),
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
        .title('News')
        .schemaType('newsItem')
        .child(
          S.documentTypeList('newsItem')
            .title('News')
            .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }]),
        ),

      S.divider(),

      S.listItem()
        .title('People')
        .schemaType('person')
        .child(
          S.list()
            .title('People')
            .items([
              ...PERSON_GROUPS.map((g) =>
                S.listItem()
                  .title(g.title)
                  .id(`people-${g.value}`)
                  .child(
                    S.documentList()
                      .title(g.title)
                      .schemaType('person')
                      .filter('_type == "person" && $group in groups')
                      .params({ group: g.value })
                      .defaultOrdering([{ field: 'order', direction: 'asc' }]),
                  ),
              ),
              S.divider(),
              S.listItem()
                .title('Everyone')
                .id('people-all')
                .child(
                  S.documentTypeList('person')
                    .title('Everyone')
                    .defaultOrdering([{ field: 'name', direction: 'asc' }]),
                ),
            ]),
        ),

      S.listItem()
        .title('Partners')
        .schemaType('partner')
        .child(
          S.list()
            .title('Partners')
            .items([
              ...PARTNER_TIERS.map((t) =>
                S.listItem()
                  .title(t.title)
                  .id(`partners-${t.value}`)
                  .child(
                    S.documentList()
                      .title(t.title)
                      .schemaType('partner')
                      .filter('_type == "partner" && tier == $tier')
                      .params({ tier: t.value })
                      .defaultOrdering([{ field: 'order', direction: 'asc' }]),
                  ),
              ),
              S.divider(),
              S.listItem()
                .title('All partners')
                .id('partners-all')
                .child(
                  S.documentTypeList('partner')
                    .title('All partners')
                    .defaultOrdering([{ field: 'order', direction: 'asc' }]),
                ),
            ]),
        ),

      S.divider(),

      // The two hubs whose content is spread across several types, gathered
      // under the names the menu uses.
      S.listItem()
        .title('Visitors info')
        .id('visitors-info')
        .child(
          S.list()
            .title('Visitors info')
            .items([
              S.listItem()
                .title('Hours, tickets, floor plan (current edition)')
                .id('visit-edition')
                .child(
                  S.documentList()
                    .title('Current edition')
                    .schemaType('edition')
                    .filter('_type == "edition" && isCurrent == true'),
                ),
              S.listItem()
                .title('Venue, access, hotel deal, FAQ (site settings)')
                .id('visit-settings')
                .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
              S.listItem()
                .title('Food & drinks')
                .id('visit-food')
                .child(
                  S.documentList()
                    .title('Food & drinks')
                    .schemaType('partner')
                    .filter('_type == "partner" && tier == "food-drinks"')
                    .defaultOrdering([{ field: 'order', direction: 'asc' }]),
                ),
              S.listItem()
                .title('Tab pages')
                .id('visit-pages')
                .child(
                  S.documentList()
                    .title('Visitors info tabs')
                    .schemaType('page')
                    .filter('_type == "page" && section == "visit"')
                    .defaultOrdering([{ field: 'order', direction: 'asc' }]),
                ),
            ]),
        ),

      S.listItem()
        .title('About')
        .id('about')
        .child(
          S.list()
            .title('About')
            .items([
              S.listItem()
                .title('Tab pages')
                .id('about-pages')
                .child(
                  S.documentList()
                    .title('About tabs')
                    .schemaType('page')
                    .filter('_type == "page" && section == "about"')
                    .defaultOrdering([{ field: 'order', direction: 'asc' }]),
                ),
              S.listItem()
                .title('Advisory board')
                .id('about-board')
                .child(
                  S.documentList()
                    .title('Advisory board')
                    .schemaType('person')
                    .filter('_type == "person" && "advisory-board" in groups')
                    .defaultOrdering([{ field: 'order', direction: 'asc' }]),
                ),
              S.listItem()
                .title('Team')
                .id('about-team')
                .child(
                  S.documentList()
                    .title('Team')
                    .schemaType('person')
                    .filter('_type == "person" && ("team" in groups || "collaborator" in groups)')
                    .defaultOrdering([{ field: 'order', direction: 'asc' }]),
                ),
              S.listItem()
                .title('Press clippings')
                .id('about-press')
                .child(
                  S.documentTypeList('pressClip')
                    .title('Press clippings')
                    .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }]),
                ),
              S.listItem()
                .title('Images (per edition)')
                .id('about-images')
                .child(S.documentTypeList('edition').title('Editions')),
            ]),
        ),

      S.divider(),

      S.listItem()
        .title('Pages')
        .schemaType('page')
        .child(
          S.list()
            .title('Pages')
            .items([
              ...PAGE_SECTIONS.map((s) =>
                S.listItem()
                  .title(`${s.title} tabs`)
                  .id(`pages-${s.value}`)
                  .child(
                    S.documentList()
                      .title(`${s.title} tabs`)
                      .schemaType('page')
                      .filter('_type == "page" && section == $section')
                      .params({ section: s.value })
                      .defaultOrdering([{ field: 'order', direction: 'asc' }]),
                  ),
              ),
              S.listItem()
                .title('Standalone pages')
                .id('pages-standalone')
                .child(
                  S.documentList()
                    .title('Standalone pages')
                    .schemaType('page')
                    .filter('_type == "page" && !defined(section)')
                    .defaultOrdering([{ field: 'order', direction: 'asc' }]),
                ),
              S.divider(),
              S.listItem()
                .title('All pages')
                .id('pages-all')
                .child(
                  S.documentTypeList('page')
                    .title('All pages')
                    .defaultOrdering([{ field: 'order', direction: 'asc' }]),
                ),
            ]),
        ),

      S.listItem()
        .title('Press clippings')
        .schemaType('pressClip')
        .child(
          S.documentTypeList('pressClip')
            .title('Press clippings')
            .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }]),
        ),
    ]);
