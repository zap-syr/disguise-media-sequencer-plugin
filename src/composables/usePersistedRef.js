import { ref, watch } from 'vue';

// Reads a stored value from localStorage, running it through `parse`. `parse`
// returns the usable value, or `undefined` to signal "invalid/unusable" and
// fall back. Missing keys (stored === null) always fall back without calling
// `parse`, so `parse` never has to special-case null itself.
export function readStored(key, fallback, parse) {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    const parsed = parse(stored);
    return parsed === undefined ? fallback : parsed;
  } catch (e) {
    return fallback;
  }
}

/** A ref initialised from localStorage and written back on every change (per-viewer UI prefs). */
export function usePersistedRef(key, fallback, parse) {
  const value = ref(readStored(key, fallback, parse));
  watch(value, newValue => {
    try {
      localStorage.setItem(key, newValue);
    } catch (e) {
      // localStorage unavailable in this context — ignore
    }
  });
  return value;
}
