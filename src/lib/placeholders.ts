/**
 * Placeholder photography from the design hand-off.
 *
 * These stand in only while a document has no image of its own in Sanity - as
 * soon as an editor uploads one it wins, so nothing here needs undoing later.
 * Pools are picked from deterministically by slug, which keeps a given record
 * on the same picture between builds instead of reshuffling every deploy.
 */
export interface Placeholder {
  src: string;
  srcset: string;
  width: number;
  height: number;
}

const POOLS = {
  exhibitor: [
  { src: '/assets/ph/exhibitor-0-1200.webp', srcset: '/assets/ph/exhibitor-0-700.webp 700w, /assets/ph/exhibitor-0-1200.webp 1200w', width: 1200, height: 751 },
  { src: '/assets/ph/exhibitor-1-1200.webp', srcset: '/assets/ph/exhibitor-1-700.webp 700w, /assets/ph/exhibitor-1-1200.webp 1200w', width: 1200, height: 800 },
  { src: '/assets/ph/exhibitor-2-1200.webp', srcset: '/assets/ph/exhibitor-2-700.webp 700w, /assets/ph/exhibitor-2-1200.webp 1200w', width: 1200, height: 1500 },
  { src: '/assets/ph/exhibitor-3-1200.webp', srcset: '/assets/ph/exhibitor-3-700.webp 700w, /assets/ph/exhibitor-3-1200.webp 1200w', width: 1200, height: 900 },
  { src: '/assets/ph/exhibitor-4-1200.webp', srcset: '/assets/ph/exhibitor-4-700.webp 700w, /assets/ph/exhibitor-4-1200.webp 1200w', width: 1200, height: 800 },
  { src: '/assets/ph/exhibitor-5-1200.webp', srcset: '/assets/ph/exhibitor-5-700.webp 700w, /assets/ph/exhibitor-5-1200.webp 1200w', width: 1200, height: 1600 },
  { src: '/assets/ph/exhibitor-6-1200.webp', srcset: '/assets/ph/exhibitor-6-700.webp 700w, /assets/ph/exhibitor-6-1200.webp 1200w', width: 1200, height: 792 },
  { src: '/assets/ph/exhibitor-7-1200.webp', srcset: '/assets/ph/exhibitor-7-700.webp 700w, /assets/ph/exhibitor-7-1200.webp 1200w', width: 1200, height: 1500 },
  { src: '/assets/ph/exhibitor-8-1200.webp', srcset: '/assets/ph/exhibitor-8-700.webp 700w, /assets/ph/exhibitor-8-1200.webp 1200w', width: 1200, height: 800 },
  { src: '/assets/ph/exhibitor-9-1200.webp', srcset: '/assets/ph/exhibitor-9-700.webp 700w, /assets/ph/exhibitor-9-1200.webp 1200w', width: 1200, height: 800 },
  { src: '/assets/ph/exhibitor-10-1200.webp', srcset: '/assets/ph/exhibitor-10-700.webp 700w, /assets/ph/exhibitor-10-1200.webp 1200w', width: 1200, height: 800 },
  { src: '/assets/ph/exhibitor-11-1200.webp', srcset: '/assets/ph/exhibitor-11-700.webp 700w, /assets/ph/exhibitor-11-1200.webp 1200w', width: 1200, height: 800 },
  ],
  portrait: [
  { src: '/assets/ph/portrait-0-600.webp', srcset: '/assets/ph/portrait-0-600.webp 600w', width: 197, height: 270 },
  { src: '/assets/ph/portrait-1-600.webp', srcset: '/assets/ph/portrait-1-600.webp 600w', width: 197, height: 270 },
  { src: '/assets/ph/portrait-2-600.webp', srcset: '/assets/ph/portrait-2-600.webp 600w', width: 197, height: 270 },
  { src: '/assets/ph/portrait-3-600.webp', srcset: '/assets/ph/portrait-3-600.webp 600w', width: 197, height: 246 },
  { src: '/assets/ph/portrait-4-600.webp', srcset: '/assets/ph/portrait-4-600.webp 600w', width: 197, height: 203 },
  { src: '/assets/ph/portrait-5-600.webp', srcset: '/assets/ph/portrait-5-600.webp 600w', width: 197, height: 197 },
  ],
  work: [
  { src: '/assets/ph/work-0-900.webp', srcset: '/assets/ph/work-0-900.webp 900w', width: 900, height: 600 },
  { src: '/assets/ph/work-1-900.webp', srcset: '/assets/ph/work-1-900.webp 900w', width: 900, height: 600 },
  { src: '/assets/ph/work-2-900.webp', srcset: '/assets/ph/work-2-900.webp 900w', width: 433, height: 541 },
  { src: '/assets/ph/work-3-900.webp', srcset: '/assets/ph/work-3-900.webp 900w', width: 433, height: 541 },
  { src: '/assets/ph/work-4-900.webp', srcset: '/assets/ph/work-4-900.webp 900w', width: 433, height: 688 },
  ],
  fair: [
  { src: '/assets/ph/fair-0-1200.webp', srcset: '/assets/ph/fair-0-700.webp 700w, /assets/ph/fair-0-1200.webp 1200w', width: 1200, height: 800 },
  { src: '/assets/ph/fair-1-1200.webp', srcset: '/assets/ph/fair-1-700.webp 700w, /assets/ph/fair-1-1200.webp 1200w', width: 670, height: 447 },
  { src: '/assets/ph/fair-2-1200.webp', srcset: '/assets/ph/fair-2-700.webp 700w, /assets/ph/fair-2-1200.webp 1200w', width: 907, height: 605 },
  { src: '/assets/ph/fair-3-1200.webp', srcset: '/assets/ph/fair-3-700.webp 700w, /assets/ph/fair-3-1200.webp 1200w', width: 670, height: 447 },
  { src: '/assets/ph/fair-4-1200.webp', srcset: '/assets/ph/fair-4-700.webp 700w, /assets/ph/fair-4-1200.webp 1200w', width: 670, height: 447 },
  { src: '/assets/ph/fair-5-1200.webp', srcset: '/assets/ph/fair-5-700.webp 700w, /assets/ph/fair-5-1200.webp 1200w', width: 434, height: 289 },
  { src: '/assets/ph/fair-6-1200.webp', srcset: '/assets/ph/fair-6-700.webp 700w, /assets/ph/fair-6-1200.webp 1200w', width: 670, height: 447 },
  ],
} satisfies Record<string, Placeholder[]>;

export type PoolName = keyof typeof POOLS;

export const GUEST_PORTRAIT: Placeholder = {
  src: '/assets/ph/guest-portrait.webp',
  srcset: '/assets/ph/guest-portrait.webp 900w',
  width: 900,
  height: 1260,
};

/** Stable string hash, so a slug always maps to the same picture. */
function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function placeholder(pool: PoolName, seed = ''): Placeholder {
  const options = POOLS[pool];
  return options[hash(seed) % options.length];
}
