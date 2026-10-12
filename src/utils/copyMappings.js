/**
 * Copy mappings from one group to others by position (docs Phase 13).
 * Source layer 1 goes to target layer 1, 2 to 2, and so on. A source layer without mapping
 * leaves its target layer unchanged; the copy never clears a mapping.
 */

/**
 * What each target layer gets, in order: a mapping path, or null when it does not change.
 * pattern: source mapping paths in plan order (null = no mapping).
 * repeat: false = Stop (layers past the pattern keep theirs), true = the pattern repeats.
 */
export function copyResult(pattern, count, repeat = false) {
  const n = pattern.length;
  return Array.from({ length: count }, (_, i) => {
    if (!n || (!repeat && i >= n)) return null;
    return pattern[i % n] || null;
  });
}

/** Layers whose mapping really changes: [{ id, mappingPath }]. */
export function copyChanges(pattern, targetIds, entries, repeat = false) {
  const result = copyResult(pattern, targetIds.length, repeat);
  return targetIds
    .map((id, i) => ({ id, mappingPath: result[i] }))
    .filter(c => c.mappingPath && entries[c.id] && entries[c.id].mappingPath !== c.mappingPath);
}
