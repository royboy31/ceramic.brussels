import { useSyncExternalStore } from 'react';
import { DEFAULT_LOCALE, isLocale, type LocaleId } from '../../lib/locales';

/**
 * The language the Studio is currently being edited in, chosen once from the
 * top bar and applied to every localised field in the whole Studio.
 *
 * A module-level store rather than React context, so the navbar and every field
 * input share it without needing a provider wrapped around the Studio.
 */
const STORAGE_KEY = 'ceramic-brussels:editing-locale';

function readStored(): LocaleId {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored ?? undefined)) return stored as LocaleId;
  } catch {
    // Private browsing or blocked storage - fall through to the default.
  }
  return DEFAULT_LOCALE;
}

let current: LocaleId = typeof window === 'undefined' ? DEFAULT_LOCALE : readStored();
const listeners = new Set<() => void>();

export function setEditingLocale(locale: LocaleId): void {
  if (locale === current) return;
  current = locale;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Not being able to remember the choice is not worth failing over.
  }
  for (const listener of listeners) listener();
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

const snapshot = () => current;

export function useEditingLocale(): LocaleId {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULT_LOCALE);
}
