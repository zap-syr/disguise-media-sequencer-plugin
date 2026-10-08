import { reactive, computed } from 'vue';

/**
 * Advanced-mode layer plan: ordered groups of entries (one entry = one future layer).
 * An entry references a clip by path, so the same clip can appear several times.
 * Group settings beyond `timing` (inheritance, chips) arrive in Phase 7.
 */
export function useLayerPlan() {
  const state = reactive({
    groups: [],   // [{ id, name, open, timing: 'seq'|'same', items: [entryId] }]
    entries: {}   // { [entryId]: { mediaId: clipPath, mappingPath: null, via: null, ov: {} } }
  });

  let nextGroup = 1;
  let nextEntry = 1;

  const layerCount = computed(() => state.groups.reduce((n, g) => n + g.items.length, 0));

  function makeEntries(paths) {
    return paths.map(mediaId => {
      const id = `e${nextEntry++}`;
      state.entries[id] = { mediaId, mappingPath: null, via: null, ov: {} };
      return id;
    });
  }

  function addEmptyGroup(name) {
    const group = { id: `g${nextGroup++}`, name: name || `Group ${state.groups.length + 1}`, open: true, timing: 'seq', items: [] };
    state.groups.push(group);
    return group.id;
  }

  function newGroup(paths, name) {
    const gid = addEmptyGroup(name);
    addToGroup(gid, paths);
    return gid;
  }

  function addToGroup(gid, paths) {
    const group = state.groups.find(g => g.id === gid);
    if (!group) return;
    group.items.push(...makeEntries(paths));
    group.open = true;
  }

  function removeEntry(gid, entryId) {
    const group = state.groups.find(g => g.id === gid);
    if (!group) return;
    group.items = group.items.filter(id => id !== entryId);
    delete state.entries[entryId];
  }

  /** Removes a group; returns a restore() for the Undo toast. */
  function removeGroup(gid) {
    const index = state.groups.findIndex(g => g.id === gid);
    if (index < 0) return () => {};
    const [group] = state.groups.splice(index, 1);
    const saved = Object.fromEntries(group.items.map(id => [id, state.entries[id]]));
    group.items.forEach(id => delete state.entries[id]);
    return () => {
      Object.assign(state.entries, saved);
      state.groups.splice(Math.min(index, state.groups.length), 0, group);
    };
  }

  function updateGroup(gid, patch) {
    const group = state.groups.find(g => g.id === gid);
    if (group) Object.assign(group, patch);
  }

  function setAllOpen(open) {
    state.groups.forEach(g => { g.open = open; });
  }

  /** clipPath -> ['G1', 'G3'] for the badges on file cards. */
  const groupLabelsByMedia = computed(() => {
    const map = {};
    state.groups.forEach((g, gi) => {
      const label = `G${gi + 1}`;
      g.items.forEach(id => {
        const mediaId = state.entries[id]?.mediaId;
        if (!mediaId) return;
        const list = map[mediaId] || (map[mediaId] = []);
        if (!list.includes(label)) list.push(label);
      });
    });
    return map;
  });

  return {
    state, layerCount, groupLabelsByMedia,
    addEmptyGroup, newGroup, addToGroup, removeEntry, removeGroup, updateGroup, setAllOpen
  };
}
