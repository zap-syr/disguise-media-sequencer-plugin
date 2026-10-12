import { reactive, nextTick, onMounted, onBeforeUnmount } from 'vue';

const GAP = 6;
const EDGE = 8;

/**
 * Placement and closing of a teleported popover pointing at an anchor (ChipPopover, CopyMappings):
 * below the anchor, flipped above when there is no room, kept on screen; closes on an outside
 * click, on Esc (focus goes back to the anchor) and when the anchor scrolls out of the plan list.
 *
 * anchor / keepOpenOn: getters of elements; popEl: ref of the popover element.
 * grow: room kept below for content that can get taller, so it never makes the popover flip.
 * ignoreOutside: selector of other floating layers whose clicks do not close it.
 * keepEsc(event): true when this Esc belongs to a control inside the popover.
 */
export function useAnchoredPopover({ anchor, keepOpenOn = () => null, popEl, onClose, grow = 0, ignoreOutside = '', keepEsc = () => false }) {
  const pos = reactive({ top: null, bottom: null, left: 0, arrow: 16, above: false });
  let side = null;   // 'below' | 'above', chosen when the popover opens or moves to another anchor

  function place() {
    const a = anchor();
    const pop = popEl.value;
    if (!a || !pop || !a.isConnected) return;
    const c = a.getBoundingClientRect();
    // The anchor scrolled out of the plan list: the popover would float detached, so close it
    const list = a.closest('.plan')?.getBoundingClientRect();
    if (list && (c.bottom < list.top || c.top > list.bottom)) { onClose(); return; }
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const left = Math.max(EDGE, Math.min(c.left, vw - w - EDGE));
    if (!side) {
      const roomBelow = vh - c.bottom - GAP - EDGE;
      const roomAbove = c.top - GAP - EDGE;
      side = h + grow > roomBelow && roomAbove > roomBelow ? 'above' : 'below';
    }
    const arrow = Math.max(12, Math.min(c.left + Math.min(c.width / 2, 24) - left, w - 16));
    // Above: pinned by its bottom edge, so a taller body grows upward and the popover stays put
    if (side === 'above') Object.assign(pos, { top: null, bottom: Math.max(EDGE, vh - c.top + GAP), left, above: true, arrow });
    else Object.assign(pos, { top: Math.max(EDGE, Math.min(c.bottom + GAP, vh - h - EDGE)), bottom: null, left, above: false, arrow });
  }

  /** Another anchor: choose the side again. */
  function resetSide() {
    side = null;
    nextTick(place);
  }

  function onOutside(event) {
    if (popEl.value?.contains(event.target) || keepOpenOn()?.contains(event.target)) return;
    if (ignoreOutside && event.target.closest?.(ignoreOutside)) return;
    onClose();
  }
  /** Esc closes the popover before the plan's own Esc runs. */
  function onEsc(event) {
    if (event.key !== 'Escape' || keepEsc(event)) return;
    event.stopPropagation();
    const back = anchor();
    onClose();
    back?.focus?.();
  }

  const opts = [['pointerdown', onOutside, true], ['keydown', onEsc, true], ['resize', place, false], ['scroll', place, true]];
  onMounted(() => {
    opts.forEach(([e, fn, cap]) => window.addEventListener(e, fn, cap));
    nextTick(place);
  });
  onBeforeUnmount(() => opts.forEach(([e, fn, cap]) => window.removeEventListener(e, fn, cap)));

  return { pos, place, resetSide };
}
