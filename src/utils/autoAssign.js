/**
 * Auto-assign mappings to plan layers on client data (docs §2.4, §5.4).
 *   name: the file name contains the mapping name (case-insensitive); the longest name wins.
 *   res : the file resolution equals the mapping resolution and exactly one mapping has it;
 *         several mappings with that resolution = ambiguous, the layer is skipped.
 * Name matching runs first; resolution is the fallback when the name rule is off or finds nothing.
 * Unmatched layers keep whatever mapping they had.
 */

/** "objects/videoclip/a/Cyc_Wash_sunrise.mov.apx" -> "cyc_wash_sunrise.mov" */
function fileName(clipPath) {
  return (clipPath || '').split('/').pop().replace(/\.apx$/i, '').toLowerCase();
}

/**
 * @param entryIds  ids of the layers in scope
 * @param entries   useLayerPlan().state.entries
 * @param mappings  getMappingList() result [{ path, name, res }]
 * @param details   getMediaDetails() result keyed by clip path ({ res })
 * @param rules     { byName, byRes }
 * @returns { assignments: [{ id, path, via }], stats: { total, byName, byRes, ambiguous, noMatch } }
 */
export function autoAssign(entryIds, entries, mappings, details, rules) {
  const named = mappings
    .filter(m => m.name)
    .map(m => ({ path: m.path, key: m.name.toLowerCase() }))
    .sort((a, b) => b.key.length - a.key.length);
  const byRes = {};
  mappings.forEach(m => { if (m.res) (byRes[m.res] || (byRes[m.res] = [])).push(m.path); });

  const stats = { total: entryIds.length, byName: 0, byRes: 0, ambiguous: 0, noMatch: 0 };
  const assignments = [];
  entryIds.forEach(id => {
    const entry = entries[id];
    if (!entry) return;
    if (rules.byName) {
      const name = fileName(entry.mediaId);
      const hit = named.find(m => name.includes(m.key));
      if (hit) {
        assignments.push({ id, path: hit.path, via: 'name' });
        stats.byName++;
        return;
      }
    }
    if (rules.byRes) {
      const candidates = byRes[details[entry.mediaId]?.res] || [];
      if (candidates.length === 1) {
        assignments.push({ id, path: candidates[0], via: 'res' });
        stats.byRes++;
        return;
      }
      if (candidates.length > 1) {
        stats.ambiguous++;
        return;
      }
    }
    stats.noMatch++;
  });
  return { assignments, stats };
}

/** "9 of 12 layers assigned - 4 by name, 5 by resolution, 2 skipped (...), 1 no match" */
export function autoAssignSummary(stats) {
  if (!stats.total) return 'Nothing to process in this scope.';
  const assigned = stats.byName + stats.byRes;
  const parts = [
    stats.byName ? `${stats.byName} by name` : null,
    stats.byRes ? `${stats.byRes} by resolution` : null,
    stats.ambiguous ? `${stats.ambiguous} skipped (several mappings share the resolution)` : null,
    stats.noMatch ? `${stats.noMatch} no match` : null
  ].filter(Boolean);
  const head = `${assigned} of ${stats.total} ${stats.total === 1 ? 'layer' : 'layers'} assigned`;
  return parts.length ? `${head} - ${parts.join(', ')}` : head;
}
