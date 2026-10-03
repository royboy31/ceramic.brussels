#!/usr/bin/env node
/**
 * The French QA fixes of 2026-10-03, applied to the dataset.
 *
 * Source: the QA report (claude.ai/code/artifact/dbf18bf6-…) — native,
 * paragraph-level French for every block the site still showed in English,
 * plus the content bugs the read found (the "aaaa" SEO title, the 49K
 * key-figure label, Marie Pic's role, the Dutch "en", the Hoxton accent…).
 *
 * What it deliberately does NOT touch: the 47 gallery descriptions (the
 * client's own AI pass), the candidatures deadline (team decision), the
 * fair-award NAMES (client decision; their descriptions are translated),
 * and the single-language fields the schema cannot localise (postalAddress,
 * partner names, figure captions, ticket prices beyond spacing).
 *
 *   node scripts/fr-qa-fix.mjs           dry run - prints every change
 *   node scripts/fr-qa-fix.mjs --apply   one transaction + JSON backup;
 *                                        a document with an open draft gets
 *                                        the same change on the draft
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const APPLY = process.argv.includes('--apply');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const BACKUPS = path.join(ROOT, 'legacy-export', 'backups');

const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]),
);
const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET || 'production',
  token: env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
  perspective: 'raw',
});

/* ------------------------------------------------------------ helpers */
const key = () => crypto.randomBytes(6).toString('hex');

/**
 * Build Portable Text blocks from paragraph specs.
 * A paragraph is a string (one normal block; "\n" stays inside the block),
 * or { style?, spans: [...] } where a span is a string or [text, mark]:
 * mark = 'strong' | 'em' | 'underline' | { href } | { path } | { def } (a
 * ready markDef object copied from the English field).
 */
function blocks(paras) {
  return paras.map((p) => {
    const spec = typeof p === 'string' ? { spans: [p] } : p;
    const markDefs = [];
    const children = (spec.spans ?? []).map((s) => {
      if (typeof s === 'string') return { _key: key(), _type: 'span', marks: [], text: s };
      const [text, mark] = s;
      if (mark === 'strong' || mark === 'em' || mark === 'underline')
        return { _key: key(), _type: 'span', marks: [mark], text };
      let def;
      if (mark && mark.def) def = { ...mark.def, _key: mark.def._key ?? key() };
      else if (mark && mark.href) def = { _key: key(), _type: 'link', href: mark.href };
      else if (mark && mark.path) def = { _key: key(), _type: 'internalLink', path: mark.path };
      if (!def) return { _key: key(), _type: 'span', marks: [], text };
      markDefs.push(def);
      return { _key: key(), _type: 'span', marks: [def._key], text };
    });
    return { _key: key(), _type: 'block', style: spec.style ?? 'normal', markDefs, children };
  });
}

/** The Nth markDef of an English block array, copied. */
function enDef(enBlocks, n = 0) {
  const defs = (enBlocks ?? []).flatMap((b) => b.markDefs ?? []);
  return defs[n] ? { def: defs[n] } : null;
}

/**
 * French blocks positioned like the English ones: every non-text item
 * (figures) is copied through, every text block consumed from `paras`.
 * Counts must match - the dry run fails loudly if they do not.
 */
function mirror(enBlocks, paras, label) {
  const queue = [...paras];
  const out = [];
  for (const b of enBlocks ?? []) {
    if (b._type !== 'block') { out.push(JSON.parse(JSON.stringify(b))); continue; }
    const p = queue.shift();
    if (p === undefined) throw new Error(`${label}: fewer French paragraphs than English text blocks`);
    const made = blocks([typeof p === 'string' ? { style: b.style ?? 'normal', spans: [p] } : { style: p.style ?? b.style ?? 'normal', spans: p.spans ?? [p] }])[0];
    out.push(made);
  }
  if (queue.length) throw new Error(`${label}: ${queue.length} French paragraph(s) left over`);
  return out;
}

/* ------------------------------------------------------- the fixes.
   Each entry: { id, set: { "dot.path or [_key==…] path": value | (doc)=>value },
                 replace: [{ path, find, to }] }  (replace edits span texts
   and plain strings in place, erroring when `find` is absent). */
const F = [];

/* ---- urgent content bugs ------------------------------------------- */
F.push({
  id: 'b729459f-7f8f-46e7-8701-e4d0823ddcd3', // press release: the 5 laureates
  set: {
    'seo.title': { _type: 'localeString', en: 'the 5 laureates of the 2027 art prize', fr: 'les 5 lauréat·es de l’art prize 2027', nl: 'the 5 laureates of the 2027 art prize' },
    'title.fr': 'les 5 lauréat·es de l’art prize 2027',
    'excerpt.fr': 'ceramic brussels a le plaisir d’annoncer les 5 lauréat·es du 4e ceramic brussels art prize, sélectionné·es parmi plus de 230 candidatures venues de plus de 20 pays.',
  },
});
F.push({
  id: 'cd0b35b3-3c98-4255-be7d-80c00d860a53', // press release: Marion GoH
  set: { 'title.fr': 'Marion Verboom, invitée d’honneur 2027' },
});
F.push({
  id: (docs) => docs.edition2026Id, // key figure 49K
  find: { query: '*[_type=="edition" && year==2026 && !(_id in path("drafts.**"))][0]._id' },
  setFn: (doc) => {
    const kf = (doc.keyFigures ?? []).find((k2) => /instagram/i.test(k2?.label?.en ?? ''));
    if (!kf) throw new Error('edition 2026: Instagram key figure not found');
    return { [`keyFigures[_key=="${kf._key}"].label.fr`]: 'abonnés Instagram', [`keyFigures[_key=="${kf._key}"].label.nl`]: 'Instagram-volgers' };
  },
});
F.push({
  id: 'story-interview-collect-magazine',
  set: { 'role.fr': 'lauréate du prix du jury 2026', 'role.nl': 'laureaat van de juryprijs 2026' },
});
F.push({ id: '471e80f3-a7a1-4004-b650-634760e70282', set: { 'role.fr': 'partenaire logistique' } });
F.push({ id: '5e144d09-449c-42d7-af0e-4ef8db9a5d18', set: { 'role.fr': 'co-fondateurs de la foire' } });
F.push({
  id: 'demo-partner-the-hoxton',
  replace: [{ path: 'description.fr', find: "l'hotel partenaire", to: "l’hôtel partenaire" }],
});
F.push({
  id: 'demo-person-leonie-lefere',
  set: { 'role.fr': 'graphiste', 'role.nl': 'grafisch ontwerper' },
});
F.push({ id: '3bc49831-39ae-4a70-80a2-bea9918dedf0', set: { 'role.fr': 'supervision production et logistique' } }); // NOVES
F.push({ id: '8f917168-6aa3-4e38-83ff-691526be2965', set: { 'role.fr': 'production et installation des cimaises' } }); // Art Fairs Service
F.push({ id: 'demo-person-galila-2027', set: { 'role.fr': "Fondatrice de Galila's P.O.C." } });
F.push({ id: 'main-exhibitors', set: { 'title.fr': 'Exposants' } });

/* ---- homepage ------------------------------------------------------ */
F.push({
  id: (d) => d.homepageId,
  find: { query: '*[_type=="homepage" && !(_id in path("drafts.**"))][0]._id' },
  set: {
    'sections[_key=="0a1cbb4f8ce6"].kicker.fr': 'LAURÉAT·ES DE L’ART PRIZE',
    'sections[_key=="0a1cbb4f8ce6"].headline.fr': 'Les cinq lauréat·es de l’art prize 2027 ont été dévoilé·es.',
    'sections[_key=="0a1cbb4f8ce6"].link.label.fr': 'les découvrir',
    'sections[_key=="banner-0"].text.fr': 'abonnez-vous à notre newsletter',
    'sections[_key=="banner-0"].text.nl': 'schrijf je in voor onze nieuwsbrief',
  },
});

/* ---- site settings: organiser line + FAQ --------------------------- */
const FAQ_FR = {
  'Where can I buy tickets?': { q: 'Où acheter des billets ?', a: (en) => [{ spans: ['Les billets sont en vente en ligne sur notre site ', ['à partir du 15 novembre', 'strong'], ', ou directement à l’entrée de la foire. Pour les formules et les tarifs, consultez la ', ['page infos pratiques', enDef(en)], '.'] }] },
  'Are reduced-rate tickets available?': { q: 'Existe-t-il un tarif réduit ?', a: () => ['Oui : 10 €, en ligne et sur place, pour les étudiant·es de moins de 22 ans, les demandeur·euses d’emploi et les titulaires de la carte européenne du handicap. Pensez à présenter un justificatif à l’entrée.'] },
  'Do children need a ticket?': { q: 'Les enfants doivent-ils avoir un billet ?', a: () => [{ spans: ['L’entrée est ', ['gratuite pour les moins de 12 ans', 'strong'], ', mais un billet reste nécessaire. Réservez un billet enfant gratuit en ligne ou retirez-le à la billetterie.'] }] },
  'Can I visit with an Article 27 voucher?': { q: 'Puis-je venir avec un ticket Article 27 ?', a: () => ['Oui. Présentez votre ticket Article 27 à la billetterie pour obtenir votre entrée. Cette formule ne se réserve pas en ligne.'] },
  'Can I exchange or get a refund for my ticket?': { q: 'Puis-je échanger ou me faire rembourser un billet ?', a: () => ['Les billets ne sont ni échangeables ni remboursables.'] },
  'I haven’t received my ticket. What should I do?': { q: 'Je n’ai pas reçu mon billet, que faire ?', a: (en) => [{ spans: ['Vérifiez vos courriers indésirables et assurez-vous que votre commande a bien abouti. Si vous ne retrouvez toujours pas votre billet, écrivez à ', ['info@ceramic.brussels', enDef(en)], ' en indiquant le nom et l’adresse e-mail utilisés pour la réservation, ainsi que votre référence de commande si vous l’avez.'] }] },
  'Which payment methods are accepted at the entrance?': { q: 'Quels moyens de paiement sont acceptés à l’entrée ?', a: () => ['La billetterie accepte les espèces et les cartes.'] },
  'Can I attend the preview or vernissage with a regular ticket?': { q: 'Puis-je assister à la preview ou au vernissage avec un billet classique ?', a: () => ['La preview et le vernissage (20 janvier) sont sur invitation uniquement. Un billet classique donne accès aux horaires d’ouverture au public, du 21 au 24 janvier.'] },
  'Is my ticket valid for any day, or do I need to choose a date?': { q: 'Mon billet est-il valable n’importe quel jour ?', a: () => ['Pour un billet classique, vous choisissez une date à la réservation. Les billets VIP sont valables n’importe quel jour de la foire, pour une seule entrée.'] },
  'Can I leave and re-enter the fair on the same day?': { q: 'Puis-je sortir et revenir le même jour ?', a: () => ['Oui. Demandez un tampon à l’équipe de l’entrée avant de sortir : il vous permettra de revenir dans la journée.'] },
  'Can someone else use my ticket if I cannot attend?': { q: 'Quelqu’un d’autre peut-il utiliser mon billet ?', a: () => ['Oui, vous pouvez céder votre billet à une autre personne si vous ne pouvez pas venir.'] },
  'Can I request an invoice for my tickets?': { q: 'Puis-je demander une facture ?', a: () => ['Oui, lors de la réservation en ligne ou à l’accueil de la foire.'] },
  'Can I bring my dog?': { q: null, a: null }, // already French
  'Is the fair accessible to visitors with reduced mobility?': { q: 'La foire est-elle accessible aux personnes à mobilité réduite ?', a: (en) => [{ spans: ['Oui, le lieu est accessible aux visiteurs à mobilité réduite. Pour tout besoin particulier, écrivez à ', ['info@ceramic.brussels', enDef(en)], ' avant votre visite : nous vous aiderons à préparer votre arrivée.'] }] },
  'Can I bring a backpack or suitcase?': { q: 'Puis-je entrer avec un sac à dos ou une valise ?', a: () => ['Les sacs à dos, valises volumineuses et autres objets encombrants ne sont pas admis dans la foire et doivent être déposés au vestiaire (2 €/article). La direction de la foire se réserve le droit de refuser tout objet qu’elle juge trop volumineux.'] },
  'What are the opening hours?': { q: 'Quels sont les horaires d’ouverture ?', a: (en) => [{ spans: ['Les dates et horaires sont sur la ', ['page infos pratiques', enDef(en)], '. Dernière entrée 30 minutes avant la fermeture.'] }] },
  'Where does ceramic brussels take place?': { q: 'Où se déroule ceramic brussels ?', a: (en) => [{ spans: ['La foire se tient à ', ['Tour & Taxis, rue Picard 3, 1000 Bruxelles', 'strong'], '. L’emplacement de l’entrée et le plan d’accès sont sur la ', ['page infos pratiques', enDef(en)], '.'] }] },
  'Is there a cloakroom?': { q: 'Y a-t-il un vestiaire ?', a: () => ['Oui, un vestiaire est disponible sur place (2 €/article). Sacs à dos, valises et objets encombrants doivent y être déposés.'] },
  'Who should I contact about a school or group visit?': { q: 'Qui contacter pour une visite scolaire ou de groupe ?', a: (en) => [{ spans: ['Écrivez à ', ['info@ceramic.brussels', enDef(en)], ' en précisant la date souhaitée, la taille du groupe et vos éventuels besoins : nous verrons ensemble les options possibles.'] }] },
  'How do I get to the fair?': { q: 'Comment se rendre à la foire ?', a: (en) => [{ spans: ['En transports en commun, à vélo ou en voiture : tous les itinéraires et accès sont sur la ', ['page infos pratiques', enDef(en)], '.'] }] },
  'Is smoking permitted inside the fair?': { q: 'Peut-on fumer dans la foire ?', a: () => ['Non, il est interdit de fumer à l’intérieur.'] },
  'Who should I contact about lost property?': { q: 'Qui contacter pour un objet perdu ?', a: (en) => [{ spans: ['Pendant la foire, adressez-vous à l’accueil. Après votre visite, écrivez à ', ['info@ceramic.brussels', enDef(en)], ' avec une description de l’objet. La foire ne peut être tenue responsable des effets personnels perdus, volés ou endommagés.'] }] },
  'Can I eat and drink at the fair?': { q: 'Peut-on manger et boire sur place ?', a: (en) => [{ spans: ['Oui, une offre de restauration est disponible sur place : découvrez-la sur la ', ['page food & drinks', enDef(en)], ' et prévoyez une pause pendant votre visite. La nourriture extérieure n’est pas admise ; les gourdes d’eau sont autorisées.'] }] },
  'Who can I ask about dietary requirements or allergens?': { q: 'À qui s’adresser pour les régimes ou allergènes ?', a: () => ['Parlez-en directement à l’équipe de restauration avant de commander : elle vous renseignera sur les ingrédients, les allergènes et les options disponibles.'] },
  'Where can I discover the participating galleries and artists?': { q: 'Où découvrir les galeries et les artistes ?', a: (en) => [{ spans: ['Rendez-vous dans la ', ['section Exposants', enDef(en)], ' du site pour explorer les galeries participantes et les artistes qu’elles présentent.'] }] },
  'Can I buy artworks at the fair?': { q: 'Peut-on acheter des œuvres à la foire ?', a: () => ['Oui. Pour toute œuvre, adressez-vous directement à la galerie qui la présente : elle vous renseignera sur l’artiste, la disponibilité, les prix et les modalités d’achat.'] },
  'Are talks included in my ticket?': { q: 'Les talks sont-ils compris dans mon billet ?', a: () => ['Oui, l’accès aux talks est inclus dans le billet d’entrée.'] },
  'What languages are the talks held in?': { q: 'En quelles langues se tiennent les talks ?', a: (en) => [{ spans: ['En français, en anglais ou en néerlandais selon les séances. La langue et le détail de chaque séance sont indiqués sur la ', ['page des talks', enDef(en)], '.'] }] },
  'How can I access the fair as a member of the press?': { q: 'Comment accéder à la foire en tant que journaliste ?', a: (en) => [{ spans: ['L’entrée est gratuite sur présentation d’une carte de presse valide. Pour toute autre demande d’accréditation, contactez le·la représentant·e presse de votre région, indiqué·e sur notre ', ['page presse', enDef(en)], '.'] }] },
  'Who should I contact for press images or interview requests?': { q: 'Qui contacter pour des visuels ou une interview ?', a: (en) => [{ spans: ['Contactez le·la représentant·e concerné·e sur notre ', ['page presse', enDef(en)], ' pour les dossiers, les visuels et les demandes d’interview.'] }] },
  'Can I take photographs at the fair?': { q: 'Peut-on photographier dans la foire ?', a: () => ['Oui, pour un usage personnel. Tout usage commercial ou médiatique nécessite l’accord préalable des organisateurs et des artistes exposés.'] },
  'How can I stay informed about upcoming editions?': { q: 'Comment rester informé·e des prochaines éditions ?', a: (en) => [{ spans: ['Abonnez-vous à la ', ['newsletter', enDef(en, 0)], ' sur le site et suivez ceramic brussels sur les ', ['réseaux sociaux', enDef(en, 1)], '.'] }] },
  'I have another question. How can I contact you?': { q: 'J’ai une autre question, comment vous contacter ?', a: (en) => [{ spans: ['Écrivez à ', ['info@ceramic.brussels', enDef(en)], '. Pendant la foire, l’équipe d’accueil peut aussi répondre à vos questions pratiques.'] }] },
};
F.push({
  id: (d) => d.siteSettingsId,
  find: { query: '*[_type=="siteSettings" && !(_id in path("drafts.**"))][0]._id' },
  setFn: (doc) => {
    const out = { 'organiserText.fr': 'ceramic brussels est une initiative portée et organisée conjointement par studio emosi et l’ASBL ceramic brussels.' };
    for (const item of doc.faq ?? []) {
      const enQ = (item.question?.en ?? '').trim();
      const hit = Object.entries(FAQ_FR).find(([k2]) => k2.trim() === enQ);
      if (!hit) { console.warn(`  ! FAQ not in table: "${enQ}"`); continue; }
      const [, t] = hit;
      if (!t.q) continue;
      out[`faq[_key=="${item._key}"].question.fr`] = t.q;
      out[`faq[_key=="${item._key}"].answer.fr`] = blocks(t.a(item.answer?.en));
    }
    return out;
  },
});

/* ---- edition 2027: tickets ----------------------------------------- */
F.push({
  id: (d) => d.edition2027Id,
  find: { query: '*[_type=="edition" && year==2027 && !(_id in path("drafts.**"))][0]._id' },
  setFn: (doc) => {
    const out = {};
    for (const t of doc.tickets ?? []) {
      if (/under 12|moins de 12/i.test(JSON.stringify(t.name ?? {})) && t.note?.en && !t.note?.fr) {
        out[`tickets[_key=="${t._key}"].note.fr`] = 'un billet gratuit doit être réservé pour chaque enfant de moins de 12 ans';
      }
      if (typeof t.price === 'string' && /^\d/.test(t.price) && t.price.includes('€') && !t.price.includes(' €')) {
        out[`tickets[_key=="${t._key}"].price`] = t.price.replace('€', ' €');
      }
    }
    if (doc.ticketsNote?.fr?.includes('2€')) out['ticketsNote.fr'] = doc.ticketsNote.fr.replace('2€', '2 €');
    return out;
  },
});

/* ---- the fair (about hub) ------------------------------------------ */
F.push({
  id: (d) => d.theFairId,
  find: { query: '*[_type=="page" && slug.en.current=="the-fair" && !(_id in path("drafts.**"))][0]._id' },
  setFn: (doc) => {
    const sec = (k2) => (doc.sections ?? []).find((s) => s._key === k2);
    return {
      'sections[_key=="contentSection0"].body.fr': mirror(sec('contentSection0').body.en, [
        'Cofondée et dirigée par Gilles Parmentier et Jean-Marc Dimanche, cette foire singulière, portée par une vision audacieuse, bouscule les conventions du marché de l’art depuis janvier 2024.',
        { spans: ['Installée dans le cadre exceptionnel de ', ['Tour & Taxis', enDef(sec('contentSection0').body.en)], ', elle attire près de 20 000 visiteurs chaque année et démontre que la céramique est un médium majeur et bien vivant de la création contemporaine.'] },
        'Bien plus qu’une foire d’art, ceramic brussels est un véritable laboratoire de dialogue et de rencontres, qui réunit galeries, institutions, artistes, collectionneur·euses et passionné·es autour d’un riche programme de conférences, d’expositions et de débats.',
      ], 'the-fair §1'),
      'sections[_key=="contentSection1"].body.fr': mirror(sec('contentSection1').body.en, [
        'La foire œuvre à la promotion et à la reconnaissance de la céramique au cœur de l’art contemporain.\nSa vision à long terme, ancrée dans la Brussels Art Week, repose sur trois piliers complémentaires :',
        { spans: ['↘', [' Une vitrine internationale', 'strong'], ', qui met en lumière la diversité des pratiques contemporaines en réunissant près de 70 exposants internationaux, avec le soutien actif de partenaires et d’institutions de premier plan.'] },
        { spans: ['↘', [' Un tremplin pour les talents émergents', 'strong'], ', qui accompagne les artistes de demain à travers le ceramic brussels art prize, un appel à candidatures européen supervisé par un jury international de renom.'] },
        { spans: ['↘', [' Un lieu d’affaires et de rencontres', 'strong'], ', qui soutient le développement d’un marché en pleine croissance et encourage le dialogue et la collaboration entre artistes, galeries et professionnel·les de l’art.'] },
      ], 'the-fair §2'),
      'sections[_key=="contentSection2"].body.fr': mirror(sec('contentSection2').body.en, [
        'La foire multiplie les initiatives pour s’imposer dans le calendrier international.',
        'Depuis 2024, ceramic brussels donne carte blanche à un·e artiste invité·e d’honneur, en consacrant notamment à son travail un espace monumental à l’entrée de la foire : Johan Creten (BE) en 2024, Elizabeth Jaeger (USA) en 2025 et Elmar Trenkwalder (AT) en 2026.',
        'En 2027, l’artiste Marion Verboom (FR) sera l’invitée d’honneur de la quatrième édition.',
        'Depuis 2025, la foire a officiellement élargi son champ à la céramique moderne et au verre. Elle met également à l’honneur des scènes nationales à travers un country focus : la Norvège en 2025, l’Espagne en 2026.',
        'Cette ambition se traduit aussi par une série d’initiatives à destination des professionnel·les de l’art, des VIP et de la presse internationale.',
      ], 'the-fair §3'),
      'sections[_key=="b5b90889d384"].heading.fr': 'un forum international',
      'sections[_key=="b5b90889d384"].body.fr': mirror(sec('b5b90889d384').body.en, [
        'Depuis la première édition, le programme de talks attire un public nombreux et engagé, autour de sujets qui vont de l’évolution des pratiques artistiques à l’avenir du marché et à la programmation internationale.',
        'Déployé sur deux jours, il réunit des figures de premier plan : artistes, commissaires, critiques et collectionneur·euses.',
      ], 'the-fair §forum'),
    };
  },
});

/* ---- art prize: about ---------------------------------------------- */
F.push({
  id: (d) => d.apAboutId,
  find: { query: '*[_type=="page" && section=="art-prize" && slug.en.current=="about" && !(_id in path("drafts.**"))][0]._id' },
  setFn: (doc) => {
    const sec = (k2) => (doc.sections ?? []).find((s) => s._key === k2);
    return {
      'sections[_key=="contentSection0"].body.fr': mirror(sec('contentSection0').body.en, [
        '5 lauréat·es seront présenté·es dans une exposition collective lors de ceramic brussels 2027.',
        { spans: ['La sélection est confiée à un jury international et orchestrée par ', ['Jean-Marc Dimanche', 'underline'], ', co-directeur de la foire. Chaque artiste exposera une sélection de ses œuvres.'] },
        { spans: ['Les lauréat·es bénéficieront également d’', ['awards', 'underline'], ' offerts par des partenaires institutionnels : résidences, expositions et monographies.'] },
      ], 'art-prize about §1'),
      'sections[_key=="contentSection1"].body.fr': mirror(sec('contentSection1').body.en, [
        'Les candidatures pour 2027 sont clôturées.',
        'L’appel est ouvert chaque année aux étudiant·es en art et aux jeunes artistes :',
        '→ établi·es dans l’Union européenne\n→ ayant moins de 10 ans de pratique et de recherche dans le champ de la céramique\n→ non représenté·es par une galerie',
        '',
      ], 'art-prize about §2'),
    };
  },
});

/* ---- page intros (plain localeText/localeString) -------------------- */
const INTROS = [
  ['demo-page-art-prize-laureates', 'intro.fr', 'L’équipe de ceramic brussels et le jury de l’art prize sont fiers de présenter les 5 lauréat·es de l’édition 2027 du prix. Leurs œuvres seront réunies dans une exposition collective à l’entrée de la foire.'],
  ['demo-page-art-prize-laureates', 'title.fr', 'lauréat·es'],
  ['demo-page-art-prize-jury', 'intro.fr', 'Chaque année, le jury réunit des professionnel·les de renom, chargé·es de sélectionner les lauréat·es. Les membres du jury 2027 sont :'],
  ['page-press-media-press', 'intro.fr', 'Découvrez une sélection d’articles consacrés à ceramic brussels dans de grandes publications internationales.'],
  ['page-press-media-press', 'title.fr', 'Presse'],
  ['page-press-media-photos-videos', 'intro.fr', 'ceramic brussels, ce sont cinq jours de découvertes, portés par une énergie vibrante et inspirante. Découvrez ici un aperçu des éditions passées.'],
  ['page-press-media-photos-videos', 'title.fr', 'Photos & vidéos'],
  ['page-press-media-media-partners', 'intro.fr', 'L’engagement de grands médias aux côtés de ceramic brussels a été déterminant pour notre visibilité, en Belgique comme à l’étranger. Grâce à leur soutien éditorial, leurs lecteur·ices découvrent la foire, ses thèmes et celles et ceux qui la font. Nous remercions chaleureusement :'],
  ['page-press-media-media-partners', 'title.fr', 'Partenaires médias'],
  ['page-press-media-stories', 'intro.fr', 'Parce que la foire est une aventure collective, nous donnons régulièrement la parole à ses acteurs et partenaires clés. Découvrez ici leurs entretiens et regards inspirants, pour un coup d’œil en coulisses sur le marché et son évolution.'],
  ['page-press-media-stories', 'title.fr', 'Récits'],
  ['page-programme-awards', 'intro.fr', 'Célébrant la créativité et la diversité de la céramique contemporaine, la cérémonie de remise des prix réunit artistes, galeries et partenaires pour récompenser les présentations les plus remarquables et les lauréat·es du ceramic brussels art prize.'],
  ['page-programme-exhibition-pass', 'intro.fr', 'Chaque billet de la foire donne accès gratuitement aux expositions des institutions partenaires.'],
];
for (const [id, p, v] of INTROS) {
  const prev = F.find((f) => f.id === id && f.set);
  if (prev) prev.set[p] = v;
  else F.push({ id, set: { [p]: v } });
}

/* ---- ceremony event ------------------------------------------------- */
F.push({
  id: 'cee5b40a-8c0c-4abf-86ae-ae8134356e6c',
  set: {
    'speakersText.fr': 'avec Jean-Marc Dimanche et Gilles Parmentier, co-directeurs de la foire, les membres de l’advisory board et du jury de l’art prize, et les représentant·es des institutions partenaires.',
    'link.label.fr': 'voir tous les awards des exposants',
  },
});

/* ---- La Cambre ------------------------------------------------------ */
F.push({
  id: (d) => d.laCambreId,
  find: { query: '*[_type=="page" && slug.en.current=="la-cambre" && !(_id in path("drafts.**"))][0]._id' },
  setFn: (doc) => {
    const sec = (doc.sections ?? []).find((s) => s._key === '30776977a490');
    const out = {
      'intro.fr': 'La Cambre fête son centenaire au cœur de ceramic brussels ! Pour cette 4e édition, la prestigieuse école d’art bruxelloise investit la foire avec un projet transdisciplinaire inédit. Du mobilier céramique imaginé par ses alumni aux démonstrations d’impression en direct du projet Letterrestres, découvrez comment une nouvelle génération d’artistes repousse les limites du médium.',
      'sections[_key=="30776977a490"].body.fr': mirror(sec.body.en, [
        { spans: ['Le projet ', ['Letterrestres', 'em'], ' célèbre une nouvelle génération d’artistes qui repoussent les limites de la céramique comme médium.'] },
        'À la foire, le stand de La Cambre invite les visiteurs à se réunir autour des archives de l’école, assis sur des tabourets, chaises et bancs réalisés par des alumni de l’atelier céramique. Chaque pièce emploie une technique différente, à l’image de la diversité des pratiques et des univers de cette nouvelle génération.',
        'Depuis ces assises, les visiteurs assistent à des démonstrations d’impression en direct sur une ancienne presse équipée de caractères en céramique. Elles sont le fruit d’une collaboration entre les ateliers céramique et typographie de La Cambre, présents tous deux à l’école depuis sa fondation par Henry van de Velde en 1927.',
        'Le projet revisite le caractère mobile à travers la technique mise au point par Bi Sheng en Chine vers 1045. Ses caractères d’argile furent les tout premiers caractères mobiles, quatre siècles avant que Gutenberg n’introduise l’imprimerie en Occident.',
      ], 'la-cambre'),
    };
    if (sec.heading?.en && !sec.heading?.fr) out['sections[_key=="30776977a490"].heading.fr'] = 'Letterrestres : un atelier d’impression en direct par La Cambre';
    for (const l of sec.links ?? []) if (l.label?.en && !l.label?.fr) out[`sections[_key=="30776977a490"].links[_key=="${l._key}"].label.fr`] = 'en savoir plus sur le projet';
    return out;
  },
});

/* ---- exhibitions (pass) --------------------------------------------- */
F.push({
  id: 'exhibition-2027-bps22',
  set: {
    'institution.fr': 'BPS22 — Musée d’art de la Province de Hainaut',
    'description.fr': 'Avec Juggernaut, Emmanuel Van der Auwera compose un parcours où les œuvres se répondent comme les maillons successifs d’une même chaîne. De la matière et du travail aux images et aux idéologies, l’exposition interroge les forces qui façonnent notre monde contemporain et les récits qui leur donnent sens.',
    'link.label.fr': 'découvrir l’exposition',
  },
});
F.push({
  id: 'exhibition-2027-cid',
  set: {
    'institution.fr': 'CID — centre d’innovation et de design',
    'description.fr': 'L’exposition « Aléas, pratiques de l’adaptation » explore la capacité des designers à accueillir l’imprévu : intégrer les forces naturelles, les contraintes de la matière et les ressources existantes plutôt que d’imposer des méthodes rigides. Dans une scénographie qui convoque le charbon du Grand-Hornu, elle révèle des objets et des attitudes créatives accordés à un monde en transformation permanente.',
    'link.label.fr': 'découvrir le CID',
  },
});

/* ---- laureate statements -------------------------------------------- */
const STATEMENTS = {
  'laureate-2027-daria-kowalewska': [
    'Daria Kowalewska (1996) est sculptrice. Elle crée principalement des sculptures et des installations en céramique. Formée à l’Académie des beaux-arts Eugeniusz Geppert de Wrocław, elle y a obtenu en 2023 un master dans deux disciplines.',
    'Daria a participé à de nombreuses expositions et workshops liés à Wrocław. Son travail a fait l’objet d’expositions personnelles — « In Silence, I Grow » à la Hilleckes Gallery de Berlin (2025), « Beyond Space » au BWA de Wałbrzych (2024) et « Rustling Imagination » au Bulvary de Wrocław — ainsi que de présentations au NM de Gdańsk et au musée Rothko. Elle est lauréate du programme OP Young 22 et de l’exposition « Life Takes on a Different Meaning ». En 2025, elle a remporté le Gold Award de la Biennale de céramique de Lettonie ; en 2026, elle a reçu la bourse « Young Poland ».',
    'Son travail explore la transformation de la matière, les forces de la nature, la destruction et le délabrement. Elle s’attache aux processus de métamorphose à l’œuvre dans le monde naturel et à leur empreinte sur la matière.',
  ],
  'laureate-2027-dominik-adamec': [
    'Dominik Adamec (1995) est un artiste intermédia tchèque établi à Berlin. Diplômé de l’Académie des beaux-arts de Prague en 2020, il a poursuivi sa formation à l’Universität der Künste de Berlin. Il est lauréat du prix Jindřich Chalupecký 2025.',
    'Son travail conceptuel puise dans les sciences naturelles comme dans les sciences sociales. Il s’intéresse à la philosophie de l’évolution, à l’écologie et aux interactions complexes de l’humain avec la nature qui l’entoure. Sa méthode repose sur le brouillage délibéré des catégories du langage, des taxonomies établies et des phénomènes sociaux.',
    'Son œuvre se lit comme un rébus ou un hybride : son ambiguïté met en mouvement, invite à la réflexion et au réexamen de nos habitudes de perception. Elle a été largement montrée en institution, en Tchéquie comme à l’étranger, notamment à la Galerie nationale de Prague et à la Kunsthalle im Lipsiusbau de Dresde.',
  ],
  'laureate-2027-ioulia-chante': [
    'Ioulia Chante (1991) est une architecte et céramiste grecque établie à Malte, fondatrice de Babau Ceramics. Titulaire d’un master en architecture de l’université Démocrite de Thrace (2017), elle a travaillé comme assistante de conception pendant ses études. En 2018, elle s’installe à Malte, où son expérience du secteur de la construction nourrit son intérêt pour la matière, l’artisanat local et le patrimoine bâti.',
    'Sa pratique céramique débute en 2019 par des cours de tournage à Space for Clay, avant de s’élargir aux techniques sculpturales et au façonnage à la main à partir de 2020. De 2023 à 2025, elle se consacre entièrement à son travail de céramiste. En 2023, elle expose pour la première fois au Mara Show avec Marie Gallery 5 et Il-Lokal. En 2024, elle présente sa première exposition personnelle, « What’s Bugging You? », à la MSA, puis participe à des expositions collectives, dont « Clay Craft Concept » à la MSA et « Small Bones of Courage » à Spazju Kreattiv.',
    'Son parcours pluridisciplinaire fonde une pratique ancrée dans l’exploration de la matière, l’artisanat et le récit intime. Influencé par l’architecture, la structure et la scénographie, son travail circule entre formes simples et sculptures miniatures d’une grande minutie, souvent combinées en objets domestiques intimes et en pièces qui interrogent la condition humaine et les pathologies de nos sociétés, en puisant dans l’héritage méditerranéen.',
  ],
  'laureate-2027-jules-bouteleux': [
    'Jules Bouteleux (1985) est diplômé de l’École des beaux-arts de Nantes (2009). Il s’installe ensuite à Bruxelles, où il développe sa pratique artistique parallèlement à une carrière de chef décorateur pour le cinéma. En 2013, dans le cadre d’un post-diplôme à vocation professionnelle, il coordonne la résidence d’artistes Fieldwork Marfa au Texas. De retour à Bruxelles, sa recherche d’un matériau pour prolonger sa pratique sculpturale le conduit à la céramique, puis à la porcelaine.',
    'Ses constructions s’inspirent de structures agricoles, domestiques et industrielles souvent dissimulées ou oubliées, et explorent les paysages périphériques, à la croisée de l’urbain et du rural. Son travail de décor pour le cinéma nourrit son attention particulière aux structures et à leurs environnements.',
    'Son travail a notamment fait l’objet de deux expositions personnelles : « La vie sur les pentes du Vésuve » à La Confection Idéale, dans le cadre de la biennale Watch This Space 9 (2017), et « Un maillet bien employé » au Collège, à Crest (2021). Il a aussi participé à plusieurs expositions collectives à Bruxelles, notamment aux Galeries royales Saint-Hubert, à LaVallée et à MAGA. Plus récemment, son travail a été présenté à C14 Paris et à la galerie Terra Viva (2024). Depuis 2019, il vit et travaille dans la Drôme, au pied du Vercors, au sein de l’atelier collectif Batterie.',
  ],
  'laureate-2027-sojeong-you': [
    'Sojeong You (1996) est une plasticienne et sculptrice établie à Höhr-Grenzhausen, en Allemagne. Entre céramique traditionnelle et fabrication numérique, elle explore la manière dont les souvenirs et les récits oubliés prennent corps.',
    'Sa pratique s’appuie sur ce qu’elle nomme une archéologie numérique. À partir d’archives photographiques personnelles, elle réinterprète des images numérisées par un flou chimique, réponse physique à l’apesanteur du numérique. Elle traduit ensuite ces souvenirs en deux dimensions en impressions céramiques 3D, en exposant délibérément les trames internes — structures gyroïdes ou linéaires — comme mécanique inconsciente de la mémoire. Appliquant cette démarche à des lieux et à des traces historiques, elle convertit la donnée photographique en fragiles structures stratifiées de grès et de porcelaine.',
    'Installée dans une région de longue tradition céramique, elle fait de la technologie un pont entre donnée numérique et matière. En acceptant les accidents, les fissures et les strates brutes de l’impression, elle transforme des souvenirs fugaces en présences tangibles.',
  ],
};
for (const [id, paras] of Object.entries(STATEMENTS)) {
  F.push({
    id,
    setFn: (doc) => {
      const en = doc.statement?.en ?? [];
      return { 'statement.fr': en.length ? mirror(en, paras.slice(0, en.filter((b) => b._type === 'block').length).concat(Array(Math.max(0, en.filter((b) => b._type === 'block').length - paras.length)).fill('')), `${id} statement`) : blocks(paras) };
    },
  });
}

/* ---- Marion Verboom (artist) ---------------------------------------- */
F.push({
  id: (d) => d.marionId,
  find: { query: '*[_type=="artist" && name match "Marion Verboom*" && !(_id in path("drafts.**"))][0]._id' },
  setFn: (doc) => {
    const out = {};
    out['bio.fr'] = mirror(doc.bio.en, [
      'Née en 1983, Marion Verboom vit et travaille à Paris. Diplômée de l’École nationale supérieure des beaux-arts de Paris en 2009, elle a poursuivi sa formation à De Ateliers, à Amsterdam, de 2009 à 2011.',
      'Elle développe depuis une œuvre singulière au sein de la sculpture contemporaine, à la croisée de l’architecture, de l’ornement et de l’histoire des formes. Sa pratique se nourrit d’un dialogue soutenu avec des références culturelles de toutes époques et géographies, et d’une attention précise aux processus de construction et de transformation de la matière.',
      'Son travail a été largement présenté en institution, en France comme à l’étranger : expositions personnelles à La Verrière — Fondation d’entreprise Hermès à Bruxelles, au Voyage à Nantes et au Frac Île-de-France, et nombreuses expositions collectives dans de grandes institutions.',
      'Parallèlement, elle mène des projets et des collaborations qui prolongent sa recherche dans d’autres contextes, à l’image de la nature hybride et évolutive de sa pratique. Son travail figure dans plusieurs collections publiques, dont le Centre national des arts plastiques (CNAP), le MAC VAL et le Musée d’arts de Nantes.',
      'Par une pratique qui réactive sans cesse les vocabulaires historiques tout en restant profondément ancrée dans le présent, Marion Verboom contribue à redéfinir la place de la sculpture aujourd’hui, dans un langage à la fois informé et ouvert.',
    ], 'marion bio');
    const sec = (doc.sections ?? []).find((s) => s._key === 'contentSection1');
    out['sections[_key=="contentSection1"].body.fr'] = mirror(sec.body.en, [
      'Le travail de Marion Verboom repose sur un principe d’itération : des fragments assemblés en structures modulaires qui se combinent, se répètent et se réorganisent. Ces compositions procèdent par empilement et forment des systèmes ouverts, en transformation.',
      { spans: ['Depuis 2015, elle développe la série en cours ', ['Achronies', 'em'], ', un ensemble de sculptures totémiques qui revisitent la colonne architecturale. Elle y réinterprète une forme canonique en combinant des motifs puisés dans des répertoires culturels très divers, des civilisations antiques aux vocabulaires modernistes.'] },
      'Travaillant une grande variété de matériaux — béton, bois, plâtre, bronze, argile, résine —, elle élabore des sculptures qui conjuguent précision technique et expérimentation. La répétition des modules et leurs variations engendrent des compositions à la fois structurées et dynamiques.',
      'Au cœur de sa pratique, un dialogue constant entre différentes histoires de l’art et de l’esthétique : les formes circulent, se transforment, s’hybrident, tissant des liens à travers les époques et les géographies. Il en résulte un langage sculptural à la fois rigoureux et ouvert.',
    ], 'marion pratique');
    const IV = [
      { style: 'blockquote', spans: ['« J’aime voir la matière prendre forme entre mes mains »'] },
      'Pour l’édition 2027, l’artiste Marion Verboom présentera une grande exposition monographique dans un espace dédié de la foire, en collaboration avec la galerie Lelong Paris. Pour mieux comprendre ce qui inspire et nourrit son travail, nous lui avons posé quelques questions.',
      { style: 'h2', spans: ['entretien'] },
      { spans: [['Votre travail tisse des liens entre époques, cultures et histoires de l’art. Qu’est-ce qui vous intéresse dans ces croisements ?', 'strong']] },
      { spans: [['MV', 'strong'], ' ', 'Cette manière de travailler est propre à la série des ', ['Achronies', 'em'], ', que je développe depuis plusieurs années à travers une recherche quasi encyclopédique, en expansion constante, que je traduis ensuite par le modelage et le moulage. Je constitue ainsi une gypsothèque, une sorte d’alphabet des formes qui me traversent. J’imprime en particulier celles qui font écho : des motifs qui me sont familiers, qui fluctuent à travers les époques, se déposent dans ma mémoire, et que je développe ensuite en modelant l’argile. Le modelage devient alors un espace de circulation où les formes ne cessent de se transformer ; il ne s’agit pas de reproduire des modèles existants. Chaque fragment de ma gypsothèque est l’élément d’une construction infinie, à la fois colonne archéologique et carotte géologique. Ce que je cherche à y exprimer, ce ne sont pas tant les croisements culturels que l’action du temps et des déplacements géographiques sur les motifs, les symboles et les systèmes de représentation. La composition des fragments empilés s’écrit comme une séquence d’ADN ou une phrase logosyllabique, mêlant couleurs, textures et inscription dans le temps vertical.'] },
      { spans: [['Vous travaillez souvent par fragments, assemblages, strates, colonnes. Qu’est-ce qui vous attire dans cette manière de construire ?', 'strong']] },
      { spans: [['MV', 'strong'], ' ', 'Depuis mes premiers dessins, je m’intéresse à la création d’interstices. En fonderie, on les appelle des « nuits ». Ces jonctions, qui ouvrent la possibilité du remontage, me fascinent. Cette capacité d’emboîtement est parfois la raison d’être même de mes constructions. Je trouve qu’une forme, une représentation, traduit plus justement notre perception du monde lorsqu’elle n’est pas monolithique, mais faite de plusieurs parties formant un tout. On ne perçoit pas une sculpture d’un seul regard ; il faut en faire le tour et procéder à une addition mentale pour en saisir le volume. C’est un peu ce que je fais aussi dans la fabrication.'] },
      { spans: [['Vous travaillez une grande diversité de matériaux : plâtre, béton, bronze, résine, bois, argile. Quelle place la matière, et peut-être la céramique en particulier, occupe-t-elle dans votre processus de création ?', 'strong']] },
      { spans: [['MV', 'strong'], ' ', 'J’utilise principalement des matériaux qui se solidifient par catalyse ou par cuisson, avec des techniques comme le modelage, le moulage ou la fonte à cire perdue. J’aime travailler la matière avec mes mains et la voir se transformer sous mon geste. Comme l’a si bien développé Gaston Bachelard dans ', ['La Terre et les rêveries de la volonté', 'em'], ', le dur et le mou constituent déjà une forme en soi. La forme est indissociable de sa substance, et la manière d’y parvenir compte autant que le résultat. Il est donc important pour moi de créer des sculptures multi-matériaux, pour générer des contrastes et faire ressortir les qualités propres à chaque substance. C’est un travail d’équilibriste. J’aime assembler des éléments appartenant à des temporalités, des références ou des mondes différents, pour construire une nouvelle lecture de l’œuvre. Très tôt, j’ai été attirée par la transparence. Il m’a semblé essentiel d’intégrer cette qualité à mes constructions volumétriques, pour contrebalancer les masses, déplacer les équilibres et créer de nouvelles circulations de lumière.'] },
      { spans: [['Quelle place le dessin occupe-t-il dans votre processus de création ? Est-ce un moment de recherche, de projection, ou une autre manière de construire ?', 'strong']] },
      { spans: [['MV', 'strong'], ' ', 'C’est assez évolutif. Quand je n’avais pas d’atelier, je tendais une grande feuille de papier dans ma chambre pour dessiner des réseaux de volumes à la mine de plomb. Plus tard, j’ai fait des aquarelles. Je trouvais que cette technique correspondait bien à ma manière de travailler la matière : le pigment évolue dans une flaque liquide et se concentre, révélant le chemin des fluides. Dernièrement, je combine le pastel et la peinture à l’huile sur papier, pour réunir des couleurs et des textures hétérogènes et représenter des formes anthropomorphes qui mutent et qui rêvent. Je puise dans les ', ['Métamorphoses', 'em'], ' d’Ovide pour ma prochaine exposition à la galerie Lelong. Le dessin peut être programmatique, point de départ ou projection d’une sculpture à venir, mais il est aussi une fin en soi. La distinction n’est d’ailleurs pas tout à fait tranchée dans mon esprit : le dessin circule librement entre l’esquisse, la recherche et l’œuvre autonome.'] },
      { spans: [['Pour ceramic brussels 2027, vous serez l’invitée d’honneur : comment comptez-vous aborder cette exposition un peu particulière ?', 'strong']] },
      { spans: [['MV', 'strong'], ' ', 'Je veux réunir différentes étapes de ma recherche plastique, pour offrir une exposition généreuse. Je ne suis pas céramiste ; et pourtant l’argile occupe une place centrale dans mon travail. Je la cuis, je l’émaille, je la combine au verre, mais je l’utilise aussi comme matrice à l’atelier. C’est d’ailleurs la même argile qui me sert depuis plus de dix ans à façonner mes fragments. Une fois le fragment modelé puis moulé, je réhumidifie l’argile, qui redevient disponible pour la sculpture suivante. Dernièrement, je l’ai notamment utilisée pour façonner les modèles de mes figures anthropomorphes en fonte d’aluminium. Même quand elle disparaît du résultat final, elle reste présente à chaque étape de la fabrication, comme un limon fertile qui relie toutes mes productions.'] },
    ];
    out['interview.fr'] = mirror(doc.interview.en, IV, 'marion interview');
    return out;
  },
});

/* ---- VIP page -------------------------------------------------------- */
F.push({
  id: 'page-vip-about',
  setFn: (doc) => {
    const sec = (k2) => (doc.sections ?? []).find((s) => s._key === k2);
    const out = {
      'intro.fr': 'Chaque année, la foire conçoit un programme d’exception, pensé pour les professionnel·les de l’art et les collectionneur·euses du monde entier.',
      'body.fr': mirror(doc.body.en, [
        { spans: ['Élaboré en dialogue avec un réseau d’', ['institutions et de partenaires engagés', enDef(doc.body.en)], ', ce programme redéfinit l’expérience de la foire. Au menu de cette 4e édition : des initiatives qui favorisent l’échange et la rencontre au sein de la foire, et une exploration privilégiée du foisonnant écosystème artistique bruxellois, et bien au-delà.'] },
      ], 'vip body'),
      'sections[_key=="h6"].title.fr': 'aperçu du programme',
      'sections[_key=="h7"].title.fr': 'à la foire',
      'sections[_key=="hk"].title.fr': 'au-delà de la foire',
      'sections[_key=="id"].heading.fr': 'visites découverte',
      'sections[_key=="id"].body.fr': mirror(sec('id').body.en, [
        'Explorez les présentations des galeries à travers le regard d’expert·es. Grâce au soutien de Puilaetco, partenaire principal de la foire, profitez de visites guidées thématiques exclusives et gratuites, du jeudi au dimanche.',
      ], 'vip tours'),
      'sections[_key=="ij"].body.fr': mirror(sec('ij').body.en, [
        'Un lounge exclusif au cœur de la foire, conçu en collaboration avec MAD Brussels et dédié aux talents du design belge d’aujourd’hui et de demain. Chaque jour, le lounge accueille le VIP Aperitivo — un cocktail pensé autour de rencontres privilégiées avec artistes, commissaires et responsables d’institutions.',
      ], 'vip lounge'),
      'sections[_key=="ip"].body.fr': mirror(sec('ip').body.en, [
        'Composez votre programme sur mesure et accédez à des événements strictement réservés à nos invité·es VIP : visites privées de collections personnelles, musées et ateliers d’artistes en coulisses.',
      ], 'vip programme'),
      'sections[_key=="cu"].heading.fr': 'The Hoxton : hôtel partenaire exclusif',
      'sections[_key=="cu"].body.fr': mirror(sec('cu').body.en, [
        'Pour nos visiteur·euses de l’étranger, l’expérience commence dès l’arrivée à Bruxelles : profitez de tarifs préférentiels et d’avantages exclusifs au Hoxton Brussels, le point de chute idéal pour votre séjour.',
      ], 'vip hoxton'),
      'sections[_key=="cx"].body.fr': mirror(sec('cx').body.en, [
        'Une question, une demande particulière ? Notre équipe VIP est à votre entière disposition pour toute question relative à votre visite ou à votre réservation. Écrivez-nous : vip@ceramic.brussels',
      ], 'vip contact'),
    };
    const labelFr = (en) => {
      const e = (en ?? '').trim().toLowerCase();
      if (e === 'learn more') return 'en savoir plus';
      if (e.startsWith('discover ')) return 'découvrir ' + en.trim().slice(9);
      return null;
    };
    for (const s of doc.sections ?? []) {
      for (const l of s.links ?? []) {
        const fr = labelFr(l.label?.en);
        if (fr && !l.label?.fr) out[`sections[_key=="${s._key}"].links[_key=="${l._key}"].label.fr`] = fr;
      }
    }
    // vip lounge / contact headings that already read fine stay; ij heading "vip lounge" copies as-is
    const ij = sec('ij');
    if (ij?.heading?.en && !ij.heading?.fr) out['sections[_key=="ij"].heading.fr'] = ij.heading.en;
    const cx = sec('cx');
    if (cx?.heading?.en && !cx.heading?.fr) out['sections[_key=="cx"].heading.fr'] = 'contact';
    return out;
  },
});

/* ---- awards (art prize 2026 + fair) ---------------------------------- */
F.push({
  id: (d) => null, // handled per-doc below via setFn over the awards query
  find: { query: 'null' },
  skip: true,
});
const AWARD_FIXES = [
  { match: (a) => a.family === 'art-prize' && a.year === 2026 && /2-month/i.test(a.name?.en ?? ''), set: { 'name.fr': 'Résidence de 2 mois' } },
  { match: (a) => a.family === 'art-prize' && a.year === 2026 && /monograph/i.test(a.name?.en ?? ''), set: { 'name.fr': 'Une monographie consacrée au travail de l’artiste', 'outcome.fr': 'est lauréate d’une monographie consacrée à son travail' } },
  { match: (a) => a.family === 'art-prize' && a.year === 2026 && /Latvia/i.test(a.name?.en ?? ''), set: { 'name.fr': 'Résidence de 3 semaines en Lettonie', 'outcome.fr': 'est lauréat d’une résidence de 3 semaines en Lettonie' }, descrFr: [
    'Le·la lauréat·e bénéficiera d’une résidence de trois semaines en Lettonie, développée en partenariat avec le Daugavpils Mark Rothko Museum. Programmée entre avril et mai 2026, ou en 2027, la résidence comprend le logement, les repas et le matériel. Elle se conclura par une exposition au musée Rothko, offrant à l’artiste une visibilité internationale unique.',
  ] },
  { match: (a) => a.family === 'art-prize' && a.year === 2026 && /3-month residency in China/i.test(a.name?.en ?? ''), set: { 'name.fr': 'Résidence de 3 mois en Chine' }, replace: [{ path: 'description.fr', find: 'Marie Pic en Ninon Hivert', to: 'Marie Pic et Ninon Hivert' }, { path: 'description.fr', find: '2026 .', to: '2026.', optional: true }] },
  { match: (a) => a.family === 'art-prize' && a.year === 2026 && /exhibition in Paris/i.test(a.name?.en ?? ''), set: { 'name.fr': 'Une exposition à Paris en 2027' } },
  { match: (a) => a.family === 'art-prize' && a.year === 2026 && /30-day/i.test(a.name?.en ?? ''), set: { 'name.fr': 'Résidence de 30 jours' } },
  { match: (a) => a.family === 'art-prize' && a.year === 2026 && /jury prize|solo show at ceramic/i.test(a.name?.en ?? ''), descrFr: [
    'Lauréate du prix du jury 2026, Marie Pic aura l’occasion de présenter son travail dans un solo show lors de l’édition 2027 de ceramic brussels.',
  ] },
  { match: (a) => a.family === 'fair' && /best booth/i.test(a.name?.en ?? ''), descrFr: [
    'Décerné à la présentation de stand la plus remarquable, ce prix célèbre le dialogue soigné entre les œuvres, l’espace et la scénographie, au service d’une expérience singulière et marquante pour les visiteurs.',
  ] },
  { match: (a) => a.family === 'fair' && /best solo show/i.test(a.name?.en ?? ''), descrFr: [
    'Décerné à une galerie présentant une exposition personnelle d’exception, ce prix célèbre la force de la vision d’un·e artiste et la démarche curatoriale qui la met en valeur.',
  ] },
  { match: (a) => a.family === 'fair' && /best group show/i.test(a.name?.en ?? ''), descrFr: [
    'Nouveau en 2027, ce prix distingue une exposition collective d’exception, qui crée un dialogue fort entre les artistes et met en lumière la diversité des pratiques céramiques contemporaines à travers une vision curatoriale cohérente.',
  ] },
];

/* ---- partner description fixes --------------------------------------- */
F.push({ id: 'demo-partner-options', replace: [{ path: 'description.fr', find: 'le furniture partner de ceramic brussels', to: 'le partenaire mobilier de ceramic brussels.' }] });
F.push({ id: 'demo-partner-romarin-uniforms', replace: [{ path: 'description.fr', find: 'tissus en certifiés en fibres naturelles', to: 'tissus certifiés en fibres naturelles' }] });
F.push({ id: 'demo-partner-visit-brussels', replace: [{ path: 'description.fr', find: 'communicationbruxelloise', to: 'communication bruxelloise' }] });
F.push({
  id: 'demo-partner-brussels-capital-region',
  replace: [
    { path: 'description.fr', find: 'attractive de qualité', to: 'attractive et de qualité' },
    { path: 'description.fr', find: 'au delà des frontières', to: 'au-delà des frontières' },
    { path: 'description.fr', find: 'A travers ses initiatives', to: 'À travers ses initiatives' },
    { path: 'description.fr', find: 'la création de liens entre partenaires européens et à défendre la création artistique contemporaine', to: 'créer des liens entre partenaires européens et défendre la création artistique contemporaine' },
  ],
});
F.push({
  id: 'demo-partner-city-of-brussels',
  setFn: (doc) => ({ 'description.fr': blocks([
    'La 4e édition de ceramic brussels a le soutien de la Ville de Bruxelles. Capitale de la Belgique et de l’Europe, Bruxelles est une ville de créativité et de diversité culturelle, au cœur d’une scène artistique et design foisonnante. Par son engagement pour la culture, la Ville soutient les artistes, les initiatives créatives et les événements qui rassemblent, et qui font de Bruxelles une destination culturelle de premier plan.',
  ]) }),
});

/* ---- advisory board bio typos ---------------------------------------- */
F.push({ id: 'demo-person-florence-reckinger-taddei', replace: [{ path: 'bio.fr', find: 'au Luxemburg', to: 'au Luxembourg' }] });
F.push({ id: 'demo-person-magdalena-gerber', replace: [
  { path: 'bio.fr', find: 'projets sculpturales', to: 'projets sculpturaux' },
  { path: 'bio.fr', find: 'fabrication industriel ', to: 'fabrication industrielle ' },
] });
F.push({ id: 'demo-person-ludovic-recchia', replace: [{ path: 'bio.fr', find: 'institution qu’il a fondé en', to: 'institution qu’il a fondée en' }] });
F.push({ id: 'demo-person-henri-jobbe-duval', replace: [
  { path: 'bio.fr', find: 'Velichovic', to: 'Veličković' },
  { path: 'bio.fr', find: 'Henri Jobbe Duval crée', to: 'Henri Jobbé-Duval crée' },
  { path: 'bio.fr', find: 'Henri Jobbe Duval participe', to: 'Henri Jobbé-Duval participe' },
] });

/* ---- Traiteur Benjamin (food & drinks partner) ------------------------ */
F.push({
  id: (d) => d.traiteurId,
  find: { query: '*[_type=="partner" && name match "Traiteur Benjamin*" && !(_id in path("drafts.**"))][0]._id' },
  setFn: (doc) => ({ 'description.fr': mirror(doc.description.en, [
    'Passionné de gastronomie, Benjamin Schijns a appris auprès des meilleurs : il débute au Pain et le Vin, restaurant étoilé bruxellois, puis travaille aux côtés de Xavier Faber (meilleur sommelier de Belgique 2000), dont il devient l’assistant et le maître d’hôtel, avant de rejoindre comme sommelier le Sea Grill, le restaurant deux étoiles du chef Yves Mattagne.',
    'En 2009, il lance Traiteur Benjamin, dont la qualité de service inspire confiance. Le bouche-à-oreille fait son œuvre et l’entreprise grandit vite. Son parcours et sa polyvalence — sommelier, chef à domicile, traiteur gastronomique, organisateur de réceptions — font la différence. Il aime surprendre et régaler, avec des plats qui éveillent tous les sens.',
  ], 'traiteur') }),
});

/* ---- news: Marion announcement body ---------------------------------- */
F.push({
  id: 'demo-news-marion-verboom-guest-of-honour-2027',
  setFn: (doc) => (doc.body?.en ? { 'body.fr': mirror(doc.body.en, [
    'Chaque année, ceramic brussels invite un·e artiste dont l’œuvre marque le champ de la céramique. En 2027, la foire accueille la sculptrice française Marion Verboom.',
  ], 'news marion') } : {}),
});

/* --------------------------------------------------------------- run */
const setAt = (obj, dotted, value) => ({ [dotted]: value });

function applyReplace(doc, rep) {
  // Walks the field at rep.path (blocks array or plain string) and replaces.
  const parts = rep.path.split('.');
  let node = doc;
  for (let i = 0; i < parts.length - 1; i++) node = node?.[parts[i]];
  const leaf = parts[parts.length - 1];
  const val = node?.[leaf];
  if (typeof val === 'string') {
    if (!val.includes(rep.find)) {
      if (rep.optional) { console.warn(`  ~ optional "${rep.find}" not found at ${rep.path}`); return {}; }
      throw new Error(`"${rep.find}" not found at ${rep.path}`);
    }
    return { [rep.path]: val.replaceAll(rep.find, rep.to) };
  }
  if (Array.isArray(val)) {
    let hit = false;
    const next = val.map((b) => {
      if (b._type !== 'block') return b;
      const children = (b.children ?? []).map((s) => {
        if (typeof s.text === 'string' && s.text.includes(rep.find)) { hit = true; return { ...s, text: s.text.replaceAll(rep.find, rep.to) }; }
        return s;
      });
      return { ...b, children };
    });
    if (!hit) {
      if (rep.optional) { console.warn(`  ~ optional "${rep.find}" not found at ${rep.path}`); return {}; }
      throw new Error(`"${rep.find}" not found at ${rep.path}`);
    }
    return { [rep.path]: next };
  }
  throw new Error(`nothing at ${rep.path}`);
}

const ids = {};
async function main() {
  // resolve dynamic ids
  for (const f of F) {
    if (typeof f.id === 'function' && f.find) f.resolvedId = await client.fetch(f.find.query);
    else f.resolvedId = f.id;
  }
  const awardDocs = await client.fetch('*[_type=="award" && !(_id in path("drafts.**"))]{..., "year": edition->year}');
  for (const a of awardDocs) {
    for (const fix of AWARD_FIXES) {
      if (!fix.match(a)) continue;
      const entry = { resolvedId: a._id, set: { ...(fix.set ?? {}) }, replace: fix.replace };
      if (fix.descrFr) {
        if (a.description?.en?.length) entry.setFn = (doc) => ({ 'description.fr': mirror(doc.description.en, fix.descrFr, `${a._id} description`) });
        else console.warn(`! ${a._id}: no English description, FR description skipped`);
      }
      F.push(entry);
    }
  }

  const targets = F.filter((f) => f.resolvedId && !f.skip);
  const docIds = [...new Set(targets.map((f) => f.resolvedId))];
  const docs = Object.fromEntries((await client.fetch('*[_id in $ids]', { ids: docIds })).map((d) => [d._id, d]));
  const draftIds = (await client.fetch('*[_id in $ids]._id', { ids: docIds.map((i) => `drafts.${i}`) }));

  const backup = { when: new Date().toISOString(), docs: Object.values(docs) };
  const patchesById = {};
  let nSets = 0;
  for (const f of targets) {
    const doc = docs[f.resolvedId];
    if (!doc) { console.warn(`! missing doc ${f.resolvedId}`); continue; }
    const sets = { ...(f.set ?? {}) };
    if (f.setFn) Object.assign(sets, f.setFn(doc));
    for (const rep of f.replace ?? []) Object.assign(sets, applyReplace(doc, rep));
    if (!Object.keys(sets).length) continue;
    patchesById[f.resolvedId] = { ...(patchesById[f.resolvedId] ?? {}), ...sets };
    nSets += Object.keys(sets).length;
  }

  for (const [id, sets] of Object.entries(patchesById)) {
    console.log(`\n${id}`);
    for (const [p, v] of Object.entries(sets)) {
      const preview = typeof v === 'string' ? v : Array.isArray(v) ? `[${v.length} block(s)] ${JSON.stringify(v[0]?.children?.[0]?.text ?? '').slice(0, 60)}…` : JSON.stringify(v).slice(0, 80);
      console.log(`  ${p} = ${preview.slice(0, 110)}`);
    }
  }
  console.log(`\n${Object.keys(patchesById).length} document(s), ${nSets} field(s). Drafts also patched: ${draftIds.length}`);

  if (!APPLY) { console.log('\nDry run - nothing written. Re-run with --apply.'); return; }

  fs.mkdirSync(BACKUPS, { recursive: true });
  const bpath = path.join(BACKUPS, `fr-qa-fix-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(bpath, JSON.stringify(backup, null, 1));
  console.log(`backup: ${bpath}`);

  const tx = client.transaction();
  for (const [id, sets] of Object.entries(patchesById)) {
    tx.patch(id, (p) => p.set(sets));
    if (draftIds.includes(`drafts.${id}`)) tx.patch(`drafts.${id}`, (p) => p.set(sets));
  }
  const res = await tx.commit();
  console.log(`applied: transaction ${res.transactionId}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
