/**
 * The VIP frames' own content, so the five tabs render as designed before
 * anything for them exists in Sanity.
 *
 * **This is scaffolding, not the content model.** The VIP hub is new: there
 * is no `page` document for any of its tabs, and the current edition has two
 * VIP events (Preview, Vernissage) where the frame has eight. A tab without a
 * page renders what is here; creating that page in the Studio switches the
 * tab over to Sanity for good (`fromDesign` in `Vip.astro` is the whole of
 * it). When all five tabs are in the Studio, this file, that flag and the
 * fallbacks around it go together.
 *
 * It sits beside the components rather than in `src/lib/`, which is the
 * backend half: this is design scaffolding, and it leaves with the design
 * work (docs/frontend-handbook.md, "What is yours and what is not").
 *
 * Copy and pictures are the frames' (`output.pdf`, VIP frames of 2026-09-18;
 * photographs © Martin Pilette and the venues, in `public/assets/vip/`).
 * **English only, deliberately** - the design has no French or Dutch, and the
 * content model falls back to English rather than showing a translation that
 * is really English pretending, which is the same rule the Studio's page
 * templates follow.
 *
 * Two things the frames themselves leave open, kept verbatim rather than
 * invented, and both flagged where they are used:
 *   - the MAD Brussels afterparty and the three agenda rows repeat another
 *     entry's paragraph, so the frame is still placeholder there;
 *   - no booking URLs are drawn, so "book your visit" writes to the VIP team,
 *     which is the address the contact block gives for exactly that.
 */

/** A picture in `public/assets/vip/`, with the size the file really is. */
export interface VipImage {
  src: string;
  width: number;
  height: number;
  alt: string;
  credit?: string;
}

/**
 * A link the page resolves for itself, so nothing here holds a URL that
 * could drift:
 *   - `tab` - another tab of this hub;
 *   - `hub` - another hub of the site, optionally one of its tabs;
 *   - `partner` - that partner document's own website; the pill is dropped
 *     when the partner has no URL yet (Embelco today);
 *   - `booking` - the VIP team's address, until the venues' own booking
 *     links arrive;
 *   - `email` - the VIP team's address, as the contact block prints it.
 */
export type VipLink =
  | { kind: 'tab'; tab: string; label: string }
  | { kind: 'hub'; route: string; tab?: string; label: string }
  | { kind: 'partner'; partner: string; label: string }
  | { kind: 'booking'; label: string }
  | { kind: 'email'; label?: string };

export interface VipRow {
  /** Small caps line over the paragraph, on the about tab. */
  eyebrow?: string;
  title?: string;
  /** "everyday — 11:00 / 16:00", "thurs. 21 january 2027 — 14:30". */
  when?: string;
  text: string;
  /** A line the frame sets in italics under the paragraph. */
  note?: string;
  links?: VipLink[];
  image?: VipImage;
}

const PHOTO_CREDIT = 'Geoffrey Fritsch, ceramic brussels 2026';

export const VIP_CONTENT = {
  about: {
    intro:
      'Each year, the fair curates an exceptional programme tailored specifically for art professionals and collectors from around the world.',
    hero: {
      src: '/assets/vip/about-hero.webp',
      width: 907,
      height: 605,
      alt: 'Visitors in conversation in front of the ceramic brussels entrance wall.',
      credit: PHOTO_CREDIT,
    } as VipImage,
    /** The paragraph under the code box. "committed institutions and partners" is a link in the frame. */
    note: 'Designed in dialogue with a network of committed institutions and partners, this programme redefines the fair experience. The agenda for this 4th edition features a range of initiatives that foster exchange and connection within the fair, while inviting an insider exploration of Brussels’ vibrant artistic ecosystem—and far beyond.',
    noteLink: { phrase: 'committed institutions and partners', route: 'partners', tab: 'institutions' },
    overview: {
      title: 'programme overview',
      groups: [
        {
          title: 'at the fair',
          rows: [
            {
              eyebrow: 'discovery tours',
              text: 'Explore the galleries’ presentations through the eyes of experts. Thanks to the support of Puilaetco, the main partner of the fair, enjoy complimentary, exclusive thematic guided tours from Thursday to Sunday.',
              links: [
                { kind: 'tab', tab: 'programme', label: 'learn more' },
                { kind: 'partner', partner: 'Puilaetco', label: 'discover Puilaetco' },
              ],
              image: {
                src: '/assets/vip/about-discovery-tours.webp',
                width: 433,
                height: 289,
                alt: 'A Discovery Tours group gathered under the Puilaetco sign.',
              },
            },
            {
              eyebrow: 'vip lounge',
              text: 'A showcase set right at the heart of the fair, designed in collaboration with MAD Brussels. This lounge highlights today’s and tomorrow’s Belgian design talents. Each day, the lounge hosts the VIP Aperitivo—a cocktail gathering built around intimate encounters with artists, curators, and institutional leaders.',
              links: [
                { kind: 'tab', tab: 'lounge', label: 'learn more' },
                { kind: 'partner', partner: 'MAD Brussels', label: 'discover MAD Brussels' },
              ],
              image: {
                src: '/assets/vip/about-lounge.webp',
                width: 433,
                height: 289,
                alt: 'Guests talking on the sofas of the VIP lounge.',
              },
            },
          ] as VipRow[],
        },
        {
          title: 'beyond the fair',
          rows: [
            {
              eyebrow: 'vip programme',
              text: 'Build your tailor-made schedule and gain access to exclusive events strictly reserved for our guests: private tours of personal collections, VIP museum breakfasts, and behind-the-scenes studio visits.',
              links: [{ kind: 'tab', tab: 'programme', label: 'learn more' }],
              image: {
                src: '/assets/vip/about-programme.webp',
                width: 433,
                height: 289,
                alt: 'Guests at a long lunch table during an off-site VIP visit.',
              },
            },
          ] as VipRow[],
        },
      ],
    },
    /** The two columns that close the frame. */
    closing: [
      {
        title: 'The Hoxton: exclusive hotel partner',
        text: 'For our international visitors, the experience begins as soon as you arrive in Brussels. Enjoy preferential rates and exclusive perks at the stylish Hoxton Brussels, the perfect base for your stay.',
        links: [
          { kind: 'tab', tab: 'hotel-deal', label: 'learn more' },
          { kind: 'partner', partner: 'The Hoxton', label: 'discover The Hoxton' },
        ],
      },
      {
        title: 'contact',
        text: 'Have a question or a special request? Our VIP team is at your full disposal for any queries regarding your visit or reservation. Contact us:',
        links: [{ kind: 'email' }],
      },
    ] as VipRow[],
  },

  programme: {
    onSite: {
      title: 'on-site programme',
      rows: [
        {
          title: 'discovery tours by Puilaetco',
          when: 'everyday — 11:00 / 16:00',
          text: 'In partnership with Puilaetco – a Quintet Private Bank, the fair’s main partner, ceramic brussels offers annual Discovery Tours reserved for its VIPs. Free of charge and requiring advance registration, these guided tours through the fair aisles offer an up-close look at the diverse artistic works presented by our exhibitors, accompanied by an expert.',
          note: 'Practical information and registration: November 2026.',
          links: [{ kind: 'partner', partner: 'Puilaetco', label: 'discover Puilaetco' }],
          image: {
            src: '/assets/vip/programme-discovery-tours.webp',
            width: 670,
            height: 447,
            alt: 'A guide leading a Discovery Tour through the fair aisles.',
            credit: PHOTO_CREDIT,
          },
        },
      ] as VipRow[],
    },
    offSite: {
      title: 'off-site programme',
      days: [
        {
          title: 'Wednesday 20 January 2027',
          rows: [
            {
              title: 'KANAL visit',
              when: '10:30',
              text: 'Discover KANAL, a new museum of modern and contemporary art, architecture, and landscape opening in November 2026. It is a meeting place for artists, architects, creators, and the public, set inside the iconic Citroën garage along the canal, just steps from Brussels’ historic city center.',
              links: [{ kind: 'booking', label: 'book your visit' }],
              image: {
                src: '/assets/vip/programme-kanal.webp',
                width: 433,
                height: 289,
                alt: 'The KANAL building, the former Citroën garage, along the canal.',
                credit: 'KANAL',
              },
            },
            {
              title: 'Lunch at Charles Kaisin’s home & private collection tour',
              when: '12:30',
              text: 'Step into the world of Belgian designer and architect Charles Kaisin. Renowned worldwide for his poetic design, modular installations, and famous Surrealist Dinners, he opens the doors to his private home. Guests will enjoy an exclusive lunch surrounded by his extraordinary, eclectic art collection—an intimate immersion into creativity, gastronomy, and art.',
              links: [{ kind: 'booking', label: 'book your visit' }],
              // The one row of the frame whose picture is not in VIP-accets;
              // the fair placeholder pool stands in until it arrives.
              image: undefined,
            },
          ] as VipRow[],
        },
        {
          title: 'Thursday 21 January 2027',
          rows: [
            {
              title: 'Lunch at Galila’s P.O.C & collection tour',
              when: '12:30',
              text: 'Enjoy an exclusive lunch at Galila’s P.O.C. (Passion, Obsession, Collection), a converted 1950s venue turned contemporary cabinet of curiosities. Discover collector Galila Barzilaï-Hollander’s vibrant, playful collection of over 600 thematic artworks.',
              links: [{ kind: 'booking', label: 'book your visit' }],
              image: {
                src: '/assets/vip/programme-galila.webp',
                width: 433,
                height: 289,
                alt: 'Visitors in front of a wall of small collected objects at Galila’s P.O.C.',
                credit: 'Galila’s P.O.C',
              },
            },
          ] as VipRow[],
        },
        {
          title: 'Friday 22 January 2027',
          rows: [
            {
              title: 'Guided tour of Hotel Solvay',
              when: '15:30',
              text: 'Discover Hôtel Solvay, a UNESCO World Heritage site and crowning achievement of Art Nouveau architecture by Victor Horta. Remarkably preserved in its original glory, this iconic residence showcases breathtaking stained glass, luxurious materials, and the refined elegance of fin-de-siècle Brussels.',
              links: [{ kind: 'booking', label: 'book your visit' }],
              image: {
                src: '/assets/vip/programme-hotel-solvay.webp',
                width: 433,
                height: 289,
                alt: 'The stained-glass stairwell of Hôtel Solvay.',
                credit: 'Hotel Solvay',
              },
            },
            {
              title: 'Tour of the Charles Riva Collection',
              when: '16:30',
              text: 'Discover the Charles Riva Collection, an extraordinary private collection of post-war and contemporary art housed within an elegant 19th-century townhouse in the heart of Brussels.',
              links: [{ kind: 'booking', label: 'book your visit' }],
              image: {
                src: '/assets/vip/programme-charles-riva.webp',
                width: 433,
                height: 289,
                alt: 'A painting hung in the Charles Riva Collection.',
                // The frame credits this one "© Hotel Solvay", which is the
                // row above's credit left in place; the collection is credited
                // here instead.
                credit: 'Charles Riva Collection',
              },
            },
          ] as VipRow[],
        },
        {
          title: 'Saturday 23 January 2027',
          rows: [
            {
              title: 'Tour of the Vanhaerents Art Collection',
              when: '15:30',
              text: 'Housed in a former industrial warehouse in Brussels, the Vanhaerents Art Collection showcases groundbreaking, monumental contemporary artworks and immersive installations from world-renowned artists.',
              links: [{ kind: 'booking', label: 'book your visit' }],
              image: {
                src: '/assets/vip/programme-vanhaerents.webp',
                width: 433,
                height: 289,
                alt: 'An immersive installation in the Vanhaerents Art Collection warehouse.',
                credit: 'Vanhaerents Art Collections',
              },
            },
            {
              title: 'MAD Brussels afterparty',
              when: '19:30',
              // The frame repeats the Charles Riva paragraph here: still
              // placeholder in the design, kept word for word rather than
              // written for them.
              text: 'Discover the Charles Riva Collection, an extraordinary private collection of post-war and contemporary art housed within an elegant 19th-century townhouse in the heart of Brussels.',
              links: [{ kind: 'booking', label: 'book the party' }],
              image: {
                src: '/assets/vip/programme-mad-afterparty.webp',
                width: 433,
                height: 289,
                alt: 'The MAD Brussels building.',
                credit: 'MAD Brussels',
              },
            },
          ] as VipRow[],
        },
      ],
    },
  },

  lounge: {
    intro:
      'Located in the heart of hall B, the VIP lounge is an exceptional space exclusively reserved for the fair’s VIP guests. It features a bar as well as welcoming, comfortable areas specially designed to foster connections and conversations.',
    cover: {
      src: '/assets/vip/lounge-cover.webp',
      width: 670,
      height: 447,
      alt: 'The crowd in the VIP lounge during the fair.',
      credit: PHOTO_CREDIT,
    } as VipImage,
    scenography: {
      title: 'scenography by MAD Brussels',
      text: 'The 250 m² hospitality space was entirely conceived and designed by the team at MAD Brussels (Center for Fashion & Design), who carefully curated every element. This unique layout is made possible through the generous support of our logistics partner, Embelco.',
      links: [
        { kind: 'partner', partner: 'MAD Brussels', label: 'discover MAD Brussels' },
        { kind: 'partner', partner: 'Embelco', label: 'discover Embelco' },
      ],
    } as VipRow,
    aperitivos: {
      title: 'VIP aperitivos',
      when: 'everyday — 17:30 → 19:00',
      text: 'End your day with an exclusive gathering featuring intimate discussions on major art market trends, followed by a networking cocktail.',
      image: {
        src: '/assets/vip/lounge-aperitivos.webp',
        width: 670,
        height: 447,
        alt: 'Champagne glasses on a yellow table at the VIP aperitivo.',
        credit: PHOTO_CREDIT,
      },
    } as VipRow,
    agenda: {
      title: 'agenda',
      // All three paragraphs are the aperitivo's in the frame: placeholder
      // there, kept as drawn.
      rows: [
        {
          title: 'meet the speakers & happy hour',
          when: 'everyday — 17:30 → 19:00',
          text: 'End your day with an exclusive gathering featuring intimate discussions on major art market trends, followed by a networking cocktail.',
          links: [{ kind: 'hub', route: 'programme', tab: 'talks', label: 'see the full talks programme' }],
          image: {
            src: '/assets/vip/lounge-speakers.webp',
            width: 432,
            height: 288,
            alt: 'Two guests talking during the happy hour.',
          },
        },
        {
          title: 'meet the guest of honour',
          when: 'thurs. 21 january 2027 — 14:30',
          text: 'End your day with an exclusive gathering featuring intimate discussions on major art market trends, followed by a networking cocktail.',
          links: [{ kind: 'hub', route: 'guest-of-honour', label: 'more on the guest of honour' }],
          image: {
            src: '/assets/vip/lounge-guest-of-honour.webp',
            width: 432,
            height: 288,
            alt: 'The guest of honour in her studio.',
          },
        },
        {
          title: 'meet the art prize laureates',
          when: 'fri. 22 january 2027 — 17:30',
          text: 'End your day with an exclusive gathering featuring intimate discussions on major art market trends, followed by a networking cocktail.',
          links: [{ kind: 'hub', route: 'art-prize', tab: 'laureates', label: 'more on the art prize laureates' }],
          image: {
            src: '/assets/vip/lounge-laureates.webp',
            width: 432,
            height: 288,
            alt: 'Visitors in front of a laureate’s presentation at the fair.',
          },
        },
      ] as VipRow[],
    },
  },

  hotelDeal: {
    intro:
      'For its fourth edition, ceramic brussels is partnering with The Hoxton, ideally located overlooking the Botanical Gardens and close to both the fair and Brussels’ historic city center.',
    cover: {
      src: '/assets/vip/hotel-hoxton.webp',
      width: 670,
      height: 447,
      alt: 'The entrance of The Hoxton Brussels.',
      credit: PHOTO_CREDIT,
    } as VipImage,
    hotel: {
      title: 'The Hoxton',
      text: 'The Hoxton is a design-led hotel and vibrant gathering spot, offering sweeping city views, bold interiors, and two lively dining destinations: Cantina Valentina and Tope.',
      links: [{ kind: 'partner', partner: 'The Hoxton', label: 'discover The Hoxton' }],
    } as VipRow,
    /**
     * `{code}` is filled from the D1 setting `hotel_code` on a Worker render,
     * so the live code never sits in the repo either; the frame's own
     * CERAMIC27 stands in while there is no setting (and under `astro dev`,
     * which has no Worker).
     */
    rate: {
      label: 'special rate',
      heading: '€160/night breakfast included',
      text: 'Use code {code} to enjoy a special rate of €160 per night for single occupancy (excluding city tax), breakfast included, for stays between January 19 and 25, 2027.',
      fallbackCode: 'CERAMIC27',
      link: { kind: 'partner', partner: 'The Hoxton', label: 'book your stay' } as VipLink,
    },
  },
} as const;
