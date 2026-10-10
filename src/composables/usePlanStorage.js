import { watch, onUnmounted } from 'vue';
import { readStored } from './usePersistedRef';
import { parsePlan, serializePlan } from '../utils/planSchema';

/**
 * Keeps the layer plan in localStorage under `key` (one per director, docs §6.4, Q6):
 * restored once here, then saved debounced on every change and on page hide.
 * Returns true when a saved plan was unusable (broken JSON, other schema version) and was reset.
 */
export function usePlanStorage(plan, key, delayMs = 400) {
  // undefined = nothing saved, null = unusable, object = the saved plan
  const saved = readStored(key, undefined, parsePlan);
  if (saved) plan.load(saved);
  else if (saved === null) {
    try { localStorage.removeItem(key); } catch (e) { /* localStorage unavailable */ }
  }

  let timer = null;
  function save() {
    clearTimeout(timer);
    timer = null;
    try {
      localStorage.setItem(key, serializePlan(plan.state));
    } catch (e) {
      // localStorage unavailable or full, the plan just isn't kept
    }
  }
  const flush = () => { if (timer) save(); };

  watch(() => plan.state, () => {
    clearTimeout(timer);
    timer = setTimeout(save, delayMs);
  }, { deep: true });

  window.addEventListener('pagehide', flush);
  onUnmounted(() => {
    flush();
    window.removeEventListener('pagehide', flush);
  });

  return saved === null;
}
