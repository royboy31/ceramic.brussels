# ceramic.brussels — Figma design inventory

Source: Figma file `z9cip6kiRdBEJoLRMzhOiU` ("ceramic brussels"), page `0:1`, desktop frames 1440px wide.
Purpose: seed a Sanity content model. Text below is verbatim from the design (copy as it appears in text layers; line breaks inside a single text layer are flattened to spaces or ` / `). Layer/file names of images are given because they carry photographer credits.

How this was gathered: `get_design_context` for 4:4, 50:2, 58:13, 69:193, 77:339, 119:65, 430:78, 137:430, 137:192, 163:508, 198:81, 242:14, 288:442 (full copy, positions and hrefs). The Figma MCP quota ran out after that, so 32:3, 266:177, 277:283, 388:151, 388:170, 289:671 and 289:767 were read through the Figma web app (layer names = text content, plus canvas screenshots). For those frames the copy is verbatim but exact pixel positions are approximate and rich-text marks (italic/underline/links) are only noted where visible on screen.

Design conventions that matter for content:
- Yellow `#FFF350` is the brand colour. Most pages are white; the three art-prize pages are entirely yellow.
- Every section heading is a 40px semibold word followed by a 1px rule ("heading + line" below).
- Pill = rounded 1px black outline button, lowercase label. "↗" suffix = external link, "→" suffix = internal link.
- Body copy is 24px/30px; intro copy is 40px/50px; page titles are 70px semibold; entity names inside pages are 60px regular over a rule.
- Off-canvas leftovers: many frames contain four text layers at x ≈ -8700px ("about", "ceramic brussels / advisory board / partners / team / press / images", "visitors info", "opening hours / access / food & drinks / floor plan / FAQ"). They are hidden remnants of the menu, not page content. Ignored below.

---

## Global elements

### Header (every frame; group "Header" / "FIXED")
- Background: vertical gradient `#FFF350` → white, 150–159px tall (solid yellow on the art-prize pages).
- Left (x 37, y 48): image **`CB27_LOGO_Dates 1`** (291×75) — the dates mark. Renders as "20~24 jan. 2027" (handwritten-style numerals). This is an image asset, not live text → the fair dates need a separate text/date field in the CMS for meta, hreflang, structured data.
- Centre: **`CB26_LOGO 1`** (144×75, SVG group `Calque_1-2`) — the "ceramic brussels" wordmark, links to home.
- Right (x ≈ 1194, y 63): language switcher text **"EN / FR / NL"** (24px).
- Far right (x ≈ 1352, y 67): hamburger icon `Group 1` (three lines `Line 1`, `Line 2`, `Line 3`, 56×37) — opens the menu overlay.
- Sub-navigation band (y 148–263, white or yellow): page title left (70px semibold, e.g. "art prize") and pill tabs right. Active tab = yellow fill on white pages, black fill/white text on yellow pages. Tab labels per page are listed in each section.

### Footer (group "Footer", present on all inner pages; the homepage and menu frames stop before it)
- Band: same gradient reversed (white → yellow), 80px.
- Left: **"© ceramic brussels, 2026"** (16px).
- Right: three outline pills, 22px lowercase: **"instagram"**, **"newsletter"**, **"linkedin"** (in that order left→right).

### Menu overlay — frame `32:3` "ceramic brussels — MENU" (1440×4066)
The frame is the homepage with the menu open (see homepage variant notes below). The menu itself is group "MENU" inside "FIXED": a yellow panel on the right third of the viewport, a "×" close glyph top-left of the panel (`Group 2`: `Line 5`, `Line 6`), right-aligned items. Full tree (top → bottom), primary items 28–32px, sub-items small grey:

| Primary (text layer) | Sub-items (one text layer, "/"-separated) |
| :-- | :-- |
| **exhibitors** | galleries / country focus / publishers / jury prize 2026 |
| **guest of honour** | — |
| **art prize** | about / laureates / awards / jury |
| **programme** | ceramic brussels x La Cambre / talks / awards / VIP |
| **partners** | — |
| **visitors info** | opening hours / access / food & drinks / floor plan / FAQ |
| **about** | ceramic brussels / advisory board / team / press / images |
| **→ newsletter** | (bottom of panel, own line) |

Rectangles `Rectangle 10/11/12/18/19/20/2/17` are the hover/active backgrounds behind each row.

Discrepancies worth deciding in the CMS: the menu lists "partners" as its own top-level item, while the about page tabs include "partners" too. The exhibitors sub-items are filter presets ("galleries", "country focus", "publishers", "jury prize 2026"), not separate pages. "awards" appears under both art prize and programme.

---

## 1. Homepage — `4:4` "ceramic brussels — homepage" (1440 × ~3720, no footer in frame)

Purpose: landing page. No sub-nav tabs (the 4 yellow buttons act as quick links).

Blocks top → bottom (y in px):

1. **Header** (0–159).
2. **Hero** (159–784): photo `CB26_galeries_@Geoffrey_Fritsch_381 1` (937×625, left, no caption); right column text 70px: **"the first / international / contemporary / art fair dedicated to ceramics"**; link 40px underlined: **"more on the fair →"** (y 582).
3. **Quick-link bar** (y 811): four yellow blocks 329×69, 40px lowercase labels: **"galleries"**, **"art prize"**, **"visitors info"**, **"tickets"** (the last one has a black border — the CTA/ticketing one). Only "galleries" and "art prize" are marked as links in the export; all four are intended as links.
4. **"latest news"** — centred 70px semibold heading (y 912).
5. **News item** (y 1008–1455): kicker uppercase 40px **"guest of honour"**; headline 50px **"French artist Marion Verboom / is the guest of honour / of ceramic brussels 2027."**; link **"discover her work →"** (y 1254); image right `W26423LEvadeHD 1` (670×447, no caption). Only one item shown; the block is a list slot (kicker + headline + link + image per item).
6. **Yellow image banner** (y 1509–1661): full-width 152px strip with image fill (`Rectangle 8`) and 60px uppercase text **"ceramic brussels 2026 in images →"**.
7. **Video block** (`Component 1`, 1440×686, roughly y 1700–2390): full-bleed photo `CB26_foire_@Geoffrey_Fritsch_19` with two variants; variant 1 overlays the yellow placeholder word **"VIDEO"** (128px) — i.e. a video embed slot with poster image. Photo shows the fair hall with the wordmark and "the first international contemporary art fair dedicated to ceramics" on the wall.
8. **Partner spotlight** (y 2462–2909): image left `ideat-benelux-the-hoxton-brussels-9-grande-e1690101266173 1` (671×447; layer `W26423LEvadeHD 2` sits underneath as fallback); kicker uppercase **"partner spotlight"**; text 50px **"The Hoxton joins ceramic brussels as a new partner for 2027."**; link **"discover The Hoxton →"** (y 2705).
9. **Key figures** (y 2963–3485): kicker uppercase **"key 2026 figures"**; ruled grid (three horizontal rules + vertical rules), 120px numbers + 50px labels:
   - **19,200** — **visitors**
   - **70** — **exhibitors**
   - **200+** — **artists**
   - **3,500** — **VIPs**
   - **230+** — **press clips**
10. **Yellow CTA band** (y 3568–3720): solid `#FFF350`, 60px bold uppercase centred **"ceramic brussels 2026 in images →"**.

Homepage variant inside the menu frame `32:3` (same layout, editorial differences):
- Band 6 reads **"gallery applications are open →"** (rendered uppercase) instead of "…in images →". → the yellow band is an editable announcement banner (text + link), possibly with an image.
- Key figures block is a single text layer **"19,200 visitors / 70 exhibitors from 15 countries / 3,500 VIPs"** (with "70 EXHIBITORS" in italic caps on canvas) + link **"more on the fair →"** + a photo on the right (`CB26_galeries…`). → two possible layouts for figures; simplest model is an ordered list of {number, label} plus an optional image and link.

Editorial vs. derived: hero text, "more on the fair" target, the news item (kicker/headline/link/image), the banner, the video, the partner spotlight, and the figures are all editor-picked. Nothing on the home is derived from a list except (potentially) "latest news".

---

## 2. Exhibitors list — `50:2` "ceramic brussels — exhibitors" (1440 × ~2240)

Purpose: gallery/exhibitor index with filters and A–Z navigation.

Sub-nav: none in the title band (title **"exhibitors"** only). Two rows below act as navigation:
- **A–Z index** (y 274, 41.6px lowercase): **"A - B - c - d - e - f - g - h - i - j - k - l - m - n - o - p - q - r - s - t - u - v - w - x - y - Z"** — letter anchors.
- **Filters** (y 347): label **"FILTERS"** (32px uppercase) then outline pills 28px: **"solo show"**, **"focus espana"**, **"publishers"**, **"jury prize 2026"**. (The menu overlay calls the set "galleries / country focus / publishers / jury prize 2026" — "focus espana" is the 2026 value of "country focus".)

Card grid: 3 columns, card = image 433×289 (`W26423LEvadeHD n`, placeholder fair photos, no captions) + name 40px + country code 24px uppercase to the right of the name + optional badge 59×59 at the top-right corner of the image. Two badge assets appear:
- `CB27_Logo solo show_BLACK0` — the **solo show** badge.
- `Plan_V17_OK` / `Calque_2-2` — a ~100×58 ceramic-brussels logo mark (same vectors as the header logo); appears on Al-Tiba9 Gallery and Barrera Baldan Galeria. Most likely the **jury prize 2026** marker — confirm with the designer.

All 12 cards, in reading order:

| # | Name | Country | Badges |
| :-- | :-- | :-- | :-- |
| 1 | AIFA | CH | solo show |
| 2 | Al-Tiba9 Gallery | ES | solo show + logo mark |
| 3 | ANALORA | FR | solo show (card is a link → 58:13) |
| 4 | Anna Laudel | DE | — |
| 5 | arsenic galerie | FR | — |
| 6 | Barrera Baldan Galeria | ES | logo mark |
| 7 | Galerie Bernard Jordan | FR | solo show |
| 8 | Brazil Modernist | FR | — |
| 9 | CHAxARTxRTM | NL | — (card is a link → 69:193) |
| 10 | Deletaille Gallery | BE | solo show |
| 11 | Esther Verhaeghe — art concepts | BE | — |
| 12 | Format Oslo | NO | — |

Per-item fields implied: name, sort key (list is alphabetical ignoring "Galerie " — "Galerie Bernard Jordan" sits under B), country (ISO-2), card image, flags/badges (solo show, jury prize, country focus, publisher), link to detail. Derived automatically: order, letter anchors, filter results.

---

## 3. Exhibitor detail (ANALORA) — `58:13` "ceramic brussels — ANALORA" (1440 × 1276)

Purpose: single gallery page (older of the two detail layouts — no big name heading, no prev/next).

Title band: **"exhibitors"** (no tabs). Solo-show badge (`CB27_Logo solo show_BLACK0 4`, 59×59) at top-right of the content area (x ≈ 1350, y 293).

Blocks:
1. **Image slideshow** (left, x 30, y 277): `CB26_Analora_Fleury_02 1` (433×541); 5 dots (first active) at y 795; counter **"1/3"** (y 823, left); caption right-aligned 16px: **"Frédérique Fleury, *Les Endormies*"** (artist plain, title italic).
2. **Middle column** (x 504):
   - **"Paris (FR)"** (40px, y 363) — city + country.
   - Booth: filled dot glyph (`Ellipse 1`, 18px) + **"B28"** (40px, y 415).
   - Pills (y 485): **"instagram ↗"** → `https://www.instagram.com/analora_by_annelaurepilet/`; **"website ↗"** → `https://galerieanalora.com/`.
   - Description 24px (y 571), two paragraphs: "Founded by Anne-Laure Pilet in 2021 in Lisbon, the gallery is now based in Paris. Contemporary ceramics hold a central place in its programme, while the gallery also showcases artists working in other media (painting, drawing, textile, plaster, etc.)." / "The selection is built around a genuine commitment from both the gallery and the artists. Its ambition is to work hand in hand with artists whose gestures are always meaningful and who push the boundaries of technique."
3. **Right column** (x 978): label **"presenting"** (24px, y 378); artists 40px **"Frédérique Fleury"** (y 412); paragraph (y 571): "Anne-Laure Pilet enjoys presenting both emerging and established artists, with works that can sometimes be monumental. Her talent for discovery has been shaped primarily by her life in China and Portugal — two countries, two cultures, and two distinct approaches to contemporary art."
4. **"BACK TO ALL →"** (40px underlined, centred, y 1046).
5. Footer (y 1196).

Note: the gallery name is not rendered as a heading in this frame (only in the browser title / the list). The CHAxARTxRTM frame adds it.

---

## 4. Exhibitor detail (CHAxARTxRTM) — `69:193` "ceramic brussels — CHAxARTxRTM" (1440 × 1350)

Purpose: same template, newer layout with name heading and prev/next.

Blocks:
1. Rule + **"CHAxARTxRTM"** (60px, x 504, y 296).
2. **"Amsterdam (NL)"** (y 366). Booth: dot + **"A5"** (y 415).
3. Pills (y 485): **"instagram ↗"**, **"website ↗"** (no hrefs set in this frame).
4. Right column: **"presenting"** (y 381) + artists 40px: **"Dong Quanbin, Liu Langqing, Tong Xindi / & Shen Ting, Xin Yaoyao, / Xu Chaoqi and Xu Qun"**; paragraph (y 613): "By recontextualizing tea within contemporary cultural discourse, CHAxART offers a distinctive curatorial approach that bridges artistic practice and cultural heritage. Tea serves as a dynamic medium for fostering meaningful dialogue and exchange, encouraging deeper understanding and integration between Eastern and Western cultural perspectives."
5. Middle column description (y 613), two paragraphs: "Founded in 2021, CHAxART is an intercultural initiative established by overseas Chinese in the Netherlands. It is dedicated to fostering meaningful exchange and integration between Eastern and Western cultures through the dual lenses of tea and contemporary art." / "Positioned at the intersection of traditional tea culture and contemporary artistic practice, CHAxART engages both as powerful instruments for cultural dialogue, critical reflection, and embodied experience. Through a program of exhibitions, curated tea gatherings, and interdisciplinary collaborations across Rotterdam and Amsterdam, CHAxART brings together artists, scholars, designers, and tea practitioners to explore pressing themes such as migration, identity, heritage, and ritual."
6. Slideshow left: image (placeholder `CB26_Analora_Fleury_02 1`, 433×541), 5 dots, counter **"1/6"**, caption **"Tong Xindi & Shen Ting, *Microcosm,* 2024"** (artist, italic title, year).
7. Pagination (y 1206): **"previous"** with left arrow (x 103) and **"next"** with "→" (right). No "BACK TO ALL" here.
8. Footer (y 1270). No solo-show badge.

Per-exhibitor fields (union of both frames): name, city, country, booth number, solo show flag (badge), instagram URL, website URL, "presenting" artists (list or text), description (rich text, several paragraphs), gallery of works with per-image caption {artist, title (italic), year}, prev/next (derived from list order).

---

## 5. Guest of honour — `77:339` "ceramic brussels — guest of honour" (1440 × ~3700)

Sub-nav: **"about"** (yellow, active), **"interview"**.

Blocks:
1. Rule + **"Marion Verboom"** (60px, x 504, y 307); right-aligned **"°1983, France"** (40px, y 303).
2. Portrait left (x 30, y 285): `Vue d'atelier, 2024. Photo © Nicolas Brasseur (10) 1` (433×607). No on-canvas caption but the filename carries a credit → image needs caption/credit fields.
3. Intro 40px (x 504, y 406): "Based in Paris, Verboom's work unfolds through a precise sculptural language informed by architecture, mythology and systems of writing, where forms evolve through layering and recomposition. / A selection of her works will be presented at / the entrance of the fair, in collaboration with Galerie Lelong."
4. **"biography"** heading + rule (y 803), two text columns (y 883):
   - Col 1: "Born in 1983, Marion Verboom lives and works in Paris. She graduated from the École nationale supérieure des Beaux-Arts in Paris in 2009 and continued her training at De Ateliers in Amsterdam between 2009 and 2011." / "Since then, she has developed a distinctive body of work that occupies a singular position within contemporary sculpture, at the intersection of architecture, ornament and the history of forms. Her practice is rooted in a sustained engagement with cultural references across time and geography, as well as in a precise attention to processes of construction and material transformation." / "Her work has been widely presented in institutional contexts in France and internationally, including solo exhibitions at La Verrière – Fondation d'entreprise Hermès in Brussels, Le Voyage à Nantes and the Frac Île-de-France, as well as numerous group exhibitions in major institutions."
   - Col 2: "Alongside these exhibitions, she has developed projects and collaborations that extend her research into different contexts, reflecting the hybrid and evolving nature of her practice. Her work is also held in several public collections, including the Centre national des arts plastiques (CNAP), MAC VAL and the Musée d'Arts de Nantes, attesting to its recognition within contemporary art institutions." / "Through a practice that continuously reactivates historical vocabularies while remaining deeply anchored in the present, Marion Verboom contributes to redefining the place of sculpture today, articulating a language that is both informed and open-ended."
5. **Horizontal image strip** (y 1741, 2052px wide inside 1440 → horizontal scroll/carousel): `W26423LEvadeHD 14` (670×447), `(3) 'Chryséléphantine', La Verrière - Hermès, Bruxelles, Belgique, 2023. Photo © Isabelle Arthuis 1` (670×447), `W26424ExCorporeHD 1` (625×447). Captions at y 2190 (placeholder text repeated twice): **"Tong Xindi & Shen Ting, *Microcosm,* 2024"**.
6. **"sculptural practice"** heading + rule (y 2273), two columns (y 2353):
   - Col 1: "Marion Verboom's work is based on a principle of iteration, assembling fragments into modular structures that can be combined, repeated and reorganised. These compositions operate through the stacking of elements, forming systems that remain open and in transformation." / "Since 2015, she has been developing the ongoing series Achronies, a group of totemic sculptures that revisit the traditional architectural column. Through this series, she reinterprets a canonical form by combining motifs drawn from a wide range of cultural repertoires, from ancient civilisations to modernist vocabularies."
   - Col 2: "Working across a wide variety of materials — including concrete, wood, plaster, bronze, clay and resin — she develops sculptures that unfold through a process combining technical precision and experimentation. The repetition of modules and their variations generate compositions that are both structured and dynamic." / "At the core of her practice lies a constant dialogue between different histories of art and aesthetics. Forms circulate, transform and hybridise, creating connections across time and geography. This approach results in a sculptural language that is both rigorous and open, where references are layered rather than fixed, and where each work becomes a site of construction and interpretation."
7. **Video** (y 3028): poster `apex-detail 1` (907×604) with a white rounded play button, whole image links to `https://youtu.be/IyklMBqj4L4?si=9TNVqjrHp8zelj0p`.
8. (Footer not in frame.)

Editorial: one guest of honour per edition; the "interview" tab is a second page/section not designed yet. Fields: name, birth year + country ("°1983, France"), portrait (+credit), intro, an ordered list of {heading, rich text} sections ("biography", "sculptural practice"), image carousel with captions/credits, video URL + poster.

---

## 6. Art prize — laureates — `119:65` "ceramic brussels — art prize laureates" (1440 × 2954, yellow)

Sub-nav: **"about"**, **"laureates"** (black, active), **"awards"**, **"jury"**.

Three laureates, each: rule + name 60px, "°year / Based in …" 40px, pill **"instagram ↗"**, an image slideshow (433 wide, dots + "n/5" counter + caption), and a two-column bio. Layout alternates (slideshow left / text right, then text left / image right).

1. **Lorie Ballage** (y 307). **"°1994 / Based in Norway"**. instagram → `https://www.instagram.com/lorieballage/`. Slideshow left (component `Lorie Ballage — Slideshow`, see §6b), caption **"Lorie Ballage, *Siphon for Warm Wishes,* 2022-23"**, counter "1/5". Extra text link at (x 978, y 1486): **"@lorieballage ↗"** (instagram handle rendered as text). Bio:
   - "Lorie Ballage's practice emerges from a deep engagement with water—as a transformative element and a metaphor for the fluidity of human experience. She works predominantly with ceramic sculptures, combined with recycled industrial materials, narration, and sound to create environments that blur the line between the familiar and the uncanny."
   - "These multi-sensory spaces aim to invite slowness and reflection, revealing hidden layers of connection. In a world saturated with ceramics—often invisible in their everyday utility—Ballage seeks to unearth the poetic and political potential of failure, absurdity, and disuse. Through this lens, ceramic becomes not just a material for making, but a tool for questioning."
2. **Uriel Caspi** (y 1074, name left). **"°1993 / Based in The Netherlands"**. instagram → `https://www.instagram.com/caspiceramics/`. Image right: `CB26_ArtPrize_UrielCaspi_Organs_Viewinstallation_38x21x35cm_2024_Credits_MilesWarburton 1` (433×541) — filename = work title, dimensions, year, photo credit; on-canvas caption is the Lorie Ballage placeholder, counter "1/5". Bio (one paragraph split across two columns): "From early childhood, ceramic artist Uriel Caspi has been fascinated with clay. He earned a BFA in Ceramics from the Bezalel Academy, Jerusalem (2018), and an MFA from Alfred University, New York (2021). Since gradua/ng, he has exhibited in museums, galleries, and art fairs across the U.S., UK, Europe, Israel, Taiwan, and Japan. Caspi has worked internationally as an academic fellow and artist-in-residence, including the Archie Bray Foundation (Montana), Yingge Ceramics Museum (Taiwan), EKWC (Netherlands), Cercco–HEAD Genève (Switzerland), Höchster Porzellan Manufaktur (Germany), Northern Clay Center (Minnesota), and others. His honors include the Hecht Award for Emerging Artist (2019), the Artis Grant (2023), and the McKnight fellowship (2024). Born in Haifa, Israel, Caspi is currently based in Tilburg, The Netherlands." (note the typo "gradua/ng" in the design)
3. **Danny Cremers** (y 1738). **"°1989 / Based in The Netherlands"**. instagram → `https://www.instagram.com/nicevases/`. Image left: `CB26_ArtPrize_DannyCremers_VASE_01 1` (433×541), placeholder caption, "1/5". Bio: "Danny Cremers is an Amsterdam-based Dutch ceramic artist working with handbuilt porcelain. Trained in fashion design at Central Saint Martins, he explores classical forms through subtle imbalance and imperfection. His vases hold a quiet tension between freedom and control, with textured surfaces and loosely constructed forms." / "Drawn to the energy of the sketch, open-ended, intuitive, and unconcerned with finality, he seeks to capture that same immediacy in each finished piece."

The about page says "5 laureates" — only three are designed; the list is a repeating block.

### 6b. Slideshow component — `430:78` "Lorie Ballage — Slideshow" (433 × 688)
Five variants (`Group 50`…`Group 54`), one per slide: image (aspect 2360/3543, five different files `CB26_ArtPrize_LorieBallage_Siphon-for-warm-wishes-old-version 1…5`), five dots with the active one filled, counter **"1/5" … "5/5"** bottom-left, caption bottom-right **"Lorie Ballage, *Siphon for Warm Wishes,* 2022-23"**. The caption is per-slideshow in the design (same on all five), but each slide should allow its own caption.

---

## 7. Art prize — about — `137:430` "ceramic brussels — art prize about" (1440 × 2340, yellow)

Sub-nav: **"about"** (black, active), **"laureates"**, **"awards"**, **"jury"**.

Blocks:
1. **Hero slideshow** (x 30, y 288): `CB26_artprize_vue_densemble_@Geoffrey_Fritsch_5 1` (907×605); 3 dots; **"1/3"**; caption **"Lorie Ballage, *Siphon for Warm Wishes,* 2022-23"**. Right column intro 40px: "The art prize aims to highlight the vitality and diversity of contemporary ceramic practice while supporting young contemporary creators."
2. **"the prize"** heading + rule (left, y 971): 40px **"5 laureates will be presented in a group show at ceramic brussels 2027."**; 24px: "The selection will be made by an international jury and organized by [Jean-Marc Dimanche](https://ceramic.brussels/en/ceramic-brussels#founders), co-director of the fair. Each artist will showcase a selection of their works." / "The laureates will also benefit from [awards](underlined, internal link) given by institutional partners, such as residencies, exhibitions and monographies."
3. **"applications"** heading + rule (right, y 971): 40px **"The call is open to art students and/or young artists:"**; list 40px: **"→ based in the EU"**, **"→ with less than 10 years' practice & research in the field of ceramics"**, **"→ not represented by a gallery"**; status line 40px **"Applications for 2027 are now closed."**
4. **"partners"** heading + full-width rule (y 1456/1507): 24px: "On the occasion of the art prize, [MAD Brussels](https://mad.brussels/en) (Center for Fashion & Design), [Action et Service](https://www.action-service.be/) (A+S), and ceramic brussels launched an open call for a Brussels-based designer or studio to imagine a new scenography that would highlight the laureates' works with sensitivity and clarity. The studio selected for the third edition of ceramic brussels is [A S C P Studio](https://www.instagram.com/ascp.studio/)." Logos right: `MAD_Logo_Noir 1` (186×62), `Action Service_Logo 1` (75×100), `IMG_E09D310425AC-1 1` (138×42, presumably A S C P Studio).
5. **Three images** (y 1764, 433×289 each): `CB26_artprize_vue_densemble_@Geoffrey_Fritsch_6 1`, `CB26_artprize_vue_densemble_@Martin_Pilette_Prod_2 1`, `CB26_art_prize_awards_ceremony_@Geoffrey_Fritsch_6 1`. No captions (credits in filenames).
6. Footer (y 2153).

---

## 8. Art prize — awards — `137:192` "ceramic brussels — art prize awards" (1440 × 3309, yellow)

Sub-nav: **"about"**, **"laureates"**, **"awards"** (black, active), **"jury"**.

Intro 40px (y 288, full width): "Expanding opportunities for the laureates, the fair's institutional partners also grant a prestigious selection of parallel awards, residencies, and exhibition prizes."

Then a two-column masonry of awards. Each award = heading (semibold 40) + rule + result line (40px, "→ " + laureate name underlined/linked + outcome) + description (24px, 1–2 paragraphs) + optional image (670 wide). In reading order:

| Col | Award (heading) | Result line | Description | Image |
| :-- | :-- | :-- | :-- | :-- |
| L | **jury prize** | → **Marie Pic** will present a solo show during ceramic brussels 2027 | The artist will be given the chance to present his/her/their work in a solo show during the 2027 edition of ceramic brussels. | `CB26_artprize_Marie_Pic_@Geoffrey_Fritsch_6 1` (670×447) |
| R | **Ambassade de France en Belgique** | → **Ninon Hivert** is the laureate of a monograph devoted to her work | The artist benefits from the publication of a monograph on their work, supported by the French Embassy in Brussels and produced in partnership with [Les Éditions des Ateliers d'Art de France](https://www.editionsateliersdart.com/). With this support, the artist has an important tool for presenting and disseminating their work. | — |
| R | **Centre Wallonie-Bruxelles \| Paris** | → **Ninon Hivert** will take part in an exhibition in 2027 in Paris | The Centre Wallonie-Bruxelles \| Paris, also known as Le Vaisseau, is an artistic and cultural Alien-institution — a reference catalyst for French-speaking Belgian contemporary creation and its artistic and cultural ecosystem. Through its resolutely cross-disciplinary programme, deployed both in situ and off-site, the Centre's mission is to disseminate and promote the work of artists established in the Fédération Wallonie-Bruxelles in dialogue with international scenes. It supports both emerging and established practices, and helps stimulate co-productions and international partnerships. / The artist awarded the Centre Prize will benefit from the presentation of one of their works within a group exhibition produced by the Centre in the 2027 season. | — |
| L | **Les Ateliers dans la Forêt** | → **Danny Cremers** will benefit from a 2-month residency | A new artistic residency in France, in the heart of the Orléans forest in the Loiret region. A space for collective creation centred on nature, to research, exchange, change scale and draw inspiration from a large park surrounded by 10 hectares of forest. It's a space for dialogue between different skills (ceramics, painting, cooking, design, writing, etc.). / The artist will benefit from a 2-month research and creation residency in 2026, including (in particular) accommodation on site and payment of transport costs to the place of residency located in the Loiret region, 1h30 from Paris. They will have access to a fully equipped workshop, raw materials, cooking and, if necessary, a vehicle. | — |
| R | **Keramis** | → **Walter Yu** will benefit from a residency in July 2026 | A museum and space for art and creation dedicated to ceramics, Keramis was built on the site of the old Boch faience factory in La Louvière. Its bold, contemporary architecture incorporates an old listed building that contains three giant bottle kilns, the last of their kind in Belgium. / The artist will benefit from a 30-day residency in July 2026 at the Keramis residence. They will receive €2,000 and a budget of €500 for kiln hire (energy costs). They will benefit from a research residency (with no promise of restitution or publication) and will be able to order material from the museum (order, travel expenses and costs of works produced at the artist's expense). | `Capture d'écran 2026-06-15 à 14.02.55 1` (670×446, y 2216) |
| L | **The Latvian Centre for Contemporary Ceramics** | → **Danny Cremers** is the laureate of a 3-week residency in Latvia | The laureate will be awarded a three-week residency in Latvia, developed in partnership with the Daugavpils Mark Rothko Museum. Taking place between April and May (26 April–7 May 2026 or in 2027, to be agreed with the artist), the residency includes accommodation, meals and materials. It will conclude with an exhibition at the Rothko Museum, offering the artist a unique opportunity for international visibility. | — |
| L | **YXCCCA** | → **Marie Pic** and **Ninon Hivert** are the laureates of a 3-month residency | Located in Yixing, the birthplace of Chinese purple clay, the Creative & Cultural Ceramic Avenue (CCCA) is a center dedicated to ceramic creation and the preservation of traditional craftsmanship. In collaboration with the International Academy of Ceramics, it offers artists a space for research and experimentation within a unique cultural heritage. / Two artists are hosted for a 3-month residency in 2026, with free accommodation, studio access, materials, and firings. Each resident receives a grant of 15,000 RMB as well as a one-way flight ticket. A selection of the works produced may be presented or added to the collection of the UCCA Clay Museum. The residency also includes artistic support and opportunities to exchange with ceramic professionals and craftspeople. | — |

Footer (y 3174). Laureate names in result lines are underlined → references to laureate/artist documents. Note the awards reference laureates (Marie Pic, Ninon Hivert, Walter Yu) who are not on the laureates page — awards belong to an edition, laureates too; the model needs an edition/year axis.

The "jury" tab has no frame.

---

## 9. Visitors info — practical info / opening hours — `163:508` "ceramic brussels — opening hours" (1440 × 2634)

Sub-nav: **"practical info"** (yellow, active), **"food & drinks"**, **"floor plan"**, **"FAQ"**. (Menu calls the sub-items "opening hours / access / food & drinks / floor plan / FAQ" — opening hours + access + tickets + hotel deal live on the one "practical info" page.)

Blocks (left column x 30, right column x 740):
1. Left: image `CB26_foire_exterieur_@Martin_Pilette_Prod_3 1` (670×447, y 288). Right: intro 40px **"ceramic brussels' 4th edition / will take place from 20 till 24 January / 2027 at Tour & Taxis, Brussels."**
2. Right **"opening hours"** + rule (y 489); 24px, day in semibold uppercase then times:
   - **WEDNESDAY 20 JANUARY 2026** — 14—17:00 Preview (upon invitation) / 17—21:00 Vernissage (upon invitation)
   - **THURSDAY 21 — SATURDAY 23 JANUARY 2026** — 11—19:00 Public opening
   - **SUNDAY 24 JANUARY 2026** — 11—18:00 Public opening
   (2026 dates while the intro says 2027 — placeholder copy.)
3. Left **"address"** + rule (y 812): **"TOUR & TAXIS — SHEDS 1 & 2BIS"** (semibold uppercase) / "Rue Picard 3 / 1000 Brussels".
4. Right **"access"** + rule (y 846), semibold uppercase labels + regular text:
   - **BY PUBLIC TRANSPORT** — Metro lines 2 and 6, stop Ribeaucourt or Yser (10 min walk) / Bus 14, 20, 46, 86, stop Suzan Daniel
   - **BY TRAIN** — Free shuttle service from Brussels-North station, stop at Tour & Taxis
   - **BY BIKE** — Bike racks in front of Maison de la Poste, rue Picard 1—11 or avenue du Port 86C / Villo! station at the Gare Maritime, rue Picard 7
   - **CAR PARK** — Park Lane, rue Picard 13 / Esplanade Parking, avenue du Port 86C
5. Left **"tickets"** + rule (y 1024):
   - **DAY TICKET** — 20€
   - **4-DAY PASS** — 38€ (valid from 21—24 January 2026)
   - **REDUCTION TICKET** — 8€ (valid for students under 22 years old, job seekers, EU disability card holders)
   - **ARTICLE 27** — 1,25€ (no advance booking possible, purchase at the ticket office upon presentation of the Article 27 voucher)
   - **UNDER 12 YEARS OLD** — Free
   - Black pill button (y 1610): **"book your tickets ↗"**.
   - Right of tickets: image `CB26_foire_exterieur_@Martin_Pilette_Prod_3 2` (804×537, y 1444).
6. Left **"hotel deal"** + rule (y 1716): **"THE HOXTON"** (semibold) + "For its fourth edition, ceramic brussels partners with The Hoxton, ideally located above the Botanical Gardens and within easy reach of the fair and Brussels' historic centre. The Hoxton is a design-led hotel and lively meeting point, offering sweeping city views, bold interiors, and two vibrant food destinations: Cantina Valentina and Tope." Black pill (y 2045): **"discover The hotel ↗"**.
7. Three images (y 2191, 433×289): `…Martin_Pilette_Prod_2 1`, `…Geoffrey_Fritsch_6 1`, `CB26_art_prize_awards_ceremony_@Geoffrey_Fritsch_6 1`.
8. Footer (y 2554).

Structured data implied: opening slots {label/date range, time range, note, public/invitation}, address, access modes {label, text}, ticket types {name, price, condition}, ticket URL, hotel partner (name, text, URL — same partner as partners/hotel and the homepage spotlight → reference a partner document).

---

## 10. Visitors info — food & drinks — `198:81` "ceramic brussels — food & drinks" (1440 × 2763)

Sub-nav: **"practical info"**, **"food & drinks"** (yellow, active), **"floor plan"**, **"FAQ"**.

1. Intro 40px (y 277): "Each year, ceramic brussels develops collaborations with partners committed to the promotion of Belgian and Brussels know-how. These collaborations make it possible to offer unique, high-quality areas for visitors to discover and take a break, in the heart of the fair. In 2026, ceramic brussels collaborated with:"
2. 2×2 grid of vendors. Each: heading semibold 40 **"Name ↗"** (heading is the external link) + rule + image 670×447 with slideshow controls (**"1/3"** + 3 dots `Group 12`) + description 24px.

| Vendor | Description |
| :-- | :-- |
| **Traiteur Benjamin ↗** | Passionate about gastronomy, Benjamin Schijns learned from the best: he began his career at Le Pain et le Vin, a Michelin-starred restaurant in Brussels, and went on to work alongside Xavier Faber (Belgium's best sommelier in 2000), becoming his assistant and Maitre D, before taking up a position as sommelier at the Sea Grill, chef Yves Mattagne's 2-star restaurant. / In 2009, he launched Traiteur Benjamin, whose quality of service inspires confidence. Word of mouth is spreading, and the business grew fast. His wide range of experience, versatility and different hats have won him over as a sommelier, home chef, gourmet caterer and wedding planner. He likes to surprise and delight, and will propose dishes that will awaken all the senses. |
| **Fernand Obb ↗** | Opened in 2018 and located in Brussels, in the heart of Saint-Gilles, Fernand Obb Delicatessen propose a popular cuisine menu made from the best ingredients, in a warm atmosphere and a relaxed mood. The establishment selects carefully its products: everything is prepared in its dedicated production workshop, using ingredients from local and Belgian producers. Fernand Obb was opened in March 2018 and in October of the same year, it won the Brussels' best grey shrimp croquette award, during the contest organised at Comme Chez Soi with the starred chef Pierre Wynants as the head of the jury. |
| **Flora ↗** | Flora is a craft beer project made with flowers, created in 2024 by Maxime and Thibault, driven by a shared vision and the desire to bring something new to the brewing scene. They aim to offer easy-to-drink beers enhanced with a floral touch and without added sugar. A beer that appeals both to enthusiasts, thanks to its accessibility, and to sommeliers and mixologists, thanks to its balance between the bitterness of the beer and the subtlety of the flower. / Much more than just a beer project, Flora aims to support the development and work of local artists and collectives through artistic and musical events, pop-ups, floral installations, DJ sets, live radio, exhibition openings, artist release parties, nightclub events, open-air gatherings, culinary experiences, tastings, and more. |
| **MOK COFFEE ↗** | MOK COFFEE offers a complete coffee experience, from bean to cup, sharing their passion with all coffee lovers. Two locations embody this philosophy: one, rustic and welcoming in Leuven, the other, modern and dynamic in Brussels' Dansaert district. / MOK serves artisanal coffees, filter coffees, espressos, and fermented drinks, alongside a seasonal vegetarian kitchen offering breakfast, lunch, and freshly prepared pastries, all gluten and dairy-free. A selection of brewing equipment and carefully sourced beans completes the experience. |

All four images are the same placeholder (`CB26_artprize_vue_densemble_@Martin_Pilette_Prod_2 1…4`). Footer (y 2683). "floor plan" and "FAQ" tabs have no frames.

---

## 11. Partners — institutions — `242:14` "ceramic brussels — partners institutions" (1440 × 2218)

Title **"partners"**. Sub-nav: **"main partner"**, **"institutions"** (yellow, active), **"hotel"**, **"event partners"**, **"media"**.

1. Full-width rule + section name **"institutions"** (60px, y 325).
2. Two-column grid of partner entries: heading semibold 40 + rule + paragraph 24px + logo image (right-aligned within the column) + pill **"website ↗"** (no hrefs set).

| Col | Partner | Text | Logo |
| :-- | :-- | :-- | :-- |
| L | **LOEWE FOUNDATION** | The LOEWE FOUNDATION was established as a private cultural foundation in 1988 by Enrique Loewe Lynch, a fourth-generation member of LOEWE's founding family. / Today under the direction of his daughter Sheila Loewe, the Foundation's mission is to promote creativity, educational programs and to safeguard heritage in the fields of poetry, dance, photography, art and craft. | `LOGO FOUNDATION EN 1` (237×168) |
| R | **City of Brussels** | *(placeholder — Art Shippers copy)* With 35 years experience of artworks transport, packing, storage installation and insurance of those service nationally as internationally, Art Shippers is at the exclusive service of museums, galleries, auction houses and collectors all over the world. | `BXL_logo_horiz_FILET_FR_NL 2 1` (229×115) |
| L | **visit.brussels** | visit.brussels is the regional organisation contributing to the influence of ceramic brussels and the brussels visibility in general. visit.brussels is an organism of public interest subsidised by the Brussels-Capital Region. | — |
| R | **Brussels-Capital Region** | *(placeholder — same Art Shippers copy)* | — |
| L | **Wallonia-Brussels International** | WBI is the organization responsible for the international relations of Wallonia-Brussels. It is the instrument of the international policy conducted by the [Wallonia], the [Wallonia-Brussels Federation], and the [French Community Commission of the Brussels-Capital Region], federated entities of Belgium. (all three links → `https://www.ceramic.brussels/en/partners-3`) | — |
| R | **Centre Wallonie-Bruxelles Paris** | Far from constituting a mausoleum that would contribute to the canonisation of the pa-ma-trimonial heritage of French-speaking Belgian culture, the Centre, alias the vessel, is a non-prescriptive venue with an experiential vocation, a catalyst of reference for so-called Belgian contemporary creation and the artistic ecosystem in its transversality. | `images 1` (154×135) |
| L | **Syndicat des négociants en art** | The Syndicat des Négociants en Art is the French professional organization representing dealers and galleries active on the secondary market, from archaeology to modern and contemporary art, operating within the French art market. | `logo SNA vectorise carre 1` (305×108) |

Footer (y 2138). "main partner", "event partners", "media" tabs have no frames but are the same list filtered by category.

---

## 12. Partners — hotel — `288:442` "ceramic brussels — partners hotel" (1440 × 1250)

Sub-nav: **"main partner"**, **"institutions"**, **"hotel"** (yellow, active), **"event partners"**, **"media"**.

1. Full-width rule + **"hotel"** (60px, y 327).
2. Left: image `Hox-brussels-new-location-nav 1` (670×447, y 436) with slideshow **"1/3"** + 3 dots.
3. Right: **"The Hoxton"** + rule (y 429); three paragraphs (y 500): "Set just above the Botanical Gardens and a short walk from Brussels' historic centre, The Hoxton offers a vibrant base from which to experience the city during ceramic brussels. Spread across floors 13 to 21, its rooms open onto sweeping views of the Brussels skyline, combining modern comfort with a bold, 70s-inspired design language." / "More than a place to stay, The Hoxton is also a lively meeting point in the city. Guests can discover Cantina Valentina's Peruvian-inspired plates, head up to Tope for rooftop tacos and panoramic views, or step outside to explore the surrounding neighbourhood — from the Botanical Gardens to museums, local bars, shops and cultural spots just around the corner." / "A design-led address with a strong sense of place, The Hoxton brings together comfort, atmosphere and easy access to the city's creative energy." Pill **"website ↗"** (y 1050).
4. Footer (y 1170).

Same partner entry shape as institutions (name, category, text, logo/image(s), website) — the hotel category just has one entry and a bigger image.

---

## 13. Programme — ceramic brussels x La Cambre — `266:177` "ceramic brussels — programme — la cambre" (1440 × 2763)

Title **"programme"**. Sub-nav: **"ceramic brussels x La Cambre"** (yellow, active), **"talks"**, **"awards"**, **"VIP"**.

Only content: intro 40px (x 30, y ≈ 290, ~1150 wide): "La Cambre celebrates its centenary at the heart of ceramic brussels! For this 4th edition, the prestigious Brussels art school takes over the fair with a unique, cross-disciplinary project. From artistic ceramic furniture designed by its alumni to live printing demonstrations with the *Letterrestres* project—reviving 11th-century clay movable type—discover how a new generation of artists is pushing boundaries and reshaping the medium. Pull up a ceramic seat, join the conversation, and explore the future of clay." ("Letterrestres" italic on canvas.)

Rest of the 2763px frame is empty — a rich-text page with room for images. Footer at bottom.

---

## 14. Programme — talks — `277:283` "ceramic brussels — programme — talks" (1440 × 1022, auto-layout "Hug") + `388:151` "21 JAN" + `388:170` "22 JAN"

Sub-nav: **"ceramic brussels x La Cambre"**, **"talks"** (yellow, active), **"awards"**, **"VIP"**.

1. Intro 40px: "Open to the public for four days in 2026, the fair featured around fifteen talks and conferences, including several book launches, roundtables, and artist talks."
2. **Accordion by day** (`Frame 6`): three rows, each a rule + day label 40px + "↓" arrow at right. Rows are instances of the day components: `21 JAN` → **"Thursday 21 January"**, `22 JAN` → **"Friday 22 January"**, second `22 JAN` instance with text override → **"Saturday 23 January"**. The frame is auto-layout so opening a day pushes the footer down.
3. Footer.

### Day component `388:151` "21 JAN" (1420 wide, 2 variants: `21 JAN — default` collapsed, `21 JAN — open`)
Open state: rule + **"Thursday 21 January"** with "↑" arrow, then events (`Frame 4`, gap 240 → visually ~20px rows). Each event: category in braces (semibold 24px) left + time (semibold 24px) right over a thin rule, title (24px), optional language/speakers line (14px), and a photo (`2026-01-22- Martin Pilette Prod - CÇramic Brussels- RS - 77 n`, ~180×110) alternating right/left of the text.

| Time | Category | Title | Language / speakers | Photo side |
| :-- | :-- | :-- | :-- | :-- |
| 14:00 | { Artist Talk } | Exclusive interview of Elmar Trenkwalder, guest of honour 2026 | — | right |
| 15:00 | { Roundtable } | Exposer la céramique dans les institutions | FR / with Christine Germain-Donnat (French Ministry of Culture), Bertrand Mazeirat (Musée Ariana, CH), Ludovic Recchia (Keramis, BE) & Jean-Charles Hameau (Musée national Adrien Dubouché, FR) | left |
| 16:00 | { Roundtable } | Yixing CCCA Residency: artists' insights & feedback | EN / Jacques Kaufmann (International Academy of Ceramics), Béatrice Guilleman & Asya Marakulina (Artists) | right |
| 17:00 | { Roundtable } | Revue Pot-Pourri : Quelle place dans le paysage éditorial pour une nouvelle revue céramique ? | FR / with Pierre Naquin (Art Media Agency, FR), Graziella Semerciyan & Benjamin Dosgheas (Pot-Pourri, FR) | left |

### Day component `388:170` "22 JAN" (1420 × 1388, 2 variants)
Open state: **"Friday 22 January"** ↑, then:

| Time | Category | Title | Language / speakers | Photo side |
| :-- | :-- | :-- | :-- | :-- |
| 11:30 | { Artist Talk } | *Thinking Hands*: Ways of Teaching Ceramics Today (title part italic) | EN / with Magdalena Gerber (CERCCO — HEAD Geneva, CH), Geertje Jacobs (EKWC — European Ceramic Workcentre, NL), Caroline Andrin (Artist, ENSAV La Cambre, BE) & Neil Brownsword (Artist, Staffordshire University, UK) | right |
| 12:30 | { Artist Talk } | arnoldsche Art Publishers presents books & ceramics by 4 artists | EN / with Dirk Allgaier (arnoldsche Art Publishers, DE), Shozo Michikawa, Irene Nordli, Ute Kathrin Beck & Philsoo Heo (Artists) | left |
| 13:30 | { Artist Talk } | In Conversation with Artist Julia Isídrez | ES, FR / with María Inés Rodríguez (Walter Leblanc Foundation, BE) | right |

No location line is shown on any event. Photos have no captions. Per-event fields: date (day), start time, category ("Artist Talk", "Roundtable" — the braces are decoration), title (rich text for italics), languages (EN/FR/ES…), speakers text (or structured speakers with affiliation), image. The "awards" and "VIP" programme tabs have no frames.

---

## 15. About — ceramic brussels — `289:671` "ceramic brussels —about — ceramic brussels" (1440 × 2207)

Title **"about"**. Sub-nav: **"ceramic brussels"** (yellow, active), **"advisory board"**, **"team"**, **"partners"**, **"press"**, **"images"**.

1. Intro 40px: **"ceramic brussels is the first international contemporary art fair dedicated to ceramics."**
2. Left (≈907 wide): hero photo `CB26_foire_@Martin_Pilette_Prod_79 1` with 3 slideshow dots (`Group 16`) and no caption. Right column: **"the fair"** + rule + 24px: "ceramic brussels develops an international marketplace and exchange platform while offering the encounter of curated content within a unique experience. Founded in January 2024, ceramic brussels is a committed fair, firmly focused on promoting contemporary ceramics and built around an intense programme of visits, exhibitions, and talks."
3. Two columns:
   - **"goals"** + rule: "ceramic brussels aims to showcase the vitality and diversity of contemporary ceramics practice, support contemporary creation and stimulate new exchanges between artists, institutions, galleries and the audience. Its aims are:" then bullet lines prefixed "↘": "↘ to showcase the diversity of artistic approaches to ceramics through the selection of international galleries and the involvement of leading global institutions and key players" / "↘ to offer a unique forum for high-level exchanges, networking, and induce interactions and collaborations" / "↘ to deliver the ceramic brussels art prize, a European call for projects with an international jury, and several additional prizes to be awarded during the fair" / "↘ to support the production and dissemination of content dedicated to ceramics"
   - **"development"** + rule: "Since its first edition, the fair has chosen to invite an artist of honour and to highlight their work through a series of initiatives throughout the fair, including entrance exhibitions, talks, and exclusive encounters. In 2026, the artist Elmar Trenkwalder was the guest of honour, following American artist Elizabeth Jaeger (guest of honour 2025) and Belgian artist Johan Creten (guest of honour 2024). From its second edition onwards, ceramic brussels broadened its scope by integrating modern ceramics, strengthening institutional participation, and reinforcing its international dimension, notably through the introduction of a country focus (Norway 2025, Spain 2026)."
4. Three images (433×289): `CB26_artprize_vue_densemble_@Martin_Pilette_Prod_2 1`, `CB26_art_prize_awards_ceremony_@Geoffrey_Fritsch_6 1`, `CB26_artprize_vue_densemble_@Geoffrey_Fritsch_6 1`.
5. Footer.

---

## 16. About — advisory board — `289:767` "ceramic brussels —about — ceramic brussels" (2nd frame, 1440 × 3437)

Sub-nav: **"advisory board"** (yellow, active), others as above.

Intro 40px: **"The fair has the support of renowned international experts in the field of ceramics as its advisory board:"**

Two-column grid of six members (rows: Christine Germain-Donnat | Florence Reckinger Taddeï; Ludovic Recchia | Geertje Jacobs; Magdalena Gerber | Henri Jobbé-Duval). Each: name (semibold 40) + rule; portrait left (~130×170, filename carries credit); role (bold italic 14px) and bio (14px) right; pills **"instagram ↗"** and **"website ↗"** under the bio (5 of each in the frame, so not every member has both).

| Member | Role (bold italic line) | Portrait file | Bio |
| :-- | :-- | :-- | :-- |
| **Christine Germain-Donnat** | Patrimony Curator / Ministère de la Culture de France | `Christine_19_HD 1` | Trained as a historian and art historian, her joyful erudition takes her to the history of clothing — to ceramics — or to contemporary creation, which she readily invites as a counterpoint to surprise the visitor's eye and take it where it wouldn't go! At the Musée de la Chasse et de la Nature in Paris, which she has been directing since 2019, Christine Germain-Donnat played a decisive role in steering a vast renovation project that led to the museum's reopening in 2021, as well as a major overhaul of its collections. Christine Germain-Donnat has previously worked at the Palais des Beaux-Arts in Lille, the Musée des Beaux-Arts in Rouen, led the redeployment of the Musée des Arts Décoratifs et de la Mode to the Château Borély in Marseille, and directed the Musée National de la Céramique (Département du Patrimoine et des Collections) at Sèvres-Cité de la Céramique. |
| **Florence Reckinger Taddeï** | President of Les Amis des Musées d'art et d'histoire Luxembourg | `Florence Reckinger Taddei_portrait 1_copyright_Veronique Kolber 1` | Driven by a profound passion for the arts, she transitioned from a legal career in Luxembourg to dedicating herself entirely to cultural patronage, exhibitions, and art publishing. In 2019, she founded the Regala gallery and residency program in Arles, notably showcasing Christian Lacroix's first ceramics and publishing the Cahiers Regala monographs. A key figure in the cultural ecosystem, she serves as President of les Amis des Musées du Luxembourg and Lët'z Arles, which she created alongside the Luxembourg Photography Award. Her leadership extends to the boards of Mudam, the Edward Steichen Award, Les Rencontres d'Arles, and the ENSP. Blending culture with philanthropy, she also spent 20 years chairing the Luxembourg Red Cross Ball, incorporating charity auctions and master craftspeople, an engagement that mirrors her role as a Homo Faber ambassador. |
| **Ludovic Recchia** | Art historian and curator specialising in modern and contemporary ceramics, Director of Keramis | `LR2©OdessaMalchai-Keramis 1` | Ludovic Recchia is an art historian curator specialising in modern and contemporary ceramics. Curator of the European decorative arts collections at the Royal Museum of Mariemont from 2003 to 2022, he is presently director and curator of Keramis Museum and Art Center (FWB), an institution that he founded in 2015. Since 2016, he has been a membre of the International Academy of Ceramics. As part of exhibition offices, he publishes lots of books dedicated to contemporary ceramists including Marc Alberghina (2023), Daniel Pontoreau (2022), Charlotte Coquen (2017) Antoine de Vinck (2015), Frank Steyaert (2016), Marc Feulien (2006), Emile Desmedt (2005) and Johan Creten (2007). |
| **Geertje Jacobs** | Director of the EKWC international artist-in-residence and centre-of-excellence for ceramics | `Photo (Geertje J.) 1` | Geertje Jacobs is Director of the European Ceramics Centre (EKWC) in the Netherlands, an international artists' residency and a centre of excellence for ceramics. For 50 years now, artists, designers and architects from all over the world have been working there to experiment with clay. The EKWC is the combination of world-class facilities, the presence of consultants with internationally leading technical knowledge and the openness to freely share recipes, processes and innovation. Geertje Jacobs studied art history in Utrecht and Florence and has worked in the museum sector for over 15 years (notably at the Rijksmuseum in Amsterdam, the Textile Museum in Tilburg and the National Glassmuseum in Leerdam). |
| **Magdalena Gerber** | Artist, Professor and Head of CERCCO, HEAD-Geneva | `Magdalena_Gerber_2023_©Fondation_Bruckner_1- 29_recadr 1` | Magdalena Gerber is an artist based in Geneva. Her artistic research evolves between the fields of art and design. Alongside her sculptural projects in the studio, her work explores changes in the industrial manufacture of porcelain in Switzerland. Since 2013, she has been the director of CERCCO, the Centre for Contemporary Ceramics at HEAD - Geneva, where she works as a lecturer in art and design. She holds a BA in Ceramic Sculpture and an MAS in Art \| Design and Innovation from the University of Art and Design Basel. |
| **Henri Jobbé-Duval** | Commandeur des Arts et Lettres ; Co-founder of the Fiac, Chairman of Source Garouste Hermine | `PHOTO HENRI 1` | Trained in law, he began his career by opening a contemporary art gallery in Rennes, where he championed major avant-garde artists such as Soulages, Hartung, and Bram van Velde. A pioneering force in the art market, he helped set up the FIAC organizing committee before running both the Beaubourg 2 and Travers galleries. As director of communications and partnerships at OIP, he played a decisive role in developing the FIAC, the Salon du Livre, and the Salon Nautique. Expanding his cultural impact, he founded HJD & Cie, curated major summer exhibitions in La Rochelle, and contributed to the creation of Art Paris Abu Dhabi. He also supported Ateliers d'art de France in launching the first Biennale des Métiers d'art at the Grand Palais, and remains deeply involved in social and cultural initiatives like La Corderie Royale and La Source Hermine. |

Footer. The "team", "press", "images" tabs have no frames; "team" will most likely reuse this person-card grid.

---

## Editorial vs. derived — summary

| Editor picks (needs a singleton/settings doc) | Derived from lists |
| :-- | :-- |
| Homepage hero text + link, news item(s), announcement banner text/link/image, video, partner spotlight, key figures | Exhibitor grid order, A–Z anchors, filters, prev/next on exhibitor detail |
| Guest of honour (one per edition) | Laureates list, awards list (per edition) |
| Opening hours / tickets / access / hotel deal copy | Partners per category tab, food & drinks vendors, programme events grouped by day, advisory board members |
| Intro paragraphs at the top of every section page | Menu tree (could be static in code — labels match `STRINGS`) |

---

## Implied content model

Localisation: every text field below is trilingual (EN/FR/NL). Image fields need `alt`, and where the design shows a caption, `caption` (artist / italic title / year) and `credit` (photographer — appears in filenames like "Photo © Nicolas Brasseur").

### Document types

**`exhibitor`** (frames 50:2, 58:13, 69:193)
- `name` (string), `sortName` (string — "Bernard Jordan" for "Galerie Bernard Jordan"), `slug`
- `city` (string), `country` (ISO-2 code; rendered "FR" on cards and "Paris (FR)" on detail)
- `booth` (string, "B28", "A5")
- `flags`: `soloShow` (bool → badge), `juryPrize` (bool or reference to an award), `countryFocus` (bool / string), `publisher` (bool) — the filter pills
- `instagram` (url), `website` (url)
- `artists` (array of strings or references → "presenting")
- `description` (portable text, 2–4 paragraphs)
- `cardImage` (image), `gallery` (array of image + caption{artist, title, year})
- `edition` (reference/year)

**`artist`** (optional — the exhibitor "presenting" list and the laureate names could be references; guest-of-honour and laureates share fields)
- `name`, `birthYear` ("°1983"), `country`/`basedIn` ("Based in Norway"), `instagram`, `website`, `bio` (portable text), `portrait`, `works` (images with captions)

**`guestOfHonour`** (77:339) — or `artist` + role
- `artist` ref or inline: `name`, `birthYear`, `country`, `portrait` (+credit)
- `intro` (portable text, 40px lead), `sections` (array of {heading, body}: "biography", "sculptural practice")
- `carousel` (images with captions), `video` {url, poster}
- `interview` (second tab — undefined, probably portable text)
- `edition`

**`laureate`** (119:65, 430:78)
- `artist` fields (name, birthYear, basedIn, instagram), `bio` (portable text, two columns), `slideshow` (images + caption per slide), `edition`, `order`

**`award`** (137:192)
- `title` ("jury prize", "Keramis", …), `partner` (reference to `partner` or string), `laureates` (array of references → underlined names), `resultText` (string with the laureate name(s) marked up: "→ Marie Pic will present a solo show during ceramic brussels 2027"), `description` (portable text with links), `image` (optional), `edition`, `order`

**`artPrizeSettings`** / page (137:430)
- `intro`, `prizeText` (40px + 24px portable text), `applications` {lead, criteria[] , statusLine}, `partnersText` (portable text with links), `partnerLogos[]`, `heroSlideshow`, `gallery[]`, `jury` (tab, undefined — probably `person[]`)

**`partner`** (242:14, 288:442, homepage spotlight, visitors hotel deal)
- `name`, `category` (enum: main partner / institutions / hotel / event partners / media — the tabs), `description` (portable text, can include links), `logo` (image), `images` (slideshow, hotel), `website` (url), `order`

**`foodVendor`** (198:81) — or `partner` with category "food & drinks"
- `name`, `url` (heading is the link), `description` (portable text), `images` (slideshow "1/3")

**`event`** (277:283, 388:151, 388:170)
- `date` (date → grouped into "Thursday 21 January" accordion), `startTime`, `category` (enum: Artist Talk, Roundtable, … rendered "{ … }"), `title` (portable text for italics), `languages` (array: EN/FR/ES), `speakers` (string or array of {name, affiliation}), `image`, `programmeSection` (talks / awards / VIP), `edition`

**`programmePage`** (266:177) — "ceramic brussels x La Cambre": `title`, `intro` (portable text), `body` (portable text/images). The four programme tabs behave like sub-pages of one section.

**`person`** (289:767; also "team")
- `name`, `role` (bold italic line), `portrait` (+credit), `bio` (portable text), `instagram`, `website`, `group` (advisory board / team), `order`

**`page`** (generic, already exists — used for about "ceramic brussels", press, images, FAQ, floor plan): `title`, `intro` (lead paragraph), `sections[]` {heading, body, images}, `imageRow[]`, tab membership (`parentSection` + `order`) so the pill sub-nav can be generated.

**`visitorInfo`** singleton (163:508)
- `intro` (portable text), `heroImage`, `openingHours[]` {label ("WEDNESDAY 20 JANUARY 2026"), slots[] {time, label ("Preview (upon invitation)")}}, `venue` {name ("Tour & Taxis — sheds 1 & 2bis"), street, postcode/city}, `access[]` {mode, text}, `tickets[]` {name, price, condition}, `ticketUrl` ("book your tickets ↗"), `hotelDeal` {partner ref, text, url}, `imageRow[]`

**`homepage`** singleton (4:4, 32:3)
- `heroImage`, `heroText`, `heroLink` {label, target}
- `quickLinks[]` {label, target} (4 yellow buttons; "tickets" styled as CTA)
- `news[]` {kicker, headline, link label, target, image} (or references to `news` documents)
- `banner` {text, target, image?} ("ceramic brussels 2026 in images →" / "gallery applications are open →")
- `video` {url, poster}
- `spotlight` {kicker, text, link label, target/partner ref, image}
- `figures` {kicker, items[] {number, label}, image?, link?}
- `bottomBanner` {text, target}

**`siteSettings`** singleton (header/footer/menu)
- `editionDates` (text + start/end dates — the header dates mark is an image `CB27_LOGO_Dates` and should also exist as data), `datesImage`, `logo`
- `social` {instagram, linkedin, newsletterUrl}
- `copyright` ("© ceramic brussels, 2026")
- `menu[]` {label, target, children[] {label, target}} — or keep static in `STRINGS`; the tree is in the Menu overlay section above.

**`edition`** (implied everywhere by "2026"/"2027" and "key 2026 figures"): `year`, `dates`, `venue`, `countryFocus` ("Spain 2026"), used to scope exhibitors, laureates, awards, events, guest of honour.

### Reusable objects
- `imageWithCaption` {image, alt, caption {artist, title(italic), year}, credit}
- `slideshow` {slides[] imageWithCaption} — used on exhibitor detail (1/3, 1/6), laureates (1/5), art prize hero (1/3), food & drinks (1/3), hotel (1/3), about hero
- `pillLink` {label, url, external(bool → "↗" vs "→")}
- `sectionWithRule` {heading, body} — every "heading + line" block
- `imageRow` — three 433×289 images used as a section closer on art prize about, visitors info, about

### Open questions for the designer
1. What is the second badge (logo mark) on Al-Tiba9 Gallery / Barrera Baldan Galeria — jury prize 2026 or country focus?
2. Exhibitor detail: keep the name heading + prev/next (CHAxARTxRTM) or "BACK TO ALL" (ANALORA)? Both should be supported by the same data.
3. Are "about → partners" and the top-level "partners" the same page?
4. "jury" (art prize), "floor plan", "FAQ", "awards"/"VIP" (programme), "team", "press", "images", "main partner", "event partners", "media", guest-of-honour "interview" — no frames yet.
5. Opening hours show 2026 dates under a 2027 intro; captions on several images are placeholders ("Lorie Ballage, Siphon for Warm Wishes" on Uriel Caspi's / Marion Verboom's images; Art Shippers text under City of Brussels and Brussels-Capital Region).
