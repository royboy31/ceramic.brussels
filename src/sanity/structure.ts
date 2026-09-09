import type { StructureBuilder, StructureResolver, StructureResolverContext } from 'sanity/structure';
import { PARTNER_TIERS } from './schemaTypes/documents/partner';
import { PERSON_GROUPS } from './schemaTypes/documents/person';
import { PAGE_SECTIONS } from './schemaTypes/objects/routes';
import { MAIN_PAGES, isListingSection, type MainPage } from './mainPages';

/**
 * Which document is each main page today, by section: a hub's root is the
 * page carrying its first tab's slug (else the lowest `order` in the
 * section), a listing's is the one page in its section. Read once, when the
 * sidebar is built. A section with no page maps to nothing and its entry
 * creates one on first open. Nothing here may blank the Studio, so a failed
 * read degrades to "nothing found" and every entry falls back to creating.
 */
async function currentMainPageIds(context: StructureResolverContext): Promise<Record<string, string>> {
  try {
    const rows: { _id: string; section: string; slug?: string }[] = await context
      .getClient({ apiVersion: '2024-01-01' })
      .fetch(
        `*[_type == "page" && defined(section)] | order(order asc){ _id, section, "slug": slug.en.current }`,
        {},
        { perspective: 'drafts' },
      );
    const ids: Record<string, string> = {};
    for (const main of MAIN_PAGES) {
      const own = rows.filter((r) => r.section === main.section);
      const hit = own.find((r) => r.slug === main.slug) ?? own[0];
      if (hit) ids[main.section] = hit._id.replace(/^drafts\./, '');
    }
    return ids;
  } catch {
    return {};
  }
}

/** One sidebar entry per main page, opening its document the way Homepage opens its singleton. */
function mainPageItem(S: StructureBuilder, main: MainPage, id: string | undefined) {
  const doc = id
    ? S.document().schemaType('page').documentId(id)
    : S.document()
        .schemaType('page')
        .documentId(main.fallbackId)
        .initialValueTemplate('page-main', { section: main.section, slug: main.slug, title: main.title });
  return S.listItem().title(main.title).id(`main-${main.section}`).schemaType('page').child(doc);
}

/**
 * Groups the Studio the way the site is organised rather than listing document
 * types alphabetically. The main pages come first, one document each, in a
 * folder of their own. The team lives in here for the weeks before a fair, so
 * the current edition's exhibitors, laureates and programme are one click away,
 * and the hub pages (about, art prize, visitors info…) show their tabs together.
 */
export const structure: StructureResolver = async (S, context) => {
  const mainIds = await currentMainPageIds(context);

  return S.list()
    .title('ceramic brussels')
    .items([
      // The main pages, one document each, under one heading so the sidebar
      // never shows "Exhibitors" twice - the page here, the list of exhibitor
      // documents further down. See mainPages.ts.
      S.listItem()
        .title('Main pages')
        .id('main-pages')
        .child(
          S.list()
            .title('Main pages')
            .items([
              S.listItem()
                .title('Homepage')
                .id('homepage')
                .schemaType('homepage')
                .child(S.document().schemaType('homepage').documentId('homepage')),
              ...MAIN_PAGES.map((main) => mainPageItem(S, main, mainIds[main.section])),
            ]),
        ),

      S.divider(),

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
                    .defaultOrdering([{ field: 'order', direction: 'asc' }])
                    .initialValueTemplates([S.initialValueTemplateItem('page-hub-art-prize')]),
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
        .title('Visitors info — tabs')
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
                    .defaultOrdering([{ field: 'order', direction: 'asc' }])
                    .initialValueTemplates([S.initialValueTemplateItem('page-hub-visit')]),
                ),
            ]),
        ),

      S.listItem()
        .title('About — tabs')
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
                    .defaultOrdering([{ field: 'order', direction: 'asc' }])
                    .initialValueTemplates([S.initialValueTemplateItem('page-hub-about')]),
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
              ...PAGE_SECTIONS.map((s) => {
                const listing = isListingSection(s.value);
                const title = listing ? `${s.title} page` : `${s.title} tabs`;
                const main = MAIN_PAGES.find((mp) => mp.section === s.value)!;
                return S.listItem()
                  .title(title)
                  .id(`pages-${s.value}`)
                  .child(
                    S.documentList()
                      .title(title)
                      .schemaType('page')
                      .filter('_type == "page" && section == $section')
                      .params({ section: s.value })
                      .defaultOrdering([{ field: 'order', direction: 'asc' }])
                      // Without this the create button in a filtered pane makes a
                      // page with no section - which promptly vanishes from the
                      // list that made it, because it no longer matches the filter.
                      // A listing has no tabs, so its pane offers the main page.
                      .initialValueTemplates([
                        listing
                          ? S.initialValueTemplateItem('page-main', { section: main.section, slug: main.slug, title: main.title })
                          : S.initialValueTemplateItem(`page-hub-${s.value}`),
                      ]),
                  );
              }),
              S.listItem()
                .title('Standalone pages')
                .id('pages-standalone')
                .child(
                  S.documentList()
                    .title('Standalone pages')
                    .schemaType('page')
                    .filter('_type == "page" && !defined(section)')
                    .defaultOrdering([{ field: 'order', direction: 'asc' }])
                    .initialValueTemplates([
                      S.initialValueTemplateItem('page-text'),
                      S.initialValueTemplateItem('page-sections'),
                    ]),
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

      S.divider(),

      // Ready-made section stacks. Applied from a page's menu ("Apply
      // template…"), made from one ("Save as template"), and edited here.
      S.listItem()
        .title('Page templates')
        .schemaType('pageTemplate')
        .child(
          S.documentTypeList('pageTemplate')
            .title('Page templates')
            .defaultOrdering([{ field: 'order', direction: 'asc' }]),
        ),
    ]);
};
