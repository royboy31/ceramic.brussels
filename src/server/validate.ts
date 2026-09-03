import { LOCALES } from '../lib/locales';
import type { EditableField, EditableType } from './editable';
import { findField } from './editable';

/**
 * Turns a submitted form into a Sanity patch, or refuses it.
 *
 * Two rules matter here beyond the obvious type checking:
 *
 * 1. An empty value is an *unset*, never an empty string. Every localised
 *    query is `coalesce(field[$lang], field.en)`, and an empty string is not
 *    null - it would win the coalesce and render as a blank instead of falling
 *    back to English.
 *
 * 2. A localised field is written whole, `_type` included. The stored shape is
 *    { _type: 'localeString', en, fr, nl }, and a dotted set on a field that
 *    does not exist yet has no parent object to write into.
 */

export interface PatchPlan {
  set: Record<string, unknown>;
  unset: string[];
}

export class ValidationError extends Error {}

const asString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

function checkLength(field: EditableField, value: string) {
  const max = field.max ?? 5000;
  if (value.length > max) {
    throw new ValidationError(`${field.label} must be at most ${max} characters.`);
  }
}

function scalar(field: EditableField, raw: unknown): unknown | undefined {
  switch (field.kind) {
    case 'string':
    case 'text': {
      const value = asString(raw);
      if (!value) return undefined;
      checkLength(field, value);
      return value;
    }

    case 'url': {
      const value = asString(raw);
      if (!value) return undefined;
      let parsed: URL;
      try {
        parsed = new URL(value);
      } catch {
        throw new ValidationError(`${field.label} must be a full address including https://.`);
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new ValidationError(`${field.label} must be an http or https address.`);
      }
      if (value.length > 500) throw new ValidationError(`${field.label} is too long.`);
      return parsed.toString();
    }

    case 'email': {
      const value = asString(raw);
      if (!value) return undefined;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 254) {
        throw new ValidationError(`${field.label} must be a valid email address.`);
      }
      return value;
    }

    case 'number': {
      if (raw === '' || raw === null || raw === undefined) return undefined;
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new ValidationError(`${field.label} must be a number.`);
      return value;
    }

    // A false boolean is a real value, not an absence - it is always written.
    case 'boolean':
      return raw === true || raw === 'true';

    case 'date': {
      const value = asString(raw);
      if (!value) return undefined;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new ValidationError(`${field.label} must be a date (YYYY-MM-DD).`);
      }
      return value;
    }

    case 'datetime': {
      const value = asString(raw);
      if (!value) return undefined;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new ValidationError(`${field.label} must be a valid date and time.`);
      }
      return date.toISOString();
    }

    case 'select': {
      const value = asString(raw);
      if (!value) return undefined;
      if (!field.options?.some((option) => option.value === value)) {
        throw new ValidationError(`${field.label} has an unknown value.`);
      }
      return value;
    }

    default:
      throw new ValidationError(`${field.label} cannot be edited here.`);
  }
}

function localised(field: EditableField, raw: unknown): unknown | undefined {
  if (raw === null || typeof raw !== 'object') return undefined;
  const input = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {
    _type: field.kind === 'localeText' ? 'localeText' : 'localeString',
  };

  let filled = 0;
  for (const locale of LOCALES) {
    const value = asString(input[locale.id]);
    if (!value) continue;
    checkLength(field, value);
    out[locale.id] = value;
    filled++;
  }

  return filled ? out : undefined;
}

/**
 * Builds the patch. Only whitelisted fields are considered; anything else in
 * the payload is ignored rather than rejected, so an older browser tab posting
 * a stale form cannot fail the whole save.
 */
export function buildPatch(type: EditableType, payload: Record<string, unknown>): PatchPlan {
  const plan: PatchPlan = { set: {}, unset: [] };

  for (const [key, raw] of Object.entries(payload)) {
    const field = findField(type, key);
    if (!field) continue;

    const value =
      field.kind === 'localeString' || field.kind === 'localeText'
        ? localised(field, raw)
        : scalar(field, raw);

    if (value === undefined) {
      if (field.required) throw new ValidationError(`${field.label} is required.`);
      plan.unset.push(field.name);
    } else {
      plan.set[field.name] = value;
    }
  }

  if (!Object.keys(plan.set).length && !plan.unset.length) {
    throw new ValidationError('Nothing to save.');
  }
  return plan;
}
