# Newsletter module (Studio → Mailchimp)

Roy, 2026-11-25: "start working on newsletter cms in Sanity. Lilanga, you do
the designs and all the templates that you already received. You create one
template for each, and Kamindu, you can do the technical setup."

Plan sent to Roy the same day: stage 1 the VIP template in Mailchimp
(Lilanga, `newsletter-vip`), stage 2 this module (about two weeks), stage 3
fixes after Félicie tries it, stage 4 scheduling and stats if needed.

## How it fits together

| Piece | File | Owner |
| :-- | :-- | :-- |
| Themes: colours, sizes, footer per template | `src/newsletter/themes.ts` | Lilanga (values), Kamindu (shape) |
| Renderer: a newsletter document → email HTML | `src/newsletter/render.ts` | Lilanga (markup of each block), Kamindu (plumbing) |
| Studio document and its blocks | `src/sanity/schemaTypes/documents/newsletter.tsx` | Kamindu |
| "Preview & send" tab | `src/sanity/components/NewsletterPane.tsx` | Kamindu |
| Mailchimp API (Worker) | `src/server/routes/newsletter-mailchimp.ts` | Kamindu |
| White logo over the top photo | `public/assets/newsletter/wordmark-white.png` | Lilanga (from `newsletter-vip`) |

`render.ts` has no imports from Astro, Sanity or the DOM. The Studio runs
it in the browser for the preview, and the HTML it produces there is
exactly what a test or a send posts to Mailchimp: there is no second
renderer that could disagree.

## The content model

A newsletter is one campaign in one language: **Template** (the theme),
**Subject line**, **Preview text**, the other languages' web versions (they
become the "Lire en français" / "In het Nederlands lezen" buttons), the
footer (ceramic brussels or ceramic basel), and **Sections**:

- **Title band**: the big title on the header colour (monthly, Basel).
- **Yellow banner**: "our new website is live! →".
- **Top photo with title**: title over the photo with the logo (a
  background image, VML for Outlook), or title under it.
- **Row**: one or two columns; a column is a stack of **label bar**,
  **subtitle**, **headline**, **text**, **button** (oval or outlined),
  **image**, **info card**, **list with lines**, **offer box (dotted)**,
  **VIP code** (`*|VIPCODE|*`), **key figures**. Background: none,
  yellow, ochre or the header colour.
- **Line** between rows, **Partner logos** (two per line).

Every section can be hidden. The text editor offers the styles as fixed
choices: large, small, italic paragraph, drop capital; bold, italic,
**yellow background**, **yellow underline**; **text colour** (yellow, ochre,
grey) and **text size** (12/18/24/32/40), plus links. A theme decides what
each one looks like, so restyling never touches content.

## Sending

The **Preview & send** tab shows the email at desktop (700 px) or phone
(375 px) width. Under it:

1. **Connect to Mailchimp** lists the audiences and their saved segments.
2. **Send a test** to up to five addresses (creates or updates the
   campaign; a newsletter keeps one campaign until it is sent).
3. **Prepare** needs the changes published; it builds the campaign and
   answers with Mailchimp's recipient count and send checklist.
4. **Send to N people…** asks once more with that number. The server
   refuses if the count changed in between.

Every test, prepare and send is written to the document's Mailchimp
history with the person's name. Only **Sanity administrators** of the
project can use it (the same check as the VIP guest list,
`src/server/sanityIdentity.ts`); Félicie needs that role.

## Still to do

- **The `MAILCHIMP_API_KEY` Pages secret** (production, and preview for
  testing). Ask for a fresh, dedicated key: the old one has sat in the
  WhatsApp group since 23 Sept. Until it is set the pane says "Mailchimp
  is not connected yet".
- **Lilanga**: match each block's markup in `render.ts` to the four
  templates (spacing, the monthly and Basel headers, the galleries title
  GIF, the video still), and check the themes' values.
- Start each template as a ready-made newsletter (duplicate to begin a new
  month), from Lilanga's four campaigns.
- Test sends to Gmail, Outlook (Windows and Mac) and iPhone.
- The footer's ceramic basel logo and dates (text for now).
- Noi Grotesk licence for email (Léo), and the italic files.
- Like all content here, a saved newsletter is readable through the public
  API before it is sent.
