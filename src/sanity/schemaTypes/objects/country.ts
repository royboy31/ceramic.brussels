import { defineField } from 'sanity';

/**
 * Two-letter country code, uppercase. The design shows it as a superscript
 * after gallery and artist names ("AIFA CH", "Paris (FR)"), and the old site
 * typed it into the name by hand - with (gb) and (uk) both in use. Keeping it
 * a validated field is what makes the exhibitor filters and the "N countries"
 * figure reliable.
 */
export const countryCodeField = (overrides: Record<string, unknown> = {}) =>
  defineField({
    name: 'countryCode',
    title: 'Country code',
    type: 'string',
    description: 'ISO 3166 two-letter code, uppercase: BE, FR, NL, ES, GB…',
    validation: (rule) =>
      rule.regex(/^[A-Z]{2}$/, { name: 'country code', invert: false }).error('Use two uppercase letters, e.g. BE.'),
    ...overrides,
  });
