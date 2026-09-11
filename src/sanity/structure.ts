import type { ListItemBuilder, StructureBuilder, StructureResolver, StructureResolverContext } from 'sanity/structure';
import { PARTNER_TABS } from '../lib/hubs';
import { PERSON_GROUPS } from './schemaTypes/documents/person';
import { PARTNER_TIERS } from './schemaTypes/documents/partner';
import { MAIN_PAGES, type MainPage } from './mainPages';

/**
 * The sidebar, organised the way the site's menu is: one folder per section,
 * in menu order, each opening with the page that section is made from and
 * then the records that page lists - this year's first, past years in a
 * folder of their own, and whatever the site does not show in a folder that
 * says so. Things every page uses (settings, menu, editions, everyone) are
 * under Setup.
 *
 * Every page of the site has one entry. The few items that open a shared
 * document from a second place say which document they open ("… (Site
 * settings)"), so nothing looks like a separate copy.
 */

interface Lookup {
  /** section → the id of the page that section's folder opens. */
  mainIds: Record<string, string>;
  /** Past edition years, newest first. */
  pastYears: number[];
  current?: { id: string; year: number };
}

/**
 * Read once, when the sidebar is built. Nothing here may blank the Studio, so
 * a failed read degrades to "nothing found": every main-page entry then offers
 * to create its page, and the year folders are empty.
 */
async function lookup(context: StructureResolverContext): Promise<Lookup> {
  try {
    const { pages, editions } = await context.getClient({ apiVersion: '2024-01-01' }).fetch<{
      pages: { _id: string; section: string; slug?: string }[];
      editions: { _id: string; year: number; isCurrent?: boolean }[];
    }>(
      `{
        "pages": *[_type == "page" && defined(section)] | order(order asc){ _id, section, "slug": slug.en.current },
        "editions": *[_type == "edition" && !(_id in path("drafts.**"))] | order(year desc){ _id, year, isCurrent }
      }`,
      {},
      { perspective: 'drafts' },
    );
    const mainIds: Record<string, string> = {};
    for (const main of MAIN_PAGES) {
      const own = pages.filter((p) => p.section === main.section);
      const hit = own.find((p) => p.slug === main.slug) ?? own[0];
      if (hit) mainIds[main.section] = hit._id.replace(/^drafts\./, '');
    }
    const current = editions.find((e) => e.isCurrent);
    return {
      mainIds,
      pastYears: editions.filter((e) => !e.isCurrent).map((e) => e.year),
      current: current ? { id: current._id, year: current.year } : undefined,
    };
  } catch {
    return { mainIds: {}, pastYears: [] };
  }
}

export const structure: StructureResolver = async (S, context) => {
  const { mainIds, pastYears, current } = await lookup(context);
  const thisYear = current ? String(current.year) : 'Current';

  /** The page a section is made from, opened the way Homepage opens its singleton. */
  const mainPage = (section: string, title: string): ListItemBuilder => {
    const main = MAIN_PAGES.find((m) => m.section === section) as MainPage;
    const id = mainIds[section];
    const doc = id
      ? S.document().schemaType('page').documentId(id)
      : S.document()
          .schemaType('page')
          .documentId(main.fallbackId)
          .initialValueTemplate('page-main', { section: main.section, slug: main.slug, title: main.title });
    return S.listItem().title(title).id(`page-${section}`).schemaType('page').child(doc);
  };

  /** A filtered list of one type. `filter` is GROQ on top of the type. */
  const list = (
    id: string,
    title: string,
    type: string,
    filter = 'true',
    params: Record<string, unknown> = {},
    ordering: { field: string; direction: 'asc' | 'desc' }[] = [],
  ) =>
    S.listItem()
      .id(id)
      .title(title)
      .schemaType(type)
      .child(
        S.documentList()
          .id(id)
          .title(title)
          .schemaType(type)
          .filter(`_type == $type && (${filter})`)
          .params({ type, ...params })
          .defaultOrdering(ordering),
      );

  /** A folder with one list per edition: the past ones, or with `all`, this year's first. */
  const byYear = (
    id: string,
    title: string,
    type: string,
    filter = 'true',
    ordering: { field: string; direction: 'asc' | 'desc' }[] = [],
    all = false,
  ) => {
    const years = all && current ? [current.year, ...pastYears] : pastYears;
    return S.listItem()
      .id(id)
      .title(title)
      .child(
        S.list()
          .id(id)
          .title(title)
          .items(years.map((year) => list(`${id}-${year}`, String(year), type, `edition->year == $year && (${filter})`, { year }, ordering))),
      );
  };

  /** A hub's other tab pages - the intros above its lists. Made with the hub; never created here. */
  const tabIntros = (section: string, rootSlug: string, title: string) =>
    S.listItem()
      .id(`tabs-${section}`)
      .title(title)
      .schemaType('page')
      .child(
        S.documentList()
          .id(`tabs-${section}`)
          .title(title)
          .schemaType('page')
          .filter('_type == "page" && section == $section && slug.en.current != $root')
          .params({ section, root: rootSlug })
          .defaultOrdering([{ field: 'order', direction: 'asc' }])
          .initialValueTemplates([]),
      );

  const currentEdition = (id: string, title: string) =>
    current
      ? S.listItem()
          .id(id)
          .title(title)
          .schemaType('edition')
          .child(S.document().schemaType('edition').documentId(current.id))
      : null;

  const siteSettings = (title: string, id: string) =>
    S.listItem().id(id).title(title).schemaType('siteSettings').child(S.document().schemaType('siteSettings').documentId('siteSettings'));

  const byName = [{ field: 'name', direction: 'asc' as const }];
  const byOrder = [{ field: 'order', direction: 'asc' as const }];
  const CURRENT = 'edition->isCurrent == true';
  /** People without an edition (the advisory board) or in the current one. */
  const PEOPLE_NOW = '(!defined(edition) || edition->isCurrent == true)';

  const folder = (id: string, title: string, items: (ListItemBuilder | null)[]) =>
    S.listItem().id(id).title(title).child(S.list().id(id).title(title).items(items.filter(Boolean) as ListItemBuilder[]));

  return S.list()
    .title('ceramic brussels')
    .items([
      S.listItem()
        .title('Homepage')
        .id('homepage')
        .schemaType('homepage')
        .child(S.document().schemaType('homepage').documentId('homepage')),

      folder('exhibitors', 'Exhibitors', [
        mainPage('exhibitors', 'Exhibitors page'),
        list('exhibitors-current', `Exhibitors ${thisYear}`, 'exhibitor', CURRENT, {}, byName),
        byYear('exhibitors-past', 'Exhibitors, past years', 'exhibitor', 'true', byName),
      ]),

      folder('artists', 'Artists', [mainPage('artists', 'Artists page'), list('artists-all', 'All artists', 'artist', 'true', {}, byName)]),

      folder('guest-of-honour', 'Guest of honour', [
        list(
          'guest',
          'The guest of honour',
          'artist',
          '_id in *[_type == "edition" && isCurrent == true].guestOfHonour._ref',
        ),
        currentEdition('guest-edition', `Choose the guest (edition ${thisYear})`),
      ]),

      folder('art-prize', 'Art prize', [
        mainPage('art-prize', 'Art prize page'),
        tabIntros('art-prize', 'about', 'Tab intros (laureates, awards, jury)'),
        list('laureates-current', `Laureates ${thisYear}`, 'laureate', CURRENT, {}, byOrder),
        byYear('laureates-past', 'Laureates, past years', 'laureate', 'true', byOrder),
        // The awards tab shows the newest year that has any, which is often last year's.
        byYear('awards', 'Awards by year (the site shows the newest)', 'award', 'family == "art-prize"', byOrder, true),
        list('jury-current', `Jury ${thisYear}`, 'person', `"jury" in groups && ${CURRENT}`, {}, byOrder),
        byYear('jury-past', 'Jury, past years', 'person', '"jury" in groups', byOrder),
        list('partners-art-prize', 'Art prize partners', 'partner', 'tier == "art-prize"', {}, byOrder),
      ]),

      folder('programme', 'Programme', [
        mainPage('programme', 'Programme page (La Cambre)'),
        tabIntros('programme', 'la-cambre', 'Tab intros (talks, VIP)'),
        list('events-talks', `Talks ${thisYear}`, 'programmeEvent', `${CURRENT} && section == "talks"`, {}, [
          { field: 'startsAt', direction: 'asc' },
        ]),
        list('events-vip', `VIP ${thisYear}`, 'programmeEvent', `${CURRENT} && section == "vip"`, {}, [
          { field: 'startsAt', direction: 'asc' },
        ]),
        list('events-project', `La Cambre ${thisYear}`, 'programmeEvent', `${CURRENT} && section == "project"`, {}, [
          { field: 'startsAt', direction: 'asc' },
        ]),
        list(
          'events-hidden',
          'Not on the site (no date, or the Awards tab)',
          'programmeEvent',
          `${CURRENT} && (!defined(startsAt) || !(section in ["talks", "vip", "project"]))`,
        ),
        byYear('events-past', 'Programme, past years', 'programmeEvent', 'true', [{ field: 'startsAt', direction: 'asc' }]),
      ]),

      folder('partners', 'Partners', [
        mainPage('partners', 'Partners page (main partner)'),
        tabIntros('partners', 'main', 'Tab intros'),
        ...Object.entries(PARTNER_TABS).map(([tab, tiers]) =>
          list(
            `partners-${tab}`,
            tiers.map((t) => PARTNER_TIERS.find((p) => p.value === t)?.title ?? t).join(', '),
            'partner',
            'tier in $tiers',
            { tiers },
            byOrder,
          ),
        ),
      ]),

      folder('visit', 'Visitors info', [
        mainPage('visit', 'Visitors info page (practical info)'),
        tabIntros('visit', 'practical-info', 'Tab intros (food & drinks, floor plan, FAQ)'),
        siteSettings('Venue, access, hotel deal, FAQ (Site settings)', 'visit-settings'),
        currentEdition('visit-edition', `Opening hours, tickets, floor plan (edition ${thisYear})`),
        list('partners-food', 'Food & drinks', 'partner', 'tier == "food-drinks"', {}, byOrder),
      ]),

      folder('about', 'About', [
        mainPage('about', 'About page (the fair)'),
        tabIntros('about', 'the-fair', 'Tab intros (advisory board, team, press, images)'),
        list('people-board', 'Advisory board', 'person', `"advisory-board" in groups && ${PEOPLE_NOW}`, {}, byOrder),
        list('people-team', 'Team and collaborators', 'person', `("team" in groups || "collaborator" in groups) && ${PEOPLE_NOW}`, {}, byOrder),
        list('press', 'Press clippings', 'pressClip', 'true', {}, [{ field: 'publishedAt', direction: 'desc' }]),
        S.listItem()
          .id('about-photos')
          .title('Photos (the gallery on each edition)')
          .schemaType('edition')
          .child(S.documentTypeList('edition').title('Editions')),
      ]),

      folder('news', 'News', [
        mainPage('news', 'News page'),
        list('news-all', 'Articles', 'newsItem', 'true', {}, [{ field: 'publishedAt', direction: 'desc' }]),
      ]),

      folder('contact', 'Contact', [
        mainPage('contact', 'Contact page'),
        siteSettings('Email, social links, newsletter (Site settings)', 'contact-settings'),
      ]),

      S.listItem()
        .id('pages-standalone')
        .title('Other pages')
        .schemaType('page')
        .child(
          S.documentList()
            .id('pages-standalone')
            .title('Other pages')
            .schemaType('page')
            .filter('_type == "page" && !defined(section)')
            .defaultOrdering(byOrder)
            .initialValueTemplates([S.initialValueTemplateItem('page-text'), S.initialValueTemplateItem('page-sections')]),
        ),

      S.divider(),

      folder('setup', 'Setup', [
        siteSettings('Site settings', 'siteSettings'),
        S.listItem()
          .title('Menu and footer')
          .id('navigation')
          .schemaType('navigation')
          .child(S.document().schemaType('navigation').documentId('navigation')),
        S.listItem()
          .title('Editions')
          .id('editions')
          .schemaType('edition')
          .child(S.documentTypeList('edition').title('Editions').defaultOrdering([{ field: 'year', direction: 'desc' }])),
        folder('people', 'People, every year', [
          ...PERSON_GROUPS.map((g) => list(`people-${g.value}`, g.title, 'person', '$group in groups', { group: g.value }, byOrder)),
          list('people-all', 'Everyone', 'person', 'true', {}, byName),
        ]),
        folder('partners-all', 'Partners, every tier', [
          ...PARTNER_TIERS.map((t) => list(`tier-${t.value}`, t.title, 'partner', 'tier == $tier', { tier: t.value }, byOrder)),
        ]),
        list('pages-all', 'All pages', 'page', 'true', {}, byOrder),
        S.listItem()
          .title('Page templates')
          .id('page-templates')
          .schemaType('pageTemplate')
          .child(S.documentTypeList('pageTemplate').title('Page templates').defaultOrdering(byOrder)),
      ]),
    ]);
};
