import { ref } from 'vue';

/** A single transient status message (replaces alert()). kind: 'info' | 'error'. */
export function useToast(durationMs = 2600) {
  const toast = ref(null);
  let timer = null;

  /** action: optional { label, fn } button, e.g. Undo; toasts with an action stay longer. */
  function show(text, kind = 'info', action = null) {
    clearTimeout(timer);
    toast.value = { text, kind, action };
    // Undo-style actions need time to reach the button; errors need time to read
    const ms = action ? durationMs * 3 : kind === 'error' ? durationMs * 2 : durationMs;
    timer = setTimeout(() => { toast.value = null; }, ms);
  }

  function dismiss() {
    clearTimeout(timer);
    toast.value = null;
  }

  return { toast, show, dismiss };
}
