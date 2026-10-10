import { reactive, computed, watch } from 'vue';

/**
 * Selection of plan rows (entries). Click = only this row, Ctrl/Cmd = toggle,
 * Shift = range from the anchor across group boundaries (plan order), Ctrl+Shift = add range.
 */
export function usePlanSelection(planState) {
  const checked = reactive(new Set());
  let anchor = null;

  /** All entry ids in plan order (group by group). */
  const allIds = computed(() => planState.groups.flatMap(g => g.items));

  /** Selected ids in plan order (used for dragging and bulk actions). */
  const selectedIds = computed(() => allIds.value.filter(id => checked.has(id)));

  // Forget rows that left the plan
  watch(allIds, ids => {
    const alive = new Set(ids);
    [...checked].forEach(id => { if (!alive.has(id)) checked.delete(id); });
    if (anchor && !alive.has(anchor)) anchor = null;
  });

  function click(id, event) {
    const additive = event.ctrlKey || event.metaKey;
    if (event.shiftKey && anchor) {
      const ids = allIds.value;
      const a = ids.indexOf(anchor);
      const z = ids.indexOf(id);
      if (a >= 0 && z >= 0) {
        if (!additive) checked.clear();
        ids.slice(Math.min(a, z), Math.max(a, z) + 1).forEach(x => checked.add(x));
        return;
      }
    }
    if (additive) {
      if (checked.has(id)) checked.delete(id);
      else checked.add(id);
    } else {
      checked.clear();
      checked.add(id);
    }
    anchor = id;
  }

  /** Checkbox: toggles one row without touching the others. */
  function toggle(id) {
    if (checked.has(id)) checked.delete(id);
    else checked.add(id);
    anchor = id;
  }

  /** Select-all checkbox of a group: clears its rows if any are selected, otherwise selects them all. */
  function toggleGroup(group) {
    const any = group.items.some(id => checked.has(id));
    group.items.forEach(id => (any ? checked.delete(id) : checked.add(id)));
  }

  function clear() {
    checked.clear();
    anchor = null;
  }

  return { checked, selectedIds, click, toggle, toggleGroup, clear };
}
