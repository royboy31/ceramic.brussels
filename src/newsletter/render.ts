/**
 * A newsletter document from the Studio, as the HTML email Mailchimp sends.
 *
 * Pure TypeScript with no imports from Astro, Sanity or the DOM: the Studio
 * preview runs it in the browser and the sending route in the Worker, so the
 * two can never disagree. Everything visual is Lilanga's templates
 * (newsletters/mailchimp/*.html on `newsletter-vip`): the 660 px sheet, the
 * two 330 px "hybrid" columns that stack on a phone with no media query, the
 * ghost tables for Outlook on Windows, Noi Grotesk with Helvetica/Arial
 * behind it. What changed is where the content comes from - Sanity blocks
 * instead of mc:edit regions - so the markup of each block lives in one
 * function below and can be restyled there without touching content.
 *
 * Shape of a newsletter: see src/sanity/schemaTypes/documents/newsletter.ts.
 * A section is a full-width band (header, banner, photo, rule, partners) or
 * a row of one or two columns; a column is a stack of items (label,
 * subtitle, text, button, image, info card, list, offer box, VIP code,
 * figures).
 */
import { TEXT_COLOURS, themeOf, type Theme } from './themes';

export interface RenderOptions {
  projectId: string;
  dataset: string;
  /** Where the site lives; links to the fair and the font files use it. */
  siteUrl?: string;
}

type Any = Record<string, any>;

const SHEET = 660;
const COL = 330;
const PAD = 12;
const FONT = "'Noi Grotesk',Helvetica,Arial,sans-serif";

/* ------------------------------------------------------------------ text */

export const esc = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Plain text with its line breaks kept: labels and buttons span lines. */
const lines = (s: unknown) => esc(s).replace(/\r?\n/g, '<br>');

/**
 * Only http(s), mailto and Mailchimp merge tags (*|UNSUB|*) make a link;
 * anything else (javascript:, a typo) renders as plain text.
 */
export function safeUrl(url: unknown): string | null {
  const u = String(url ?? '').trim();
  if (/^(https?:\/\/|mailto:)/i.test(u) || /^\*\|[A-Z0-9_:]+\|\*$/.test(u)) return u;
  return null;
}

/* ---------------------------------------------------------------- images */

/**
 * A Sanity CDN address for an image at `width` CSS pixels, twice that for
 * sharp phones. Mail apps cannot negotiate formats, so `auto=format` is out:
 * JPEG for photos, PNG kept as PNG (logos with transparency), and a GIF is
 * sent untouched - resizing it on the CDN would drop its animation.
 */
export function imageUrl(image: Any | undefined, width: number, o: RenderOptions, aspect?: number): string | null {
  const ref: string | undefined = image?.asset?._ref ?? image?.asset?._id;
  const m = ref?.match(/^image-([a-f0-9]+)-(\d+)x(\d+)-(\w+)$/);
  if (!m) return null;
  const [, id, w0, h0, ext] = m;
  const base = `https://cdn.sanity.io/images/${o.projectId}/${o.dataset}/${id}-${w0}x${h0}.${ext}`;
  if (ext === 'gif') return base;
  const W = Number(w0);
  const H = Number(h0);
  const c = image?.crop ?? {};
  let x = Math.round((c.left ?? 0) * W);
  let y = Math.round((c.top ?? 0) * H);
  let w = Math.round(W * (1 - (c.left ?? 0) - (c.right ?? 0)));
  let h = Math.round(H * (1 - (c.top ?? 0) - (c.bottom ?? 0)));
  if (aspect && w / h !== aspect) {
    // Cut to the frame's shape around the hotspot (the editor's focus point).
    const hx = (image?.hotspot?.x ?? 0.5) * W;
    const hy = (image?.hotspot?.y ?? 0.5) * H;
    if (w / h > aspect) {
      const nw = Math.round(h * aspect);
      x = Math.round(Math.min(Math.max(hx - nw / 2, x), x + w - nw));
      w = nw;
    } else {
      const nh = Math.round(w / aspect);
      y = Math.round(Math.min(Math.max(hy - nh / 2, y), y + h - nh));
      h = nh;
    }
  }
  const params = new URLSearchParams();
  if (x || y || w !== W || h !== H) params.set('rect', `${x},${y},${w},${h}`);
  params.set('w', String(Math.min(width * 2, w)));
  params.set('fit', 'max');
  params.set('fm', ext === 'png' ? 'png' : 'jpg');
  if (ext !== 'png') params.set('q', '82');
  return `${base}?${params.toString().replace(/%2C/g, ',')}`;
}

function img(image: Any | undefined, width: number, o: Theme, opts: RenderOptions, link?: string, aspect?: number): string {
  const src = imageUrl(image, width, opts, aspect);
  if (!src) return '';
  const alt = esc(image?.alt ?? '');
  const tag = `<img class="img-fluid" src="${esc(src)}" width="${width}" alt="${alt}" style="width:100%;max-width:${width}px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:${o.text};">`;
  const href = safeUrl(link);
  return href ? `<a href="${esc(href)}">${tag}</a>` : tag;
}

/* ------------------------------------------------------------ rich text */

/**
 * Sanity rich text (the `nlRichText` type) as email HTML. The styling
 * controls are names, as on the site: the theme decides what "highlight"
 * or "yellow underline" look like, so a theme change restyles every
 * newsletter already written.
 */
export function richText(blocks: Any[] | undefined, t: Theme): string {
  if (!Array.isArray(blocks)) return '';
  const out: string[] = [];
  let list: string[] | null = null;
  const flush = () => {
    if (list) out.push(`<ul style="margin:0 0 12px;padding:0 0 0 18px;">${list.join('')}</ul>`);
    list = null;
  };
  for (const block of blocks) {
    if (block?._type !== 'block') continue;
    const defs: Any[] = block.markDefs ?? [];
    let html = (block.children ?? [])
      .map((span: Any) => {
        let s = lines(span.text);
        for (const mark of span.marks ?? []) s = applyMark(s, mark, defs, t);
        return s;
      })
      .join('');
    if (block.style === 'dropcap') {
      // First letter large over two lines, as in the campaigns. Outlook gets
      // an ordinary letter (the mso rule in the head).
      html = html.replace(/^((?:<[^>]+>)*)([^<&\s]|&[a-z]+;)/i, `$1<span class="dropcap">$2</span>`);
    }
    if (block.listItem) {
      list ??= [];
      list.push(`<li style="margin:0 0 4px;">${html}</li>`);
      continue;
    }
    flush();
    const style =
      block.style === 'big' ? ' class="big"' : block.style === 'small' ? ' class="small"' : block.style === 'italic' ? ' style="font-style:italic;"' : '';
    out.push(`<p${style}>${html || '&nbsp;'}</p>`);
  }
  flush();
  return out.join('\n');
}

function applyMark(s: string, mark: string, defs: Any[], t: Theme): string {
  switch (mark) {
    case 'strong':
      return `<strong>${s}</strong>`;
    case 'em':
      return `<em>${s}</em>`;
    case 'highlight':
      return `<span class="mark" style="background-color:${t.highlight};color:${t.highlightText};padding:0 3px;">${s}</span>`;
    case 'yellowUnderline':
      return `<span class="yellow-underline" style="text-decoration:underline;text-decoration-color:${t.highlight};text-decoration-thickness:3px;text-underline-offset:3px;">${s}</span>`;
  }
  const def = defs.find((d) => d._key === mark);
  if (def?._type === 'link') {
    const href = safeUrl(def.href);
    return href ? `<a href="${esc(href)}" style="color:${t.text};text-decoration:underline;">${s}</a>` : s;
  }
  if (def?._type === 'textColour') {
    const colour = TEXT_COLOURS[def.colour]?.value(t);
    return colour ? `<span style="color:${colour};">${s}</span>` : s;
  }
  if (def?._type === 'textSize') {
    const size = Number(def.size);
    return size >= 9 && size <= 60 ? `<span style="font-size:${size}px;line-height:120%;">${s}</span>` : s;
  }
  return s;
}

/* ------------------------------------------------------------- items */

/** What goes inside a column, at `width` px of content. */
function item(it: Any, width: number, t: Theme, o: RenderOptions): string {
  const cell = (inner: string, pad = `0 ${PAD}px 14px`, extra = '') =>
    `<tr><td class="col-pad"${extra} style="padding:${pad};">${inner}</td></tr>`;
  switch (it?._type) {
    case 'nlLabel':
      return cell(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="label" style="background-color:${t.labelBg};color:${t.labelText};font-family:${FONT};font-size:${t.labelSize}px;font-weight:500;padding:3px 5px 2px;text-transform:uppercase;letter-spacing:0.2px;line-height:120%;">${lines(it.text)}</td></tr></table>`,
        `8px ${PAD}px 12px`,
      );
    case 'nlSubtitle':
      return cell(
        `<div class="subtitle" style="color:${t.subtitle};font-family:${FONT};font-size:${t.subtitleSize}px;font-weight:600;font-style:${it.upright ? 'normal' : 'italic'};line-height:120%;">${lines(it.text)}${it.dot === false ? '' : ' &#9679;'}</div>`,
        `2px ${PAD}px 10px`,
      );
    case 'nlHeadline':
      return cell(
        `<div class="headline" style="color:${t.headline};font-family:${FONT};font-size:${it.size ?? t.headlineSize}px;font-weight:900;line-height:118%;">${lines(it.text)}</div>`,
        `20px ${PAD}px 16px`,
      );
    case 'nlText':
      return cell(`<div class="text" style="color:${t.text};font-family:${FONT};font-size:${t.textSize}px;line-height:${t.textLineHeight};">${richText(it.body, t)}</div>`);
    case 'nlImage': {
      const tag = img(it.image, width, t, o, it.url, it.aspect ? Number(it.aspect) : undefined);
      const credit = it.image?.credit ? `<div style="padding-top:4px;font-family:${FONT};font-size:10px;color:${t.text};opacity:0.75;">${esc(it.image.credit)}</div>` : '';
      return tag ? cell(tag + credit, `8px ${PAD}px 18px`) : '';
    }
    case 'nlButton':
      return cell(button(it, t), `4px ${PAD}px 20px`, ` align="${it.align === 'left' ? 'left' : 'center'}"`);
    case 'nlInfoCard':
      return cell(infoCard(it, t), `8px ${PAD}px 20px`);
    case 'nlList':
      return cell(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${(it.items ?? [])
          .map(
            (li: string, i: number, all: string[]) =>
              `<tr><td style="border-top:1px solid ${t.line};${i === all.length - 1 ? `border-bottom:1px solid ${t.line};` : ''}padding:7px 0;font-family:${FONT};font-size:${t.textSize}px;line-height:140%;color:${t.text};">&#8600; ${esc(li)}</td></tr>`,
          )
          .join('')}</table>`,
        `0 ${PAD}px 20px`,
      );
    case 'nlOffer':
      return cell(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px dotted ${t.line};">
          ${it.title ? `<tr><td align="right" style="padding:12px 10px 6px;font-family:${FONT};font-size:19px;font-weight:600;font-style:italic;color:${t.subtitle};">${lines(it.title)}</td></tr>` : ''}
          <tr><td class="text" style="padding:0 10px 10px;color:${t.text};font-family:${FONT};font-size:${t.textSize}px;line-height:${t.textLineHeight};">${richText(it.body, t)}</td></tr>
          ${it.button?.label ? `<tr><td align="center" style="padding:4px 10px 18px;">${button(it.button, t)}</td></tr>` : ''}
        </table>`,
        `8px ${PAD}px 20px`,
      );
    case 'nlVipCode':
      // A merge field: Mailchimp prints each guest's own code here.
      return cell(
        `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:${t.labelBg};color:${t.labelText};padding:2px 4px 1px;font-family:${FONT};font-size:19px;font-weight:600;">${lines(it.label || 'Your VIP code:')}</td></tr></table>
         <div style="padding-top:7px;font-family:${FONT};font-size:15px;font-weight:600;letter-spacing:1px;color:${t.text};">*|VIPCODE|*</div>`,
        `20px ${PAD}px 20px`,
        ' align="center"',
      );
    case 'nlFigures':
      return cell(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${(it.items ?? [])
          .map(
            (f: Any) =>
              `<tr><td style="padding:0 0 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${t.line};"><tr><td style="padding:8px 10px;font-family:${FONT};color:${t.text};"><span style="font-size:40px;line-height:100%;letter-spacing:-0.5px;">${esc(f.number)}</span> <span style="font-size:16.5px;line-height:110%;">${esc(f.text)}</span></td></tr></table></td></tr>`,
          )
          .join('')}</table>`,
        `8px ${PAD}px 12px`,
      );
    default:
      return '';
  }
}

/** The oval (or outlined) button; Outlook draws the oval as a rectangle. */
function button(b: Any, t: Theme): string {
  const href = safeUrl(b.url) ?? '#';
  const outline = b.style === 'outline';
  const td = outline
    ? `border:1px solid ${t.line};border-radius:8px;padding:8px 18px;`
    : `background-color:${t.buttonBg};border-radius:50%;padding:11px 24px;`;
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;display:inline-table;"><tr><td class="${outline ? 'button-outline' : 'pill'}" align="center" style="${td}"><a href="${esc(href)}" style="color:${outline ? t.text : t.buttonText};font-family:${FONT};font-size:15px;font-weight:600;line-height:115%;text-decoration:none;">${lines(b.label)}</a></td></tr></table>`;
}

function infoCard(c: Any, t: Theme): string {
  const rows = (c.rows ?? [])
    .map(
      (r: Any) =>
        `<tr><td style="padding:5px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="white-space:nowrap;padding-right:6px;font-family:${FONT};font-size:16px;font-weight:600;color:${t.text};line-height:120%;">${esc(r.key)}</td><td width="100%" valign="bottom" style="padding-bottom:5px;"><div style="border-bottom:1px solid ${t.line};height:1px;font-size:1px;line-height:1px;">&nbsp;</div></td></tr></table></td></tr>
         <tr><td style="padding:1px 0 6px;font-family:${FONT};font-size:13px;color:${t.text};line-height:140%;">${lines(r.value)}</td></tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${t.line};"><tr><td style="padding:12px 10px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    ${c.title ? `<tr><td align="right" style="padding-bottom:8px;font-family:${FONT};font-size:17px;font-weight:500;color:${t.text};text-decoration:underline;text-underline-offset:3px;text-transform:uppercase;">${esc(c.title)}</td></tr>` : ''}
    ${rows}
    ${c.note ? `<tr><td align="center" style="padding-top:6px;"><table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr><td style="border:2px dotted ${t.line};border-radius:40px;padding:4px 14px;font-family:${FONT};font-size:16px;font-weight:600;color:${t.text};">${esc(c.note)}</td></tr></table></td></tr>` : ''}
  </table></td></tr></table>`;
}

/* ----------------------------------------------------------- sections */

const BG = (t: Theme, name?: string) => (name === 'highlight' ? t.highlight : name === 'accent' ? t.accent : name === 'header' ? t.header : '');

function column(col: Any | undefined, width: number, t: Theme, o: RenderOptions): string {
  const inner = (col?.items ?? []).map((it: Any) => item(it, width - PAD * 2, t, o)).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${inner || '<tr><td>&nbsp;</td></tr>'}</table>`;
}

/** One or two columns. Two stack into one on a phone, the left one first. */
function row(s: Any, t: Theme, o: RenderOptions): string {
  const bg = BG(t, s.background);
  const style = `padding:0;font-size:0;${bg ? `background-color:${bg};` : ''}`;
  if (!s.right?.items?.length) {
    return `<tr><td style="${style}" align="left">${column(s.left, SHEET, t, o)}</td></tr>`;
  }
  const valign = s.align === 'middle' ? 'middle' : 'top';
  const col = (c: Any) =>
    `<div class="col" style="display:inline-block;width:100%;max-width:${COL}px;vertical-align:${valign};text-align:left;">${column(c, COL, t, o)}</div>`;
  return `<tr><td style="${style}" align="center">
<!--[if mso]><table role="presentation" width="${SHEET}" cellpadding="0" cellspacing="0" border="0"><tr><td width="${COL}" valign="${valign}"><![endif]-->
${col(s.left)}
<!--[if mso]></td><td width="${COL}" valign="${valign}"><![endif]-->
${col(s.right)}
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>`;
}

function section(s: Any, t: Theme, o: RenderOptions, site: string): string {
  switch (s?._type) {
    case 'nlRow':
      return row(s, t, o);
    case 'nlRule':
      return `<tr><td style="padding:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${t.rule};font-size:0;line-height:0;height:1px;">&nbsp;</td></tr></table></td></tr>`;
    case 'nlBanner': {
      const href = safeUrl(s.url);
      const text = lines(s.text);
      return `<tr><td align="center" style="padding:13px 20px;background-color:${t.highlight};background-image:linear-gradient(180deg,${t.highlight} 0%,#ffffff 50%,${t.highlight} 100%);font-family:${FONT};font-size:21px;font-weight:600;font-style:italic;color:${t.highlightText};">${
        href ? `<a href="${esc(href)}" style="color:${t.highlightText};text-decoration:none;">${text}</a>` : text
      }</td></tr>`;
    }
    case 'nlHeader':
      return `<tr><td style="background-color:${t.header || t.sheet};padding:22px ${PAD}px 18px;font-family:${FONT};color:${t.header ? t.headerText : t.headline};">
        <div class="title" style="font-size:44px;font-weight:900;line-height:105%;letter-spacing:-0.5px;">${lines(s.title)}</div>
        ${s.edition ? `<div class="edition" style="padding-top:6px;font-size:26px;font-weight:400;font-style:italic;line-height:115%;">${lines(s.edition)}</div>` : ''}
      </td></tr>`;
    case 'nlHero':
      return hero(s, t, o, site);
    case 'nlPartners': {
      const logos: Any[] = (s.logos ?? []).filter((l: Any) => l?.image?.asset);
      if (!logos.length) return '';
      const cells = logos.map(
        (l) => `<div class="col" style="display:inline-block;width:100%;max-width:${COL}px;vertical-align:top;">${img(l.image, COL, t, o, l.url)}</div>`,
      );
      return `<tr><td style="padding:6px 0 10px;font-size:0;" align="center">${cells.join('\n')}</td></tr>`;
    }
    default:
      return '';
  }
}

/**
 * The top photo, in Lilanga's two layouts: the title over the photo (a
 * background image, so the title stays live text; VML repeats it for
 * Outlook on Windows) or the title under it.
 */
function hero(s: Any, t: Theme, o: RenderOptions, site: string): string {
  const src = imageUrl(s.image, SHEET, o, SHEET / 283);
  const logo = `<a href="${esc(site)}/"><img src="${esc(site)}/assets/newsletter/wordmark-white.png" width="78" alt="ceramic brussels" style="width:78px;font-family:Helvetica,Arial,sans-serif;font-size:16px;color:#ffffff;"></a>`;
  const title = lines(s.title);
  if (s.layout === 'under' || !src) {
    return `<tr><td style="padding:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${src ? `<tr><td>${img(s.image, SHEET, t, o, s.url, SHEET / 283)}</td></tr>` : ''}
      ${title ? `<tr><td class="col-pad hero-title" style="padding:18px ${PAD}px 6px;color:${t.headline};font-family:${FONT};font-size:40px;font-weight:900;line-height:110%;">${title}</td></tr>` : ''}
    </table></td></tr>`;
  }
  return `<tr><td class="hero" valign="top" bgcolor="${t.sheet}" background="${esc(src)}" style="background-image:url('${esc(src)}');background-position:center top;background-size:cover;background-repeat:no-repeat;">
<!--[if gte mso 9]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:495pt;height:209pt;"><v:fill type="frame" src="${esc(src)}" color="${t.sheet}" /><v:textbox inset="0,0,0,0"><![endif]-->
<div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td class="hero-top" valign="top" height="206" style="height:206px;padding:16px 14px 0;">${logo}</td></tr>
  <tr><td class="hero-title" valign="bottom" style="padding:0 14px 16px;color:#ffffff;font-family:${FONT};font-size:40px;font-weight:900;line-height:110%;text-shadow:0 1px 12px rgba(0,0,0,0.35);">${title}</td></tr>
</table></div>
<!--[if gte mso 9]></v:textbox></v:rect><![endif]-->
</td></tr>`;
}

/* -------------------------------------------------------------- frame */

const LANG_LABEL: Record<string, string> = { en: 'Read in English', fr: 'Lire en français', nl: 'In het Nederlands lezen' };

function languages(doc: Any, t: Theme): string {
  const links = (['en', 'fr', 'nl'] as const)
    .filter((l) => l !== (doc.language ?? 'en'))
    .map((l) => [l, safeUrl(doc.translations?.[l])] as const)
    .filter(([, href]) => href);
  if (!links.length) return '';
  const pill = ([l, href]: readonly [string, string | null]) =>
    `<div class="col" style="display:inline-block;width:100%;max-width:318px;vertical-align:top;"><table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:4px auto;border-collapse:separate;"><tr><td style="border:1px solid ${t.line};border-radius:7px;padding:5px 14px;"><a href="${esc(href!)}" style="font-family:${FONT};font-size:12px;color:${t.text};text-decoration:none;">${LANG_LABEL[l]}</a></td></tr></table></div>`;
  return `<tr><td style="padding:14px 12px 12px;font-size:0;" align="center">${links.map(pill).join('\n')}</td></tr>`;
}

/**
 * The footer: logo, dates and Instagram of the fair the newsletter is for.
 * The logo and dates are cut from the fair's footer artwork in Sanity,
 * as in Lilanga's templates; change them here each edition.
 */
const FOOTERS = {
  brussels: {
    url: '/en/',
    logo: 'https://cdn.sanity.io/images/5hqzhin7/production/5e4ae2db68db3c5dd6e0e29c52dc81ebf7770f10-2567x486.jpg?rect=40,200,400,250&w=200&fm=jpg&q=85',
    dates: 'https://cdn.sanity.io/images/5hqzhin7/production/5e4ae2db68db3c5dd6e0e29c52dc81ebf7770f10-2567x486.jpg?rect=900,215,700,240&w=280&fm=jpg&q=85',
    datesAlt: '20 to 24 January 2027',
    instagram: 'ceramic.brussels',
  },
  basel: {
    url: 'https://www.ceramic-basel.com/',
    logo: '',
    dates: '',
    datesAlt: '15 to 20 June 2027',
    instagram: 'ceramic.basel',
  },
} as const;

function footer(doc: Any, t: Theme, site: string): string {
  const f = FOOTERS[(doc.footer as 'brussels' | 'basel') ?? t.footer] ?? FOOTERS.brussels;
  const home = f.url.startsWith('/') ? `${site}${f.url}` : f.url;
  const logo = f.logo
    ? `<a href="${esc(home)}"><img src="${esc(f.logo)}" width="100" alt="ceramic ${doc.footer === 'basel' ? 'basel' : 'brussels'}" style="width:100px;font-family:Helvetica,Arial,sans-serif;font-size:16px;color:${t.text};"></a>`
    : `<a href="${esc(home)}" style="font-family:${FONT};font-size:18px;font-weight:600;color:${t.text};text-decoration:none;">ceramic basel</a>`;
  const dates = f.dates
    ? `<img src="${esc(f.dates)}" width="140" alt="${esc(f.datesAlt)}" style="width:140px;margin:0 auto;font-family:Helvetica,Arial,sans-serif;font-size:16px;color:${t.text};">`
    : `<span style="font-family:${FONT};font-size:15px;color:${t.text};">${esc(f.datesAlt)}</span>`;
  return `<tr><td style="padding:14px 12px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td style="border-top:1px solid ${t.line};font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr><td style="padding:14px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td class="footer-cell" width="33%" valign="middle" style="width:33%;">${logo}</td>
    <td class="footer-cell" width="34%" align="center" valign="middle" style="width:34%;">${dates}</td>
    <td class="footer-cell" width="33%" align="right" valign="middle" style="width:33%;font-family:${FONT};font-size:16px;"><a href="https://www.instagram.com/${f.instagram}/" style="color:${t.text};text-decoration:none;">@${f.instagram}</a></td>
  </tr></table></td></tr>
</table></td></tr>`;
}

function head(doc: Any, t: Theme, site: string): string {
  const font = (w: number) =>
    `@font-face { font-family: 'Noi Grotesk'; font-weight: ${w}; font-style: normal; src: url('${site}/fonts/noi-grotesk-${w}.woff2') format('woff2'); }`;
  return `<!doctype html>
<html lang="${esc(doc.language ?? 'en')}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(doc.subject ?? '')}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style>
  * { font-family: Arial, Helvetica, sans-serif !important; }
  .col { width: ${COL}px !important; }
  .dropcap { font-size: inherit !important; line-height: inherit !important; padding: 0 !important; float: none !important; }
</style>
<![endif]-->
<style>
  @media screen { ${[400, 500, 600, 900].map(font).join(' ')} }
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
  img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; height: auto; }
  p { margin: 0 0 12px; }
  p:last-child { margin-bottom: 0; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
  .big { font-size: 18px !important; line-height: 140% !important; }
  .small { font-size: 12px !important; }
  .dropcap { float: left; font-size: 44px; line-height: 38px; padding: 2px 3px 0 0; font-weight: 400; }
  @media only screen and (max-width: 680px) {
    .sheet { width: 100% !important; }
    .col { max-width: 100% !important; width: 100% !important; }
    .col-pad { padding-left: 20px !important; padding-right: 20px !important; }
    .hero-top { height: 150px !important; }
    .hero-title { font-size: 32px !important; }
    .title { font-size: 32px !important; }
    .headline { font-size: 22px !important; }
    .img-fluid { width: 100% !important; max-width: 100% !important; }
    .footer-cell { display: block !important; width: 100% !important; text-align: center !important; padding: 8px 0 !important; }
    .footer-cell img { margin: 0 auto !important; }
  }
</style>
</head>`;
}

/** The whole email. `doc` is a newsletter document, draft or published. */
export function renderNewsletter(doc: Any, o: RenderOptions): string {
  const t = themeOf(doc.theme);
  const site = (o.siteUrl ?? 'https://www.ceramic.brussels').replace(/\/$/, '');
  const body = (doc.sections ?? [])
    .filter((s: Any) => !s?.hidden)
    .map((s: Any) => section(s, t, o, site))
    .join('\n');
  return `${head(doc, t, site)}
<body style="margin:0;padding:0;background-color:${t.page};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;">${esc(doc.previewText ?? '')}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${t.page};">
<tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="${SHEET}" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="sheet" width="${SHEET}" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${SHEET}px;background-color:${t.sheet};">
${languages(doc, t)}
${body}
${footer(doc, t, site)}
</table>
<!--[if mso]></td></tr></table><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:${SHEET}px;">
  <tr><td align="center" style="padding:22px 20px 30px;line-height:160%;color:${t.legal};font-family:Helvetica,Arial,sans-serif;font-size:11px;">
    This email was sent to <a href="mailto:*|EMAIL|*" style="color:${t.legal};">*|EMAIL|*</a><br>
    <a href="*|ABOUT_LIST|*" style="color:${t.legal};">why did I get this?</a> &nbsp; <a href="*|UNSUB|*" style="color:${t.legal};">unsubscribe from this list</a> &nbsp; <a href="*|UPDATE_PROFILE|*" style="color:${t.legal};">update subscription preferences</a><br>
    *|LIST:ADDRESSLINE|*
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
