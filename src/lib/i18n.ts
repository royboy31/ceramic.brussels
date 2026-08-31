import type { LocaleId } from './locales';

/**
 * UI strings. Content comes from Sanity; these are the labels around it.
 * Kept in code deliberately - they change with the build, not with an editor.
 */
const STRINGS = {
  en: {
    'nav.exhibitors': 'Exhibitors',
    'nav.artists': 'Artists',
    'nav.news': 'News',
    'nav.programme': 'Programme',
    'nav.partners': 'Partners',
    'nav.press': 'Press',
    'nav.awards': 'Awards',
    'nav.editions': 'Past editions',
    'nav.menu': 'Menu',
    'nav.openMenu': 'Open menu',
    'nav.closeMenu': 'Close menu',
    'nav.newsletter': 'Newsletter',
    'home.currentEdition': 'Current edition',
    'home.latestNews': 'Latest news',
    'home.exhibitors': 'Exhibitors',
    'home.viewAll': 'View all',
    'home.tickets': 'Tickets',
    'home.catalogue': 'Catalogue',
    'home.keyFigures': 'key figures',
    'home.visitorsInfo': 'visitors info',
    'home.artists': 'artists',
    'home.pressClips': 'press clips',
    'home.moreOnFair': 'more on the fair',
    'home.discover': 'discover',
    'home.partnerSpotlight': 'partner spotlight',
    'exhibitors.count': 'galleries',
    'exhibitors.booth': 'Booth',
    'exhibitors.filter': 'Filter by name, country or booth',
    'exhibitors.noneMatch': 'No galleries match that filter.',
    'exhibitors.represents': 'Represented artists',
    'exhibitors.empty': 'No exhibitors published yet.',
    'exhibitors.filters': 'filters',
    'exhibitors.all': 'all',
    'exhibitors.byLetter': 'Filter by initial',
    'exhibitors.presenting': 'presenting',
    'exhibitors.backToAll': 'back to all',
    'common.previous': 'previous',
    'common.next': 'next',
    'common.instagram': 'instagram',
    'artists.guestOfHonour': 'Guest of honour',
    'artists.works': 'Works',
    'artists.shownBy': 'Shown by',
    'artists.empty': 'No artists published yet.',
    'artists.biography': 'biography',
    'artists.selectedWorks': 'works',
    'artists.basedIn': 'Based in',
    'news.empty': 'No news published yet.',
    'news.readMore': 'Read more',
    'programme.empty': 'The programme has not been announced yet.',
    'programme.talk': 'talks',
    'programme.tour': 'guided tours',
    'programme.workshop': 'workshops',
    'programme.ceremony': 'awards',
    'programme.allKinds': 'all',
    'programme.speakers': 'With',
    'partners.empty': 'No partners published yet.',
    'partners.main': 'main partner',
    'partners.institutional': 'institutions',
    'partners.media': 'media',
    'partners.supplier': 'suppliers',
    'press.empty': 'No press coverage published yet.',
    'press.readArticle': 'Read article',
    'awards.empty': 'No awards published yet.',
    'editions.exhibitorCount': 'exhibitors',
    'common.backTo': 'Back to',
    'common.website': 'Website',
    'common.language': 'Language',
    'notFound.title': 'Page not found',
    'notFound.body': 'That address does not exist on this site.',
    'notFound.home': 'homepage',
  },
  fr: {
    'nav.exhibitors': 'Exposants',
    'nav.artists': 'Artistes',
    'nav.news': 'Actualités',
    'nav.programme': 'Programme',
    'nav.partners': 'Partenaires',
    'nav.press': 'Presse',
    'nav.awards': 'Prix',
    'nav.editions': 'Éditions précédentes',
    'nav.menu': 'Menu',
    'nav.openMenu': 'Ouvrir le menu',
    'nav.closeMenu': 'Fermer le menu',
    'nav.newsletter': 'Newsletter',
    'home.currentEdition': 'Édition en cours',
    'home.latestNews': 'Dernières actualités',
    'home.exhibitors': 'Exposants',
    'home.viewAll': 'Voir tout',
    'home.tickets': 'Billets',
    'home.catalogue': 'Catalogue',
    'home.keyFigures': 'chiffres clés',
    'home.visitorsInfo': 'infos pratiques',
    'home.artists': 'artistes',
    'home.pressClips': 'articles de presse',
    'home.moreOnFair': 'en savoir plus sur la foire',
    'home.discover': 'découvrir',
    'home.partnerSpotlight': 'partenaire à la une',
    'exhibitors.count': 'galeries',
    'exhibitors.booth': 'Stand',
    'exhibitors.filter': 'Filtrer par nom, pays ou stand',
    'exhibitors.noneMatch': 'Aucune galerie ne correspond.',
    'exhibitors.represents': 'Artistes représentés',
    'exhibitors.empty': 'Aucun exposant publié pour le moment.',
    'exhibitors.filters': 'filtres',
    'exhibitors.all': 'tous',
    'exhibitors.byLetter': 'Filtrer par initiale',
    'exhibitors.presenting': 'présente',
    'exhibitors.backToAll': 'voir tous les exposants',
    'common.previous': 'précédent',
    'common.next': 'suivant',
    'common.instagram': 'instagram',
    'artists.guestOfHonour': 'Invité d’honneur',
    'artists.works': 'Œuvres',
    'artists.shownBy': 'Présenté par',
    'artists.empty': 'Aucun artiste publié pour le moment.',
    'artists.biography': 'biographie',
    'artists.selectedWorks': 'œuvres',
    'artists.basedIn': 'Vit et travaille en',
    'news.empty': 'Aucune actualité publiée pour le moment.',
    'news.readMore': 'Lire la suite',
    'programme.empty': 'Le programme n’a pas encore été annoncé.',
    'programme.talk': 'conférences',
    'programme.tour': 'visites guidées',
    'programme.workshop': 'ateliers',
    'programme.ceremony': 'prix',
    'programme.allKinds': 'tout',
    'programme.speakers': 'Avec',
    'partners.empty': 'Aucun partenaire publié pour le moment.',
    'partners.main': 'partenaire principal',
    'partners.institutional': 'institutions',
    'partners.media': 'médias',
    'partners.supplier': 'fournisseurs',
    'press.empty': 'Aucune revue de presse publiée pour le moment.',
    'press.readArticle': 'Lire l’article',
    'awards.empty': 'Aucun prix publié pour le moment.',
    'editions.exhibitorCount': 'exposants',
    'common.backTo': 'Retour à',
    'common.website': 'Site web',
    'common.language': 'Langue',
    'notFound.title': 'Page introuvable',
    'notFound.body': "Cette adresse n'existe pas sur ce site.",
    'notFound.home': "page d'accueil",
  },
  nl: {
    'nav.exhibitors': 'Exposanten',
    'nav.artists': 'Kunstenaars',
    'nav.news': 'Nieuws',
    'nav.programme': 'Programma',
    'nav.partners': 'Partners',
    'nav.press': 'Pers',
    'nav.awards': 'Prijzen',
    'nav.editions': 'Vorige edities',
    'nav.menu': 'Menu',
    'nav.openMenu': 'Menu openen',
    'nav.closeMenu': 'Menu sluiten',
    'nav.newsletter': 'Nieuwsbrief',
    'home.currentEdition': 'Huidige editie',
    'home.latestNews': 'Laatste nieuws',
    'home.exhibitors': 'Exposanten',
    'home.viewAll': 'Alles bekijken',
    'home.tickets': 'Tickets',
    'home.catalogue': 'Catalogus',
    'home.keyFigures': 'kerncijfers',
    'home.visitorsInfo': 'praktische info',
    'home.artists': 'kunstenaars',
    'home.pressClips': 'persartikels',
    'home.moreOnFair': 'meer over de beurs',
    'home.discover': 'ontdekken',
    'home.partnerSpotlight': 'partner in de kijker',
    'exhibitors.count': 'galerieën',
    'exhibitors.booth': 'Stand',
    'exhibitors.filter': 'Filter op naam, land of stand',
    'exhibitors.noneMatch': 'Geen galerieën gevonden.',
    'exhibitors.represents': 'Vertegenwoordigde kunstenaars',
    'exhibitors.empty': 'Nog geen exposanten gepubliceerd.',
    'exhibitors.filters': 'filters',
    'exhibitors.all': 'alle',
    'exhibitors.byLetter': 'Filteren op beginletter',
    'exhibitors.presenting': 'presenteert',
    'exhibitors.backToAll': 'alle exposanten',
    'common.previous': 'vorige',
    'common.next': 'volgende',
    'common.instagram': 'instagram',
    'artists.guestOfHonour': 'Eregast',
    'artists.works': 'Werken',
    'artists.shownBy': 'Getoond door',
    'artists.empty': 'Nog geen kunstenaars gepubliceerd.',
    'artists.biography': 'biografie',
    'artists.selectedWorks': 'werken',
    'artists.basedIn': 'Woont en werkt in',
    'news.empty': 'Nog geen nieuws gepubliceerd.',
    'news.readMore': 'Lees meer',
    'programme.empty': 'Het programma is nog niet bekendgemaakt.',
    'programme.talk': 'lezingen',
    'programme.tour': 'rondleidingen',
    'programme.workshop': 'workshops',
    'programme.ceremony': 'prijzen',
    'programme.allKinds': 'alles',
    'programme.speakers': 'Met',
    'partners.empty': 'Nog geen partners gepubliceerd.',
    'partners.main': 'hoofdpartner',
    'partners.institutional': 'instellingen',
    'partners.media': 'media',
    'partners.supplier': 'leveranciers',
    'press.empty': 'Nog geen persberichten gepubliceerd.',
    'press.readArticle': 'Lees artikel',
    'awards.empty': 'Nog geen prijzen gepubliceerd.',
    'editions.exhibitorCount': 'exposanten',
    'common.backTo': 'Terug naar',
    'common.website': 'Website',
    'common.language': 'Taal',
    'notFound.title': 'Pagina niet gevonden',
    'notFound.body': 'Dit adres bestaat niet op deze site.',
    'notFound.home': 'homepagina',
  },
} as const;

export type StringKey = keyof (typeof STRINGS)['en'];

export function useTranslations(lang: LocaleId) {
  return function t(key: StringKey): string {
    return STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
  };
}

/** Build a locale-prefixed path. */
export function localePath(lang: LocaleId, path = ''): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return clean ? `/${lang}/${clean}` : `/${lang}`;
}

export function formatDate(value: string | undefined, lang: LocaleId): string {
  if (!value) return '';
  const locale = { en: 'en-GB', fr: 'fr-BE', nl: 'nl-BE' }[lang];
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

/**
 * Weekday, day and month - the schedule headings in the design read
 * "Thursday 21 January", with no year because the edition is implicit.
 */
export function formatWeekday(value: string | undefined, lang: LocaleId): string {
  if (!value) return '';
  const locale = { en: 'en-GB', fr: 'fr-BE', nl: 'nl-BE' }[lang];
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(value));
}

export function formatDateRange(start: string, end: string, lang: LocaleId): string {
  if (!start || !end) return '';
  const locale = { en: 'en-GB', fr: 'fr-BE', nl: 'nl-BE' }[lang];
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).formatRange(new Date(start), new Date(end));
}

export function formatTime(value: string | undefined, lang: LocaleId): string {
  if (!value) return '';
  const locale = { en: 'en-GB', fr: 'fr-BE', nl: 'nl-BE' }[lang];
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  );
}
