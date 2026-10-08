/**
 * Approximate time layout of the plan in SECONDS for the UI preview (docs §2.7).
 * Designer converts to track beats; with BPM changes the real result can differ slightly.
 *
 *   seq : start = cursor; cursor = max(gStart, start + d - overlap)
 *   same: every layer starts at gStart
 *   group end = end of its longest layer; the next group starts there.
 */

/** Seconds a clip occupies, same rule as plan_prepare.py (live inputs use the still duration). */
export function clipSeconds(details, settings) {
  if (details && details.kind === 'video') {
    return settings.fit && details.duration ? details.duration : Number(settings.movieDur) || 0;
  }
  return Number(settings.stillDur) || 0;
}

/**
 * @param groups   plan groups [{ id, timing, items }]
 * @param entries  { [entryId]: { mediaId } }
 * @param details  getMediaDetails() result keyed by clip path
 * @param settings { fit, movieDur, stillDur, overlap } (Phase 4: from the settings panel)
 */
export function computePlanLayout(groups, entries, details, settings) {
  let cursor = 0;
  let total = 0;
  const out = groups.map(g => {
    const gStart = cursor;
    let t = gStart;
    let gEnd = gStart;
    const overlap = g.timing === 'seq' ? Math.max(0, Number(settings.overlap) || 0) : 0;
    const rows = g.items.map(id => {
      const d = clipSeconds(details[entries[id]?.mediaId], settings);
      let start;
      if (g.timing === 'seq') {
        start = t;
        t = Math.max(gStart, t + d - overlap);
      } else {
        start = gStart;
      }
      gEnd = Math.max(gEnd, start + d);
      return { id, start, duration: d };
    });
    const starts = [...new Set(rows.map(r => r.start))];
    cursor = gEnd;
    total = Math.max(total, gEnd);
    return { id: g.id, start: gStart, end: gEnd, rows, starts };
  });
  return { groups: out, total };
}
