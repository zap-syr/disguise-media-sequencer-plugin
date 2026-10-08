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

  /**
   * Inserts several groups at `index` (null = end). defs: [{ name, paths, sourceFolder }].
   * sourceFolder ({ id, content }) is kept for a future "sync with folder" (docs §11 Q13).
   * Returns the new group ids.
   */
  function insertGroups(defs, index = null) {
    const created = defs.map(def => ({
      id: `g${nextGroup++}`,
      name: def.name,
      open: true,
      timing: 'seq',
      items: makeEntries(def.paths),
      sourceFolder: def.sourceFolder || null
    }));
    const at = index == null ? state.groups.length : Math.max(0, Math.min(index, state.groups.length));
    state.groups.splice(at, 0, ...created);
    return created.map(g => g.id);
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

  /** Removes entries from whatever groups hold them; returns a restore() for the Undo toast. */
  function removeEntries(entryIds) {
    const set = new Set(entryIds);
    const itemsBefore = state.groups.map(g => ({ id: g.id, items: [...g.items] }));
    const saved = Object.fromEntries(entryIds.map(id => [id, state.entries[id]]));
    state.groups.forEach(g => { g.items = g.items.filter(id => !set.has(id)); });
    entryIds.forEach(id => delete state.entries[id]);
    return () => {
      Object.assign(state.entries, saved);
      itemsBefore.forEach(({ id, items }) => {
        const group = state.groups.find(g => g.id === id);
        if (group) group.items = items.filter(x => state.entries[x]);
      });
    };
  }

  /** Puts ids into group `gid` before/after `targetId` (null = append). */
  function insertIds(gid, ids, targetId, pos) {
    const group = state.groups.find(g => g.id === gid);
    if (!group) return;
    const at = targetId ? group.items.indexOf(targetId) : -1;
    if (at < 0) group.items.push(...ids);
    else group.items.splice(pos === 'after' ? at + 1 : at, 0, ...ids);
    group.open = true;
  }

  /**
   * Moves entries (keeping their relative order) into group `gid` before/after `targetId`.
   * Dropping a selection onto one of its own rows is a no-op.
   */
  function moveEntries(entryIds, gid, targetId, pos) {
    if (targetId && entryIds.includes(targetId)) return;
    const set = new Set(entryIds);
    state.groups.forEach(g => { g.items = g.items.filter(id => !set.has(id)); });
    insertIds(gid, entryIds, targetId, pos);
  }

  /** New entries for clip paths, inserted into group `gid` before/after `targetId` (null = append). */
  function insertFiles(paths, gid, targetId, pos) {
    insertIds(gid, makeEntries(paths), targetId, pos);
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

  // --- Mappings (Phase 5) ---

  /** via: null for manual assignment, 'name' | 'res' for auto-assign (Phase 8). */
  function assign(entryIds, mappingPath, via = null) {
    entryIds.forEach(id => {
      const entry = state.entries[id];
      if (entry) Object.assign(entry, { mappingPath, via });
    });
  }

  function assignGroup(gid, mappingPath) {
    const group = state.groups.find(g => g.id === gid);
    if (group) assign(group.items, mappingPath);
  }

  /** scope: 'all' | group id | array of entry ids */
  function clearMappings(scope) {
    let ids;
    if (scope === 'all') ids = Object.keys(state.entries);
    else if (Array.isArray(scope)) ids = scope;
    else ids = state.groups.find(g => g.id === scope)?.items || [];
    assign(ids, null);
  }

  const unmappedCount = computed(() =>
    state.groups.reduce((n, g) => n + g.items.filter(id => !state.entries[id]?.mappingPath).length, 0));

  /** mappingPath -> number of plan layers using it */
  const mappingUsage = computed(() => {
    const usage = {};
    state.groups.forEach(g => g.items.forEach(id => {
      const path = state.entries[id]?.mappingPath;
      if (path) usage[path] = (usage[path] || 0) + 1;
    }));
    return usage;
  });

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
    state, layerCount, groupLabelsByMedia, unmappedCount, mappingUsage,
    addEmptyGroup, newGroup, insertGroups, addToGroup, removeEntry, removeEntries, moveEntries, insertFiles,
    removeGroup, updateGroup, setAllOpen,
    assign, assignGroup, clearMappings
  };
}
