import { defineField, defineType } from 'sanity';
import { LOCALES, DEFAULT_LOCALE } from '../../../lib/locales';
import { LocaleInput } from '../../components/LocaleInput';

/**
 * Field-level i18n. One document holds all three languages, which keeps
 * language-neutral data (booth number, country, images) from being duplicated
 * and drifting apart across translations.
 *
 * All three render behind a shared language switcher (see LocaleInput), so the
 * form shows one language at a time and switching on any field switches the
 * whole document.
 */

const localeFields = (type: string, extra: Record<string, unknown> = {}) =>
  LOCALES.map((locale) =>
    defineField({
      name: locale.id,
      title: locale.title,
      type,
      ...extra,
    }),
  );

/** Shows which languages are filled, e.g. "EN · FR" with NL missing. */
export function translationSummary(value: Record<string, unknown> | undefined): string {
  if (!value) return 'no translations';
  const filled = LOCALES.filter((l) => {
    const v = value[l.id];
    return Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : !!v;
  });
  if (filled.length === 0) return 'empty';
  const missing = LOCALES.filter((l) => !filled.includes(l));
  const done = filled.map((l) => l.id.toUpperCase()).join(' · ');
  return missing.length
    ? `${done}  —  missing ${missing.map((l) => l.id.toUpperCase()).join(', ')}`
    : done;
}

const localePreview = {
  select: { en: 'en', fr: 'fr', nl: 'nl' },
  prepare: (value: Record<string, any>) => ({
    title: value[DEFAULT_LOCALE] ?? '(untranslated)',
    subtitle: translationSummary(value),
  }),
};

export const localeString = defineType({
  name: 'localeString',
  title: 'Text',
  type: 'object',
  components: { input: LocaleInput },
  fields: localeFields('string'),
  preview: localePreview,
});

export const localeText = defineType({
  name: 'localeText',
  title: 'Text',
  type: 'object',
  components: { input: LocaleInput },
  fields: localeFields('text', { rows: 4 }),
  preview: localePreview,
});

export const localeBlock = defineType({
  name: 'localeBlock',
  title: 'Rich text',
  type: 'object',
  components: { input: LocaleInput },
  fields: localeFields('array', { of: [{ type: 'block' }, { type: 'figure' }] }),
  preview: {
    select: { en: 'en', fr: 'fr', nl: 'nl' },
    prepare: (value: Record<string, any>) => ({
      title: 'Rich text',
      subtitle: translationSummary(value),
    }),
  },
});

/** Per-language URL segment, switched by the same language selector. */
export const localeSlug = defineType({
  name: 'localeSlug',
  title: 'Slug',
  type: 'object',
  components: { input: LocaleInput },
  fields: localeFields('slug', { options: { maxLength: 96 } }),
  preview: {
    select: { en: 'en', fr: 'fr', nl: 'nl' },
    prepare: (value: Record<string, any>) => ({
      title: value[DEFAULT_LOCALE]?.current ?? '(no slug)',
      subtitle: translationSummary(
        Object.fromEntries(LOCALES.map((l) => [l.id, value[l.id]?.current])),
      ),
    }),
  },
});
