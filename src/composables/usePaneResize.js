import { ref, onBeforeUnmount } from 'vue';

export const clampWidth = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Drag-to-resize for a pane whose right edge has a handle (folder tree, Split files pane).
 * Call `startResize` from the handle's `pointerdown`: the pointer is captured, so the drag keeps
 * going outside the handle and over iframes of the page, and ends on release.
 *
 * width: a ref in px, written while dragging, clamped to [min, max].
 * getWidth(): the pane's rendered width at drag start (it can be narrower than `width` when the
 * window squeezes it); defaults to width.value.
 */
export function usePaneResize(width, { min, max, getWidth = () => width.value }) {
  const isResizing = ref(false);
  let handle = null;
  let startX = 0;
  let startWidth = 0;

  function onMove(event) {
    width.value = Math.round(clampWidth(startWidth + event.clientX - startX, min, max));
  }

  function stopResize() {
    if (!isResizing.value) return;
    isResizing.value = false;
    handle?.removeEventListener('pointermove', onMove);
    handle?.removeEventListener('pointerup', stopResize);
    handle?.removeEventListener('pointercancel', stopResize);
    handle = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  function startResize(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    handle = event.currentTarget;
    startX = event.clientX;
    startWidth = clampWidth(getWidth(), min, max);
    isResizing.value = true;
    handle.setPointerCapture(event.pointerId);
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', stopResize);
    handle.addEventListener('pointercancel', stopResize);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  /** Back to the widest size (double click on the handle). */
  function resetToMax() {
    width.value = max;
  }

  onBeforeUnmount(stopResize);

  return { isResizing, startResize, resetToMax };
}
