# ceramic.brussels — inventory of the existing (Laravel) site

Crawled 2026-09-02 from `https://www.ceramic.brussels/`. The parsed exhibitor rows are in `scripts/legacy/exhibitors-<year>.json`; the raw HTML was not kept.

Stack observed: Laravel (`ceramic_brussels_session` cookie, `/build/assets/app-*.js|css` Vite bundle), Apache, Alpine.js front-end, Glide-style image server at `/img/{uuid}/{filename}?fm=jpg&q=80&fit=max&w=…`, uploads at `/storage/uploads/{uuid}/{file}`. Web development credited to "Variable" (variable.club). Google Analytics 4 (`G-XVTPYEC66H`) is loaded with no consent banner.

---

## 1. URL structure

### 1.1 Language prefix and redirects

| Request | Result |
| :-- | :-- |
| `https://www.ceramic.brussels/` | `302` → `https://www.ceramic.brussels/en` |
| `https://ceramic.brussels/` (apex) | `302` → `https://ceramic.brussels/en` (apex is served as well, not redirected to www; internal links mix both hosts) |
| `/en`, `/fr`, `/nl` | homepages (no trailing slash) |

Every page URL is `/{lang}/{slug}` (top-level) or `/{lang}/pasteditions/{slug}` (past-edition subpages). No trailing slashes anywhere. There are **no hreflang tags and no canonical tags**.

**Slugs are shared across languages.** The language switcher just swaps the prefix and keeps the current slug, so `/fr/visitors-info` and `/nl/visitors-info` are valid. Each page nevertheless has a *localised* slug that the FR/NL navigation uses (e.g. `/fr/infos-pratiques`, `/nl/galerietoepassingen`). The router resolves **any** of a page's slugs under **any** language prefix (`/nl/candidatures-galeries` and `/fr/galerietoepassingen` both return 200). Old/renamed slugs also keep resolving (`/en/news-and-collab` and `/en/programme` both render the *food & drinks* page; `/en/photos`, `/en/team`, `/en/faq` render sub-sections as standalone pages). For redirects, treat every slug in the table below as an alias of the same page.

### 1.2 Top-level pages (nav order)

| Page | EN slug | FR nav slug | NL nav slug | Other slugs that also resolve |
| :-- | :-- | :-- | :-- | :-- |
| Home | `/en` | `/fr` | `/nl` | |
| Ceramic Brussels (about) | `/en/ceramic-brussels` | `/fr/ceramic-brussels` | `/nl/ceramic-brussels` | `team`, `photos` (render single sections) |
| Gallery applications | `/en/gallery-applications-2` | `/fr/candidatures-galeries` | `/nl/galerietoepassingen` | `gallery-applications-2` works in all langs |
| Exhibitors (2026) | `/en/exhibitors` | `/fr/exhibitors` | `/nl/exhibitors` | `exhibitors/2026` |
| Exhibitors by year | `/en/exhibitors/2025`, `/en/exhibitors/2024` | `/fr/exhibitors/2025` | `/nl/exhibitors/2024` | `exhibitors/2023`, `exhibitors/2027` return 200 with an empty list |
| Art prize | `/en/art-prize` | `/fr/art-prize` | `/nl/art-prize` | |
| Guest of honour | `/en/guest-of-honour` | `/fr/invitee-d-honneur` | `/nl/guest-of-honour` | `invitee-d-honneur` works in all langs (home page CTA links to it) |
| Food & drinks | `/en/food-and-drinks-2` | `/fr/food-and-drinks-2` | `/nl/food-and-drinks-2` | `news-and-collab`, `programme` (legacy slugs of the same page) |
| Partners | `/en/partners-3` | `/fr/partenaires-2` | `/nl/partners-2` | `partners-3`, `partners-2`, `partenaires-2` all work in all langs; `programme-2` → "institutions" section, `programme-3` → "exhibition pass" section |
| Visitors info | `/en/visitors-info` | `/fr/infos-pratiques` | `/nl/visitors-info` | `infos-pratiques` works in all langs; `faq` renders the FAQ section |
| Contact | `/en/contact` | `/fr/contact` | `/nl/contact` | |
| Press | `/en/press` | `/fr/press` | `/nl/press` | |
| Past editions (index) | `/en/pasteditions` | `/fr/pasteditions` | `/nl/pasteditions` | |

Examples: `https://www.ceramic.brussels/en/visitors-info`, `https://www.ceramic.brussels/fr/infos-pratiques`, `https://www.ceramic.brussels/nl/galerietoepassingen`.

### 1.3 In-page section anchors (sub-navigation)

Each content page is one long page whose left-hand sub-nav sets `location.hash`; Alpine reads the hash on load. Anchors are linked from other pages, so they matter for redirects:

- `/en/ceramic-brussels#ceramic-brussels | #objectives | #scenography-2 | #advisory-board-3 | #team | #photos` (also linked as `#founders`)
- `/en/art-prize#art-prize | #2027-art-prize-jury | #2026-awards | #2026-set-design | #jury-prize-2026` (also linked as `#awards-2`, `#jury-2`)
- `/en/visitors-info#visitors-info | #venue | #access | #hotel-deal | #exhibition-pass | #faq`
- `/en/partners-3#partners-3 | #main-partner | #hotel | #logistics | #institutions | #corporate | #exhibition-pass-2 | #media | #furniture | #apparel | #drinks`
- `/en/guest-of-honour#guest-of-honour | #interview-with-marion-verboom`
- `/en/food-and-drinks-2#food-and-drinks-2`

### 1.4 Past-edition subpages `/{lang}/pasteditions/{slug}`

All 27 subpages exist in EN/FR/NL with the same slug. The index groups them by edition (order as displayed):

| Edition | Slug | Page title |
| :-- | :-- | :-- |
| 2026 | `art-prize-2` | art prize (2026 laureates + 2026 jury) |
| 2026 | `guest-of-honour-31` | guest of honour (Elmar Trenkwalder) |
| 2026 | `programme-32` | programme (2026 summary) |
| 2025 | `art-prize-jury-2` | art prize jury (2025) |
| 2025 | `team-2` | team (2025) |
| 2025 | `art-prize-laureates-2` | art prize laureates (2025) |
| 2025 | `guest-of-honour-3` | guest of honour (Elizabeth Jaeger) |
| 2025 | `norwegian-focus` | *Norwegian focus |
| 2025 | `awards` | awards (2025) |
| 2025 | `programme-3` | programme (2025, full talks schedule) |
| 2025 | `entrance-art-installation` | entrance art installation (KRJST Studio) |
| 2025 | `magazine-2` | magazine (2025) |
| 2025 | `ideat-special-prize` | IDEAT special prize |
| 2025 | `partners-3` | partners (2025) |
| 2025 | `photos` | photos (2025 key figures + gallery) |
| 2024 | `1st-edition` | 1st edition (key figures + gallery) |
| 2024 | `guest-of-honour` | guest of honour (Johan Creten) |
| 2024 | `art-prize-laureates` | art prize laureates (2024) |
| 2024 | `advisory-board` | advisory board (2024) |
| 2024 | `art-prize-jury` | art prize jury (2024) |
| 2024 | `partners` | partners (2024) |
| 2024 | `team` | team (2024) |
| 2024 | `collaborations` | collaborations (2024) |
| 2024 | `programme-27` | programme (2024, full talks schedule) |
| 2024 | `magazine` | magazine (2024) |

Examples: `https://www.ceramic.brussels/en/pasteditions/awards`, `https://www.ceramic.brussels/fr/pasteditions/guest-of-honour-3`, `https://www.ceramic.brussels/nl/pasteditions/1st-edition`. Note `/en/awards`, `/en/collaborations`, `/en/magazine`, `/en/1st-edition` are **404** (only the nested form works), even though the sitemap and a 2024 programme entry still point at `ceramic.brussels/awards` and `ceramic.brussels/collaborations`.

### 1.5 Dead / stale internal links found

- `https://ceramic.brussels/en/programme-69` — linked from *visitors info* ("→ talks programme") and *partners*; **404** in all languages.
- `https://ceramic.brussels/en/infos-pratiques#exhibition-pass` and `…/en/news-and-collab` — work via slug aliasing.
- `sitemap.xml` lists un-prefixed URLs (`/exhibitors`, `/ceramic-brussels`, `/guest-of-honour`, `/programme`, `/art-prize`, `/collaborations`, `/visitors-info`, `/contact`, `/press`); un-prefixed URLs are not what the site actually serves.
- `robots.txt` is `User-agent: * / Disallow:` (allow all).

### 1.6 Asset URL patterns

- Images: `https://ceramic.brussels/img/{uuid}/{slugified-filename}.{jpg|png}?fm=jpg&q=80&fit=max&w={480|640|960|1280|2560}` (srcset ladder 480/640/960/1280; lightbox links use `w=2560`; OG image uses `crop=…&w=1200&h=630`).
- Files: `https://ceramic.brussels/storage/uploads/{uuid}/{original filename}.pdf`.
- Front-end bundle: `/build/assets/app-554f02e4.js`, `/build/assets/app-89c36f64.css`.
- Favicons: `/favicon-16x16.png`, `/favicon-32x32.png`, `/apple-touch-icon.png`, `/site.webmanifest`.

---

## 2. Content types and their fields

### 2.1 Exhibitor (gallery / publisher)

There are **no exhibitor detail URLs**. The exhibitors page is one accordion: each exhibitor is an `<article data-block="exhibitor">` that expands in place. Rows are grouped under `<h2>` section headings, and the page exists per year (`/exhibitors`, `/exhibitors/2025`, `/exhibitors/2024`).

Fields observed per exhibitor:

| Field | Notes / example |
| :-- | :-- |
| name | Free text incl. country code(s) in parentheses, e.g. `Galerie Fontana (nl)(be)`, `Almine Rech (be/fr/us)`, `Format (no) ___ focus Norway`. Country is **not** a separate field — it is typed into the name, inconsistently (`(gb)` vs `(uk)`, `(tr)(de)` vs `(de/lb)`). |
| booth | Short code, e.g. `A11`, `B25`, `C3`; 2024 has a range `B14 - B15`. Halls: A and B = galleries, C = publishers. |
| section | 2026: `focus España`, `jury prize 2025`, `exhibitors`, `editors & books`; 2025/2024: `exhibitors` (+ `editors & books` in 2025). |
| description | Rich text (HTML `<p>`, `<br>`, links), 380–1 800 characters, translated EN/FR/NL. Usually ends with the website link, an Instagram handle rendered as `@handle`, and one sentence "For this third edition of ceramic brussels, the gallery will present …" naming the artists. |
| website | External link (sometimes bare `www.berlingaleria.es` without protocol, sometimes with `?fbclid=` junk). |
| instagram | Link to instagram.com/… rendered as `@handle`. |
| images | 0–8 gallery images with `data-caption` (artist, title, year, credit), width/height, masonry + PhotoSwipe lightbox. Captions e.g. `Ertugrul Güngör & Faruk Ertekin, Pise on Fire, 2025`, `Frédérique Fleury, Les Endormies`. |

Examples (2026):

1. **ANNA LAUDEL (tr)(de)** — booth `B25` — section *exhibitors* — 1 207-char bio ("Anna Laudel was founded in 2012 and is now located in the heart of Beyoglu…") — `annalaudel.gallery`, `@annalaudel.gallery` — closes with "the gallery will showcase a group show by Anke Eilergerhard and Ertugrul Güngör & Faruk Ertekin." — 4 images.
2. **Galerie Judith Andreae (de)** — booth `A11` — 1 318 chars — `galerie-andreae.de`, `@galeriejudithandreae` — 3 images. (Best booth 2026.)
3. **Al-Tiba9 Gallery (es)** — booth `B9` — section *focus España* — 920 chars ("Founded in 2013 in Algeria…") — `altiba9.gallery`, `@altiba9` — "will present a solo show by Barry Wolfryd" — 4 images, captions like `Barry Wolfryd, Knowing When to Quit, Murano glass, 68x33x29cm, 2023`.
4. **Mercatorfonds** — booth `C3` — section *editors & books* — 819 chars — `mercatorfonds.be`, `@mercatorfondsfondsmercator` — 0 images.
5. Special row: **>> tribute to Enric Mestre (1936 - 2025) <<** — booth `B6` — section *focus España* — a tribute, not a gallery (963 chars, 1 image). Likewise 2026 `Léonore Chastagner (fr)` B16 sits under *jury prize 2025* (a solo show, not a gallery) and 2025 has `→ jury prize 2024 solo show` at B11.

### 2.2 Artist

No artist content type on the old site. Artists only appear (a) inside exhibitor descriptions as prose, (b) in image captions, and (c) as a downloadable PDF list — the "artists" link on the exhibitors page points to `https://ceramic.brussels/storage/uploads/2d148ec1-98e0-4d6f-a763-5fce9a589f45/Capture-d’écran-2026-01-15-à-16.09.pdf` (a screenshot PDF). Key figure quoted: "200+ artists".

### 2.3 Art-prize laureate

Shown on `/art-prize` (current year) and `pasteditions/art-prize-2`, `art-prize-laureates-2`, `art-prize-laureates`. Fields:

| Field | Example |
| :-- | :-- |
| name + country code | `Marie Pic (fr)`, `Danny Cremers (nl)`, `Walter Yu (cn)`, `Duo Vertigo: Nitsa Meletopoulos (fr) & Victor Alarçon (fr)` |
| instagram | `@mariepic` |
| website (optional) | `damienfragnon.com`, `maelledufour.be` |
| bio | 2024 & 2025 laureates have 300–600-char bios (often with a quoted first-person sentence); 2026 laureates have **no bio**, only images |
| awards won | List: "Marie Pic is the winner of: the Jury Prize 2026. the YXCCCA (cn) residency 2026." |
| portrait + work images | 2–4 images with captions `Marie Pic, Jardin Précieux, 2024 @RomainBlanck` |

Laureates per year:
- **2026 (10):** Lorie Ballage (fr), Uriel Caspi (il), Danny Cremers (nl), Kira Fröse (de), Ninon Hivert (fr), Santiago Insignares-Martínez (co), Faye Papargyropoulou (gr), Marie Pic (fr), Angelika Stefaniak (pl), Walter Yu (cn).
- **2025 (10):** Asya Marakulina (ru), Béatrice Guilleman (fr), Camilla Hanney (ie), Eléonore Griveau (fr), Léonore Chastagner (fr), Luna-Isola Bersanetti (fr), Maëlle Dufour (be), Pascale Robert (fr), Pia Mougeot (fr), Raphaël Emine (fr).
- **2024 (10):** Antoine Moulinard (fr), Audrey Ballacchino (fr), Damien Fragnon (fr), Elsa Guillaume (fr), François Bauer (fr), Inup Park (kr), Joke Raes (be), Jonas Moënne (fr), Ming-Miao Ko (tw), Duo Vertigo (Nitsa Meletopoulos & Victor Alarçon).

### 2.4 Award (prize given by an institutional partner)

On `/art-prize#2026-awards` and `pasteditions/awards` (2025). Fields: awarding institution + country (`Keramis (be)`), award title (`a residency prize Keramis - ceramic brussels, in July 2026`), description (300–900 chars), institution website, winner sentence ("Walter Yu is the winner of the Keramis (be) residency 2026.").

- **2026 awards:** The jury prize (solo show at CB 2027) → Marie Pic; Ambassade de France en Belgique (monograph with Éditions des Ateliers d'Art de France) → Ninon Hivert; Les Ateliers dans la Forêt (fr) residency → Danny Cremers; Centre Wallonie-Bruxelles | Paris (exhibition 2027 season) → Ninon Hivert; Keramis (be) residency July 2026 (€2 000 + €500 kiln budget) → Walter Yu; Latvian Centre for Contemporary Ceramics (lv) residency with Daugavpils Mark Rothko Museum → Danny Cremers; YXCCCA (cn) two 3-month residencies in Yixing (15 000 RMB grant) → Marie Pic & Ninon Hivert.
- **2025 awards:** Jury prize → Léonore Chastagner; Ambassade de France (monograph with R.S.V.P.) → Raphaël Emine; Les Ateliers dans la Forêt → Raphaël Emine; Ceramic Art Andenne (exhibition "Perspectives", 17 May–15 June 2025) → Luna-Isola Bersanetti, Béatrice Guilleman, Raphaël Emine; Centrale for contemporary art (group show 09/04–23/08/2026, €2 000) → Léonore Chastagner; Centre Wallonie-Bruxelles Paris (Galerie Talmart, Sept 2025) → Luna-Isola Bersanetti; Keramis residency July 2025 → Pia Mougeot; CCCA – Sushan residency → Asya Marakulina, Béatrice Guilleman.
- **2024 awards** (mentioned in the 2024 programme only): jury prize, Fondation LAccolade – Institut de France prize, Centre Wallonie-Bruxelles/Paris prize. Jury prize 2024 → Damien Fragnon (solo show 2025).
- **Fair awards (not art prize):** Best booth 2026 → Galerie Judith Andreae (DE), works by Janis Löhrer; Best solo show 2026 → SECCI (IT), works by Kevin Francis Gray; Best gallery stand 2025 → Galerie SCENE OUVERTE (FR); Best solo show 2025 → Sorry We're Closed (BE); IDEAT special prize 2025 → Nellie Johnson (QB Gallery).

### 2.5 Jury member / advisory-board member / team member (person)

Same shape everywhere: `name (country)`, `title/role` (h4), bio (0–1 500 chars), Instagram handle(s), website(s), portrait image (advisory board and team only).

- **Art prize jury 2027** (`/art-prize#2027-art-prize-jury`): Charles Kaisin (be) — Designer & Scenographer; Duan Zhang de Courrèges (fr) — curator & art advisor; Galila (be) — Founder of Galila's P.O.C; Jean-Marc Dimanche (fr); Shinsuke Kawahara (jp) — Pluridisciplinary artist.
- **Jury 2026** (`pasteditions/art-prize-2`): Jean-Marc Dimanche (fr); Wendy Gers (fr/za) — Princessehof; Jean-Charles Hameau (fr) — Musée national Adrien Dubouché / Sèvres; Lionel Jadot (be); Maral Kekejian (es) — EUROPALIA ESPAÑA.
- **Jury 2025** (`art-prize-jury-2`): Anaïs Sandra Carion (be) — MAD Brussels; Axelle de Buffévent (fr) — Pernod Ricard; Jean-Marc Dimanche (fr); Vincent Lieber (ch) — Château de Nyon; Vittoria Matarrese — Bally Foundation.
- **Jury 2024** (`art-prize-jury`, "200 applications received"): Caroline Andrin — La Cambre; Joël Riff — Moly-Sabata / La Verrière Hermès; Pascale Mussard — Fondation d'entreprise Hermès; Jean-Marc Dimanche; Stéphanie Pécourt — Centre Wallonie-Bruxelles/Paris.
- **Advisory board 2026** (`/ceramic-brussels#advisory-board-3`, 6 with portraits): Christine Germain-Donnat (fr) — Patrimony Curator / Ministère de la Culture; Florence Reckinger Taddeï (fr) — President Les Amis des Musées Luxembourg; Ludovic Recchia (be) — Director of Keramis; Geertje Jacobs (nl) — Director EKWC; Magdalena Gerber (ch) — Head of CERCCO, HEAD-Geneva; Henri Jobbé-Duval (fr) — co-founder of the Fiac. **2024 board** (`pasteditions/advisory-board`): Germain-Donnat, Jacobs, Johan Creten (be), Recchia, Gerber.
- **Team 2026** (`/ceramic-brussels#team`, with portraits, email, phone): Gilles Parmentier — co-director (`gilles@ceramic.brussels`, +32 476 91 07 87); Jean-Marc Dimanche — co-director (`jean-marc@ceramic.brussels`, +33 6 16 24 08 28); Tiphaine Quéguineur — exhibitors relations & fair coordination (`tiphaine@ceramic.brussels`, +32 492 57 65 51); Julie Alluin — communication & partners relations (`julie@ceramic.brussels`, +32 472 45 35 49); Léonie Lefere — graphic designer (`leonie@ceramic.brussels`); Félicie Jourdain — communication & partners relations (`felicie@ceramic.brussels`). Note: one FR/NL mailto is misspelt `tipahine@ceramic.brussels`.
- **Collaborators 2026:** Sophie Carrée PR (public & press relations, sophiecarree.com); Pam&Jenny (visual identity, pametjenny.be); Variable (web development, variable.club); Luc Meessen (production & logistic supervisor, novesgroup.com); Art Fairs Service (art walls, artfairsservice.com). 2024 also listed Aesthete (social media), Olivier De Roeck (scenography), Brainstories (production agency), ADC production (light & sound).
- **Team 2025** (`team-2`): Parmentier, Dimanche, Stéphanie Vessière (exhibitions & production coordinator), Tiphaine Quéguineur (fair coordinator), Célia Braeken (gallery coordinator), Léonie Lefere, Florence Le Lièvre (communication support), Amélie Ansia (fair assistant). **Team 2024** (`team`): Parmentier, Dimanche, Carole Druez (fair coordinator), Stéphanie Vessière, Tiphaine Queguineur (fair assistant), Pauline Bertand (fair support).

### 2.6 Partner

Fields: name, tier/group (h4 headings), logo image (alt = filename, e.g. `Puilaetco Black`, `Logo Wbi Noir Basse Resolution`), external link on the logo, and for the featured ones a description (200–2 000 chars), website, Instagram handle. Media partners are logo-only (no text). Full list in section 3.2.

### 2.7 Vendor (food & drinks)

`/food-and-drinks-2`: name, subtitle (h4, e.g. `by Traiteur Benjamin`, `*partner since the first edition`, `Belgian Craft Beers`), description 500–1 400 chars, Instagram, website, image. 2026: **Chez Loulou by Traiteur Benjamin**, **Fernand Obb**, **Flora Brussels**, **MOK COFFEE**. (2024 `collaborations` page also lists MAD Brussels, Rond Carré Studio, AMA, Éditions Ateliers d'Art de France, rayon belge, Atelier Pierre Culot, Fernand Obb, MOK.)

### 2.8 Guest of honour (artist feature)

One page per edition. Fields: name, edition, intro paragraph ("Every year, ceramic brussels takes the initiative to invite an artist…"), long bio (1 500–3 000 chars), section "sculptural practice"/"biography & works", images with credit captions (`© Nicolas Brasseur`), interview (Q&A, ~5 000 chars for Marion Verboom), collaborating gallery.

- 2027: **Marion Verboom** (b. 1983, Paris; with Galerie Lelong Paris) — `/guest-of-honour`.
- 2026: **Elmar Trenkwalder** (AT; Galerie Bernard Jordan) — `pasteditions/guest-of-honour-31`.
- 2025: **Elizabeth Jaeger** (US, b. 1988; Mennour) — "AT TWILIGHT" installation text by Jean-Marc Dimanche — `pasteditions/guest-of-honour-3`.
- 2024: **Johan Creten** (BE) — `pasteditions/guest-of-honour`.

### 2.9 Event / programme entry

Full schedules exist for 2024 (`programme-27`) and 2025 (`programme-3`); 2026 only has a summary (`programme-32`) and the 2026 talks page (`programme-69`) is a dead link. Entry fields: day heading (`thu 23 jan.`), time range (`13:30 – 14:20`), category (h4: `talks - opening conferences`, `talks - Norwegian ceramics`, `awards ceremony`, `talks - book & ceramic art`), title, language tag (`(fr)`, `language: EN / FR`), moderator, speakers (with country codes and affiliations), location (`talk area // hall B`), description, link ("Practical info here"). Also non-talk entries: `preview` (upon invitation), `vernissage`, `public opening`, `public late opening`, `art prize award ceremony`, and an extra-muros talk ("« Pourquoi je n'aime pas la céramique ! » by Johan Creten", 23 Jan 2024, Auditoire Stynen, Abbaye de La Cambre).

Examples: 2025-01-23 13:30–14:20 "interview of Elizabeth Jaeger, guest of honour 2025", interviewer Rafael Pic (Le Quotidien de l'Art), EN, talk area hall B. 2025-01-24 12:00–12:50 "clay meets painting", moderator Jorunn Veiteberg, speakers Anders Hald, Marit Tingleff, Mikaela Bruhn Aschim (QB Gallery). 2024-01-25 15:30–16:20 (nl) "Gesprek met Carolein Smit", moderator Geertje Jacobs.

### 2.10 Edition

No edition document, but per-edition facts are scattered: key-figure strings (`1st-edition`, `photos`, home "review of the 3rd edition"), dates, focus country, guest of honour, exhibitor year lists, brochure/catalogue links. See section 4.

### 2.11 Page (generic) and homepage blocks

Generic pages = title + ordered sections (each with slug/anchor, h2 title, rich text, image gallery with captions/credits). Pages: about, gallery applications, food & drinks, partners, visitors info, press, contact, plus all past-edition pages.

Homepage = ordered "news" cards, each: h1 title, one-line text, CTA arrow link, image, caption/credit. Current cards: *visions behind ceramic brussels 2026* (→ YouTube film), *Marion Verboom* (→ guest of honour), *gallery applications are open*, *review of the 3rd edition* (key figures → fliphtml5 overview), *discover the 2026 catalogue* (→ fliphtml5), *best booth 2026*, *best solo show 2026*, *jury prize 2026*, *browse the 2026 exhibitors*. Hero: "the first international contemporary art fair dedicated to ceramics" + date badge `21 - 25 jan. 2026`. There is no separate news/press-release archive.

### 2.12 Exhibition-pass institution

On visitors info (#exhibition-pass) and partners (#exhibition-pass-2): institution name, subtitle, current exhibition ("For the exhibition : Bachelot & Caron. Porcelaine et faits divers → 31.01.2026 to 03.05.2026"), address, website, Instagram, logo. 2026: **BPS22** (Charleroi), **Centrale for contemporary art** (Brussels), **CID Grand-Hornu**, **Keramis** (La Louvière — its dates still read 2025, stale).

### 2.13 Forms

- Gallery application form (`/gallery-applications-2`): Last name*, First name*, Gallery name*, Email address* → "Send". Contact for questions: `tiphaine@ceramic.brussels`. Deadline text: "Applications are open until September 30th."
- No other forms; newsletter goes to Mailchimp externally.

### 2.14 Translation coverage

FR and NL are genuinely translated for: nav labels, homepage cards, about, gallery applications, art prize intro, guest of honour, visitors info (partly — `days & hours` heading and ticket table stay English, venue heading is `lieu`), exhibitor descriptions (fully translated for 2026, 2025, 2024). Past-edition pages are mostly English in all three languages (FR/NL versions are byte-for-byte nearly identical to EN). Home meta descriptions are stale in FR/NL ("s'est tenue du 22 au 26 janvier 2025").

---

## 3. Lists

### 3.1 Exhibitors 2026 (67 rows, `/en/exhibitors`)

No detail URLs exist; the "URL" for every row is `https://www.ceramic.brussels/{lang}/exhibitors` (accordion). Country as typed on the site.

**focus España**
| Name | Country | Booth |
| :-- | :-- | :-- |
| >> tribute to Enric Mestre (1936 - 2025) << | es (tribute) | B6 |
| Al-Tiba9 Gallery | es | B9 |
| Barrera Baldán Galería | es | B11 |
| METRO | es | B12 |
| Osnova | es | B8 |
| Ponce+Robles and Jorge López Galería | es | B7 |
| Tramuntana Gallery | es | B10 |

**jury prize 2025**
| Léonore Chastagner | fr | B16 |
| :-- | :-- | :-- |

**exhibitors**
| Name | Country | Booth |
| :-- | :-- | :-- |
| A. Iynedjian Fine Art (AIFA) | ch | B29 |
| ANALORA | — | B28 |
| ANNA LAUDEL | tr, de | B25 |
| arsenic galerie | fr | B33 |
| Bernard Jordan Gallery | fr | B34 |
| Brazil Modernist / Pereira & Matis | fr | B30 |
| CHAxARTxRTM | — | A5 |
| Deletaille Gallery | — | A28 |
| Esther Verhaeghe | be | A21 |
| Format Oslo | no | B32 |
| Galeri NEV | tr | A18 |
| Galerie Anne-Sarah Bénichou | fr | B15 |
| Galerie Aurélien Gendras | fr | A27 |
| Galerie Capazza | fr | B26 |
| Galerie Christine Colon | be | A3 |
| Galerie du Don | fr | B20 |
| Galerie du Passage | fr | A19 |
| Galerie dudokdegroot | nl | A4 |
| Galerie Fontana | nl, be | B1 |
| Galerie Hioco | fr | A14 |
| Galerie Judith Andreae | de | A11 |
| Galerie Metzger | de | B5 |
| Galerie Michel Giraud | fr, lu | B24 |
| Galerie Pauline Renard | fr | A16 |
| Galerie Sylvain Courbois | fr | B14 |
| Galerie Vallois | fr | A13 |
| GALERIST | tr | A18 (duplicate booth with Galeri NEV as published) |
| Galleria Anna Marra | it | A23 |
| Galleria Antonella Villanova | it | A26 |
| Han Collection | gb | B31 |
| Jarmuschek + Partner | de | B18 |
| Jonathan Kugel | be | B2 |
| Køppe Contemporary Objects | dk | A15 |
| La peau de l'ours | be | A2 |
| Laurentin gallery | be, fr | B22 |
| Lefebvre & Fils | fr | A20 |
| MALA Gallery | fr | B21 |
| MBA Fine Arts | fr | A9 |
| NeC nilsson et chiglien | fr | A24 |
| NIKA Project Space | ae, fr | B27 |
| Peach Corner | dk | A7 |
| Puls ceramics | be | A10 |
| QB Gallery | no | B19 |
| Rademakers Gallery | nl | A6 |
| School Gallery | fr | B17 |
| Sealed Earth | gr | B4 |
| SECCI | it | A25 |
| Skog Art Space | no | A8 |
| Sorry We're Closed | be | B23 |
| SPAX Projects | be | B3 |
| Spazio Nobile | be | A12 |
| The Delville Collection | be, th | A22 |
| Thomas Fritsch | fr | A17 |
| YOD Gallery | jp | A1 |
| YVONNE HOHNER CONTEMPORARY | de | B13 |

**editors & books**
| Name | Booth |
| :-- | :-- |
| Arnoldsche Art Publishers | C2 |
| Éditions Ateliers d'Art de France | C4 |
| Latvian Centre for Contemporary Ceramic | C1 |
| Mercatorfonds | C3 |

Websites/Instagram for each row are in `en-exhibitors.html.json` (fields `links`).

**Exhibitors 2025 (68 rows, `/en/exhibitors/2025`)** — → jury prize 2024 solo show (B11); acb Galéria (hu) B16; AIFA (ch) A23; Almine Rech (be/fr/us) A20; arsenic galerie (fr) B27; BeCraft (be) B1; Belgian Gallery (be) A6; espace à vendre (fr) A11; Format (no) *focus Norway* A26; Galerie Annabelle Boulakia (fr) B33; Galerie Anne Sophie Duval (fr) B20; Galerie Ariane C-Y (fr) A8; Galerie Aurélien Gendras (fr) A24; Galerie Bernard Jordan (fr) B28; GALERIE CAPAZZA (fr) B18; Galerie Christine Colon (be) B6; Galerie Desprez Breheret (fr) B3; Galerie du Don (fr) A16; Galerie du Passage (fr) A13; galerie dudokdegroot (nl) A4; Galerie Fontana (nl) B29; Galerie Gastou (fr) A15; Galerie Jacques Cerami (be) B32; Galerie Lélia Mordoch (fr) B19; Galerie Michel Giraud (fr) B15; Galerie Olivier Castaing /Team School Gallery (fr) B31; Galerie Polaris (fr) A29; Galerie SCENE OUVERTE (fr) A7; Galerie Sylvain Courbois (fr) A10; Galerie Tanit (de/lb) B21; Galerie Transit (be) A18; Galerie Vallois (fr) A14; Galleria Anna Marra (it) A25; GoMulan Gallery (nl) A5; Han Collection (uk) B25; HELENE BAILLY (fr) A22; Hostler Burrows x HB381 (us) A21; Jarmuschek + Partner (de) B13; Joanna Bird Gallery (uk) A32; Jonathan F. Kugel (be) B30; Kiosken (no) *focus Norway* B8; La peau de l'ours (be) A2; Lancz gallery (be) A31; Lefebvre & Fils (fr) B4; MBA Fine Arts (fr) A9; Mennour (fr) A28; Modern Shapes (be) B17 and B26; NeC Nilsson et Chiglien (fr) A27; Nendo Galerie (fr) B5; NQ Gallery (be) A30; Peach Corner (dk) A1; Puls Ceramics (be) B12; QB Gallery (no) *focus Norway* B9; RAM galleri (no) *focus Norway* B7; Reuter Bausch Art Gallery (lu) B24; Romero Paprocki (fr) A17; Sèvres (fr) B23; SKOG Art Space (no) *focus Norway* B10; Sorry We're Closed (be) B22; SPAX Projects (be) B2; Spazio Nobile (be) B14; Thomas Fritsch - ARTRIUM (fr) A19; YOD Gallery (jp) A3; Zwart Huis (be) A12; **editors & books:** arnoldsche Art Publishers C3; Éditions Ateliers d'Art de France C2; R.S.V.P. Editions C1.

**Exhibitors 2024 (56 rows, `/en/exhibitors/2024`)** — AIFA (ch) B29; Alice Gallery (be) B1; Almine Rech (be/fr/us) A19; aquilaluna (be) B8; arsenicgalerie (fr) B24; Atelier Ecru Gallery (be) A23; backslash (fr) A3; BeCraft (be) B9; Berman Contemporary (za) B22; CONSTELLATIONS GALLERY (za/be) B21; Double V Gallery (fr) A24; F R A C A S (be) B5; GALERIE BERNARD JORDAN (fr/de/ch) B25; GALERIE CAPAZZA (fr) B14 - B15; Galerie Christine Colon (be) B6; GALERIE DU PASSAGE (fr) B19; Galerie DYS (be) A2; Galerie Fontana (nl) B13; Galerie Grès (fr) A5; Galerie Jacques Cerami (be) B28; Galerie La La Lande & SBA (fr) B18; Galerie Lefebvre & Fils, Paris (fr) B12; Galerie Maria Lund (fr) B26; Galerie Michel Giraud (fr) A16; Galerie Papillon (fr) A17; galerie Sator (fr) A25; Galerie Transit (be) A18; Galerie Vallois (fr) A13; Gallery Sofie Van den Bussche (be) B7; Grège Gallery (be) A8; Jonathan F. Kugel (be) B13; Køppe Contemporary Objects (dk) B23; La peau de l'ours (be) A12; Lee Bauwens Gallery (be) A15; Michel Rein (fr/be) B2; Migrant Bird Space (de/cn) A7; Modern Shapes Gallery (be) A14; Modulab (fr) A9; NeC nilsson et chiglien (fr) A29; Nendo Galerie (fr) A27; NQ Gallery Antwerpen (be) A26; olivier castaing / Team School Gallery (fr) A21; Patrick & Ondine Mestdagh From The Delville Collection (be) A22; Peach Corner (dk) B11; Puls Ceramics (be) A10; Romero Paprocki (fr) A20; rossogranada (ch) B23; Sorry We're Closed (be) B20; SPAX Projects (be) A1; Spazio Nobile (be) B17; Szydlowski (ch/pl) A28; TATJANA PIETERS (be) A6; The Second Act (uk) B4; the Spaceless Gallery (fr/us) B27; Valerius Gallery (lu) B10; ZWART HUIS (be) A11.

### 3.2 Partners 2026 (`/en/partners-3`), grouped as on the site

| Tier (h4) | Partners |
| :-- | :-- |
| main | **Puilaetco** (main partner; puilaetco.be) |
| hotel | **The Hoxton** (thehoxton.com, @thehoxtonhotel) |
| logistics | **Embelco** (@embelco.art.shipping) |
| institutions | **Loewe Foundation**; **La Ville de Bruxelles**; **visit.brussels**; **Brussels Capital-Region** (be.brussels); **Wallonia-Brussels International**; **centre Wallonie-Bruxelles** (cwb.fr, @cwb_paris); **Syndicat des Négociants en Art (SNA)** (sna-france.com, @sna_officiel) |
| corporate | **Atelier Coperta** (atelier-coperta.com, @ateliercoperta) |
| exhibition pass | **BPS22** (bps22.be); **Centrale for contemporary arts** (centrale.brussels); **CID Grand-Hornu** (cid-grand-hornu.be); **Keramis** (keramis.be) |
| media (logo + link only) | AMA / Art Media Agency (artmediaagency.com); artpress; Ateliers d'Art (ateliersdart.com); Beaux Arts Magazine; Ceramics Now; COLLECT AAA (collectaaa.be); Dezeen; Éditions Ateliers d'Art de France; L'Eventail; Gazette Drouot; Glean (glean.art); IDEAT (ideat.be); Infoceramica; Le Journal des Arts; La Libre; L'Œil; Le Quotidien de l'Art; La Revue de la Céramique et du Verre; TLmagazine; Villas Decoration; Vormen uit Vuur. (Ceramic Review and Artfairmag logos appear in the logo strip too.) |
| furniture | **Options** (Options.be) |
| apparel | **romarin uniforms** (romarinuniforms.com, @romarin_uniforms, LinkedIn) |
| drinks | **Flora Brussels** (flora.brussels) |

**Partners 2025** (`pasteditions/partners-3`, tiers: main / insurance / logistics / institutions / corporate / programme / media): Puilaetco; PatrimOne Group (insurance); an unnamed logistics partner (logo `Newlogo2020`); visit.brussels, Brussels-Capital Region, Ville de Bruxelles, WBI; Atelier Coperta; Centrale, CID Grand-Hornu, Keramis, French Embassy (logo `01 Logo Croix Simple`); media: AMA, Beaux Arts, Éditions AAF, Villas, Ceramic Review, COLLECT, Dezeen, Glean, Ceramics Now, Eventail, Infoceramica, La Libre, L'Œil, TLmag, Quotidien de l'Art, RCV, Artfairmag, Journal des Arts, Ateliers d'Art.

**Partners 2024** (`pasteditions/partners`, tiers: main partner / insurance partner / fine art logistics partner / with the support of / champagne partner / media partners): Puilaetco; PatrimOne Group; logistics (`Newlogo2020`); visit.brussels, Région Bruxelles-Capitale, Ville de Bruxelles; **Pommery** (champagne); one combined "Media Partners" image.

### 3.3 Press contacts (`/press`)

- Press clips 2026 → `https://online.fliphtml5.com/qogyd/CB26_press_clips/#p=1`
- Benelux public & press relations: **Sophie Carrée PR**, press@sophiecarree.be, sophiecarree.com
- France: **FAVORI**, favoriparis.com
- International: **A R T Communication + Brand Consultancy**, annarosathomae.com, @a_r_t_communication

---

## 4. Facts about the fair

### Editions

| Edition | Dates | Key figures quoted | Focus | Guest of honour | Jury-prize solo show |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 1st — 2024 | 24–28 Jan 2024 (preview Wed 24, public Thu 25 11:00–21:00, Fri–Sun 11:00–19:00) | "4 days \| 12.900 visitors \| 55 galleries \| around 200 artists \| more than 10 countries \| 1 solo show by Johan Creten \| 7 talks \| 100+ press articles" | — | Johan Creten (BE) | — |
| 2nd — 2025 | 22–26 Jan 2025 | "4 days \| 17.840 visitors \| 65 galleries \| 200+ artists \| 1 Norway focus \| 14 countries \| 1 guest of honour solo show: Elizabeth Jaeger (us) \| 1 jury prize 2024 solo show: Damien Fragnon \| a 4-day 13 talks programme \| 200+ press articles" | Norway (with Norwegian Crafts; 5 galleries) | Elizabeth Jaeger (US) | Damien Fragnon |
| 3rd — 2026 | 21–25 Jan 2026 | "5 days \| 19.232 visitors \| 70 exhibitors \| 200+ artists \| 1 focus españa \| 14 countries \| 1 guest of honour solo show: Elmar Trenkwalder (AT) \| 1 jury prize 2025 solo show: Eléonore Chastagner \| a 3-day 14 talks programme \| 230+ press articles" (about page says "70 international galleries, more than 200 artists, 19,200 visitors") | Spain (Spanish Embassy; tribute to Enric Mestre) | Elmar Trenkwalder (AT) | Léonore Chastagner |
| 4th — 2027 | **20–24 Jan 2027**, Tour & Taxis | applications open until 30 Sept | — | Marion Verboom (FR, with Galerie Lelong) | Marie Pic |

Positioning line: "the first international contemporary art fair dedicated to ceramics". Founded January 2024; co-directed by Gilles Parmentier and Jean-Marc Dimanche. Objectives (4 bullets) and scenography text on the about page; 2026 art-prize scenography "Vestiges 2.0" by A S C P studio (open call with MAD Brussels and Action et Service).

### Venue and access

- **Shed 1 & 2bis, Tour & Taxis, 3 Picard street (rue Picard 3), 1000 Brussels.** Entrance: Shed 2bis. Two main halls (A, B) + Hall C (talks, publishers, bar/restaurant, pop-ups).
- Bike parking in front of Maison de la Poste; Villo station at Gare Maritime; Metro lines 2, 6, 51 — 7 min walk from Ribeaucourt; free shuttle from Brussels-North station; car: Parking Park Lane (Picard street 13) or Esplanade Parking via Avenue du Port 86C. Google Maps link `https://goo.gl/maps/KXxSTzu3L6dfdWDD6`. Access-plan image `Cb25 Plandacces Compressed`.

### Opening hours 2026

- Wed 21 Jan: 14:00–17:00 preview (invitation), 17:00–21:00 vernissage (invitation)
- Thu 22 Jan: 11:00–19:00 public; 12:00–13:30 award ceremony; 14:00–19:00 talks
- Fri 23 Jan: 11:00–19:00; talks 12:00–19:00
- Sat 24 Jan: 11:00–19:00
- Sun 25 Jan: 11:00–18:00
- Last entry 30 min before closing (18:30).

### Ticket prices 2026

| Ticket | Price |
| :-- | :-- |
| Single day | 20 € |
| 4-day ticket (22–25 Jan, 1 person) | 38 € |
| Reduction (students <22, job seekers, EU disability card) | 8 € |
| Kids under 12 | free |
| Article 27 (at ticket office only) | 1,25 € |
| Cloakroom | 2 € |
| Press card | free |

Ticketing provider: **Tickoweb** — `https://ceramicbrussels26.tickoweb.be/selection`. Tickets on site, card and cash, non-refundable. No pets (assistance animals only), no bulky bags/backpacks, no smoking, PRM accessible, photos for personal use only. Hotel partner: The Hoxton Brussels.

### Art prize rules

Open to art students / young artists living in Europe, not represented by a gallery, no age limit, less than 10 years of ceramics practice; 10 laureates shown in a group show curated by Jean-Marc Dimanche at the fair entrance (the page text says "five artists", the lists show ten); jury prize = solo show at the next edition.

---

## 5. Things easy to forget

### External documents and embeds
- 2026 catalogue (fliphtml5): `https://online.fliphtml5.com/qogyd/CB26_CATALOGUE/` (also linked with `#p=1`)
- 2026 press clips: `https://online.fliphtml5.com/qogyd/CB26_press_clips/#p=1`
- 2026 overview / "discover the 2026 overview": `https://online.fliphtml5.com/qogyd/ohtg/#p=1`
- 2025 brochure: `https://online.fliphtml5.com/qogyd/tozg/#p=1` and `https://online.fliphtml5.com/qogyd/mbxa/#p=28` (photos page)
- 2025 magazine (AMA / Ceramic Brussels 2025, fr/en/nl): `https://online.fliphtml5.com/qogyd/xffh/`
- 2024 magazine: `https://online.fliphtml5.com/qogyd/ncuf/#p=1`
- Fair map 2026 (PDF): `https://ceramic.brussels/storage/uploads/e62511f3-d0ea-424b-8d81-75c9846132f4/CB26_PLAN_Site-web_A4-3.pdf` (older copy `…/b522b177-3e60-4e3d-bd89-64c96a100226/CB26_PLAN_Site-web_A4.pdf` still linked from the about page)
- Artists list 2026 (PDF screenshot): `https://ceramic.brussels/storage/uploads/2d148ec1-98e0-4d6f-a763-5fce9a589f45/Capture-d’écran-2026-01-15-à-16.09.pdf` (non-ASCII filename)
- Film "visions behind ceramic brussels 2026": `https://youtu.be/IyklMBqj4L4`
- 2025 Norwegian day programme: "Find the Norwegian day programme here" (link target inside `norwegian-focus`)

### Newsletter, social, analytics
- Newsletter: **Mailchimp** landing page `https://mailchi.mp/ceramic/ceramic-brussels` (header "→ newsletter" button, footer nav, contact page). No embedded signup form.
- Instagram `https://www.instagram.com/ceramic.brussels/`; Facebook `https://www.facebook.com/profile.php?id=100094708248221` (contact page only); no LinkedIn/X for the fair itself.
- Google Analytics 4 `G-XVTPYEC66H` via gtag.js — **no cookie banner / consent tool** anywhere on the site.
- General email `info@ceramic.brussels`; press `press@sophiecarree.be`.

### Legal
- **No privacy policy, cookie policy, terms, or legal-notice page exists** (`/en/privacy`, `/privacy-policy`, `/legal`, `/mentions-legales`, `/cookies`, `/terms`, `/gdpr` all 404). Nothing in the footer either — footer/side nav only has contact, press, instagram, newsletter, past editions.

### Metadata
- `<title>` pattern: `Ceramic Brussels - {page title}` (home, exhibitors, press, contact, past editions index all fall back to `Ceramic Brussels - Ceramic Brussels`).
- Home meta description EN: "ceramic brussels, the first international contemporary art fair dedicated to ceramics, takes place from January 21st to 25th 2026 at Tour&Taxis." FR/NL still say 22–26 January 2025.
- Inner pages have empty descriptions (`<p></p>` literally) and og:title = page title; og:image defaults to `icone-ceramicbrussels.png` (260×260 icon cropped to 1200×630).
- Favicons: `/favicon-16x16.png`, `/favicon-32x32.png`, `/apple-touch-icon.png`, `/site.webmanifest`.

### Content quirks worth handling during migration
- Country codes live inside exhibitor names (parentheses); must be parsed out. Inconsistent codes (`gb`/`uk`, `(tr)(de)` vs `(de/lb)`), some exhibitors have none (ANALORA, CHAxARTxRTM, Deletaille Gallery).
- Special accordion rows that are not galleries (tribute, jury-prize solo show).
- Duplicate booth `A18` (Galeri NEV and GALERIST) and Modern Shapes twice in 2025 (B17, B26).
- Many external URLs carry `?fbclid=` / `utm_` junk; several lack a protocol.
- Exhibitor image captions carry artist / title / year / photo credit as one free-text string.
- Keramis exhibition-pass dates and 2024 "Fondation LAccolade" award exist only as prose.
- The 2026 talks programme was never published (dead `programme-69` link); 2024/2025 schedules are full and structured.
- Past-edition pages are English-only in FR/NL.
- Typo in FR/NL contact mailto (`tipahine@`), "Emar Trenkwalder", "Loewe Foudation".
