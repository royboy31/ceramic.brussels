/**
 * Switches for the launch of 2026-10-05, kept in one place so putting the
 * site back the way it was is one edit rather than a hunt.
 *
 * Design by Lilanga; nothing here is content, and nothing here belongs in
 * Sanity - an editor must not be able to take a section of the site off by
 * accident.
 */

/**
 * **Previous editions, off for launch** (client, 2026-10-01: *"since we have
 * to go live on Monday temporarily remove links from the site so users can't
 * access"*). Only the galleries of the edition `/exhibitors` opens on are
 * reachable.
 *
 * With this `false`:
 *
 * - every `/previous-editions/<year>/…` address answers a **302** to
 *   `/exhibitors/` - a temporary redirect, never a 301, which a browser would
 *   keep long after the section comes back;
 * - the pages are still *built*, because `scripts/legacy-redirects.mjs`
 *   checks every target against the build and 61 of the old site's rules
 *   point into this section. Not building them fails the build
 *   (docs/backend-requests.md #53 asks for the map to send them to
 *   `/exhibitors/` while this is off, which would let the routes go entirely);
 * - a past edition's gallery pages (`/exhibitors/2025/<slug>`) are not built
 *   at all - no rule points at one, so nothing breaks;
 * - the year row under the galleries list and the footer's "previous
 *   editions →" pill are not drawn.
 *
 * Set it back to `true` and the section returns exactly as it was.
 *
 * **On this branch it is `true`, and this branch must never be merged.**
 * `previous-editions-review` exists only to give the client a build of the
 * section to comment on (their ask of 2026-10-08, after the pages bounced
 * for them in the Studio preview as they do on the live site). Production
 * keeps the launch setting until the 2024/2025 galleries have their data
 * and the client asks for the section back - docs/post-launch.md #52.
 */
export const PAST_EDITIONS_PUBLIC = true;
