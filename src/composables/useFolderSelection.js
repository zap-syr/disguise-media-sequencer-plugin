import { reactive, watch } from 'vue';

/**
 * Multi-selection of folders in the tree (docs §2.3.2), separate from navigation:
 * a plain click still opens a folder; Ctrl/Cmd toggles, Shift selects a range of visible rows,
 * the checkbox toggles one folder. "All Files" can't be checked.
 * `visibleRef` = the sidebar rows (visibleFolders()); `allIdsRef` = every folder id in the tree.
 */
export function useFolderSelection(visibleRef, allIdsRef) {
  const checked = reactive(new Set());
  let anchor = null;

  // Drop ids that no longer exist after a Refresh
  watch(allIdsRef, ids => {
    const alive = new Set(ids);
    [...checked].forEach(id => { if (!alive.has(id)) checked.delete(id); });
  });

  function toggle(id) {
    if (id === 'all') return;
    if (checked.has(id)) checked.delete(id);
    else checked.add(id);
    anchor = id;
  }

  /** Returns true when the click was a selection gesture (Ctrl/Cmd/Shift), false = navigate. */
  function click(id, event) {
    if (id === 'all') return false;
    if (event.shiftKey && anchor) {
      const rows = visibleRef.value.map(r => r.id).filter(x => x !== 'all');
      const a = rows.indexOf(anchor);
      const z = rows.indexOf(id);
      if (a >= 0 && z >= 0) {
        if (!(event.ctrlKey || event.metaKey)) checked.clear();
        rows.slice(Math.min(a, z), Math.max(a, z) + 1).forEach(x => checked.add(x));
        return true;
      }
    }
    if (event.ctrlKey || event.metaKey) {
      toggle(id);
      return true;
    }
    return false;
  }

  function clear() {
    checked.clear();
    anchor = null;
  }

  return { checked, toggle, click, clear };
}
