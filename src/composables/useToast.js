import { ref } from 'vue';

/** A single transient status message (replaces alert()). kind: 'info' | 'error'. */
export function useToast(durationMs = 2600) {
  const toast = ref(null);
  let timer = null;

  function show(text, kind = 'info') {
    clearTimeout(timer);
    toast.value = { text, kind };
    timer = setTimeout(() => { toast.value = null; }, kind === 'error' ? durationMs * 2 : durationMs);
  }

  function dismiss() {
    clearTimeout(timer);
    toast.value = null;
  }

  return { toast, show, dismiss };
}
