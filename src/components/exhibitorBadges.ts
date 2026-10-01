/**
 * The designer's lockups for the exhibitor cards and gallery pages
 * (Léonie: "Logos you might need", rounds 1 and 2), in
 * `public/assets/exhibitors/`.
 *
 * These were three hard-coded copies of the same `focus-espana.png` test -
 * in `ExhibitorCard`, `ExhibitorDetail` and the artists route - written when
 * España was the only country with a lockup. Round 2 added Norway, so the
 * test became a table before it became a fourth copy.
 *
 * It sits beside the components rather than in `src/lib/`, which is the
 * backend half: this is design artwork, like `vipContent.ts`
 * (docs/frontend-handbook.md, "What is yours and what is not").
 *
 * **A year or a country with no lockup falls back to words**, which is what
 * every one of them did before it had artwork. Nothing breaks when 2027
 * arrives without a badge; it just reads as text until Léonie sends one.
 */

/** Country focus lockups, matched on the focus label in any of the three languages. */
const FOCUS_LOCKUPS: { test: RegExp; src: string }[] = [
  { test: /espa(ñ|n)a|spain|espagne|spanje/i, src: '/assets/exhibitors/focus-espana.png' },
  { test: /norway|norvège|norvege|noorwegen|norge/i, src: '/assets/exhibitors/focus-norway.png' },
];

/** The focus lockup for a label, or null to print the words instead. */
export function focusLockup(label: string | undefined | null): string | null {
  const text = String(label ?? '');
  return FOCUS_LOCKUPS.find((l) => l.test.test(text))?.src ?? null;
}

/**
 * The jury prize oval, per edition - the badge carries its own year, so one
 * file cannot serve them all the way the solo show disc does.
 */
const JURY_PRIZE_YEARS = [2024, 2025, 2026] as const;

/** The jury prize lockup for an edition year, or null to print the words instead. */
export function juryPrizeLockup(year: number | undefined | null): string | null {
  return year && (JURY_PRIZE_YEARS as readonly number[]).includes(year)
    ? `/assets/exhibitors/jury-prize-${year}.png`
    : null;
}

/** The solo show disc. One file, no year on it. */
export const SOLO_SHOW_LOCKUP = '/assets/exhibitors/solo-show.png';
