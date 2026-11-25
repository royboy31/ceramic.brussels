# Newsletters

Mailchimp templates for ceramic brussels, in live HTML text instead of
pictures of text. This folder is not part of the website build.

| File | What |
| :-- | :-- |
| `mailchimp/vip.html` | "VIPs of ceramic", black theme. |
| `mailchimp/monthly.html` | "ceramic brussels monthly" (November edition), white with the yellow header. |
| `mailchimp/galleries.html` | "Participating galleries 2027", white with yellow. |
| `mailchimp/basel.html` | "Destination Basel!", white with ochre. |
| `preview.html` | Shows a template at desktop (660 px) and phone (375 px) width, with sample values in place of the merge fields, images on/off and the font on/off. Shows the first layout of the top photo, as Mailchimp does; `?variant=2` shows the second. |
| `../public/assets/newsletter/wordmark-white.png` | The white logo over the top photo, served from `www.ceramic.brussels/assets/newsletter/` once this branch is deployed. Cut from the footer artwork (`CB27_VIP NEWS_Nov 26_FOOTER.jpg`) with a transparent background. |

## Seeing it

`preview.html` loads the template with `fetch()`, so it needs a local server,
not a double-click. From the repo root:

```sh
python -m http.server 4400 --bind 127.0.0.1
```

then open <http://localhost:4400/newsletters/preview.html> (the VIP one), or
`preview.html?t=mailchimp/monthly.html`, `...galleries.html`, `...basel.html`.

## Sharing a review link

`build-share.mjs` makes one self-contained page (the template at desktop and
phone width, every image and font embedded, sample merge values) for a
review link, from `share-shell.html`:

```sh
node newsletters/build-share.mjs newsletters/mailchimp/vip.html vip-review.html
```

The VIP prototype is shared this way at
<https://claude.ai/artifact/AAT3kMyKRJeJVqzaS7Jsi4> (private until shared
from its Share menu).

## Putting it into Mailchimp

1. **Content → Email templates → Create template → Code your own → Paste in code**,
   paste `vip.html`, save it as "VIP".
2. New email → pick the "VIP" template. Custom-coded templates open in
   Mailchimp's **classic builder**; check the account still offers it.
3. Send a test to Gmail, Outlook and an iPhone before the first real send.

## What Félicie can change in Mailchimp

- **Every text, image and button** is its own editable area (`mc:edit`):
  click it, change it. Images keep their width. Give every new image its
  alt text in the image settings: it is what a guest sees with images off.
- **Rows**: each row has duplicate and hide buttons (`mc:repeatable`,
  `mc:hideable`), so a month with two hotel offers repeats the row and a month
  without the Discovery Tours hides it.
- **Theme** (Design tab): newsletter colour, text, headline, label, button,
  line and highlight colours, and the font sizes. Each newsletter is its own
  template, because their blocks differ; the colours, measured from
  Félicie's images:

  | Template | Colours |
  | :-- | :-- |
  | VIP | `#000000` with white, yellow `#ffee00` banner |
  | Monthly | `#ffffff`, yellow `#ffee00` header, ochre `#c39c27` Basel block, grey `#bfbfbf` buttons |
  | Galleries | `#ffffff`, yellow `#ffee00` banner and button |
  | Basel | `#ffffff`, ochre `#c39c27` |

  The VIP black is `#000000`, not `#121212`: the logo and partner images
  are cut on pure black, and on `#121212` they show as darker boxes.
- **In the text editor**: bold, italic, links, text colour and highlight
  colour are in the toolbar. The prepared styles (`mark` = yellow background,
  `yellow-underline`, `big`, `small`) are classes, set from the editor's
  source view (`<span class="yellow-underline">…</span>`). A button for
  them in the toolbar is not something a pasted template can add - that is
  one of the reasons for a newsletter module in Sanity later.

**Do not touch `*|VIPCODE|*`.** It is the merge field that prints each guest's
own code. The footer's `*|UNSUB|*`, `*|ABOUT_LIST|*` and
`*|LIST:ADDRESSLINE|*` are required by Mailchimp and stay too.

## How it is built

- 660 px wide; two 330 px columns that stack into one on a phone by
  themselves (inline-block "hybrid" columns), with conditional tables for
  Outlook on Windows.
- Colours and sizes in a `<style>` block with Mailchimp's `@editable`
  comments; Mailchimp inlines the CSS at sending.
- Noi Grotesk is loaded from `www.ceramic.brussels/fonts/` (already served
  with `Access-Control-Allow-Origin: *`). Apple Mail and iOS show it; Gmail
  and Outlook show Helvetica / Arial, and Outlook on Windows is forced to
  Arial so it never falls back to Times. No italic file yet: the italic
  lines are the regular weights slanted by the mail app.

## Matching the design

The template follows the image version closely: the logo and the title over
the photo, the yellow banner (white in the middle), the white label bars, the
drop capitals, the oval buttons, the practical-info card with its lines,
the Discovery Tours logo and the dotted offer box.

- **Top photo** has two layouts (`mc:variant`), picked per campaign:
  - *Title over the photo* (the design, default): the photo is a background
    image, so the title stays live text. Changing the photo means pasting
    its new address in the block's source view, in the three places marked
    in the code. Outlook on Windows gets the same photo through VML.
  - *Title under the photo*: the photo is an ordinary image Félicie swaps
    with a click, the title sits under it.
- **Photos** are Félicie's own, cut out of her Mailchimp images with
  Mailchimp's image server (`dim.mcusercontent.com/...?rect=`), credit lines
  included as she had them. The top photo is the same Discovery Tours shot
  without its title, from the site's Sanity library.
- **Credit lines** ("© The Hoxton", "Anastasia Bay, ...") are part of the
  photos, as in her version; the alt text carries them too.

What still differs, by necessity:

- Outlook on Windows: square buttons and ovals, no fade on the banner, drop
  capitals at normal size, Arial throughout.
- Gmail: Helvetica / Arial instead of Noi Grotesk.
- No italic font file yet: the italic lines are slanted by the mail app.

## The other three templates

Built the same way, to the letter of Félicie's campaigns: every text as she
wrote it, her photos cut out of her images (credit lines included), the
same colours, sizes and line breaks as close as live text allows.

Kept as images, as in the originals:

- **Animated GIFs**: the "Participating galleries 2027" title (19 frames:
  the title over changing artworks) and the Basel photos beside the
  "Destination Basel" introduction (7 frames). Their text is in the alt text.
- **The video still** in the monthly (Marion Verboom, with its play button
  and caption), linked to the video.
- **Logos**: the footer logo and dates, and the partner logos.

**Links to fill in.** The original campaigns' links are Mailchimp
click-tracking links tied to the recipient, so they were not followed (that
would have counted clicks in her statistics). Links to ceramic.brussels
pages are set; these are `#` until Félicie sets them in the campaign:

- every template: "Lire en français" and "In het Nederlands lezen" (each
  campaign's own FR/NL version)
- monthly: the video, "learn more about MAD Brussels", "dicover IAC",
  "read more about ceramic basel", "apply → here ←", "discover the
  exhibition"
- galleries: the title GIF
- Basel: the photos GIF, "more on ceramic basel's new website"

**Kept exactly as in the originals, worth a look:**

- Monthly: the button says "dicover IAC" (sic).
- Galleries: the footer is the **ceramic basel** one (15-20 June 2027),
  not the ceramic brussels one, in the original too.
- VIP: the original says "participating galeries"; that one was corrected
  to "galleries" in the template.

## Not checked yet

- Not imported into Mailchimp and not sent to real inboxes: Gmail, Outlook
  (Windows and Mac) and iPhone still need a test send each.
- Whether the Noi Grotesk licence covers use in email.
