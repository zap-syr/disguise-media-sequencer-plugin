import { effectiveGroup, effectiveLayer } from './planSchema';

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
 * @param groups    plan groups [{ id, ov, items }]
 * @param entries   { [entryId]: { mediaId, ov } }
 * @param details   getMediaDetails() result keyed by clip path
 * @param defaults  Plan defaults (Advanced) or the Simple settings shaped like them
 * Each group in the result: { id, start, end, rows: [{ id, start, duration }], starts, closing, values }
 * where `closing` = where a closing split goes (seq: the cursor, same: the group end).
 */
export function computePlanLayout(groups, entries, details, defaults) {
  let cursor = 0;
  let total = 0;
  const out = groups.map(g => {
    const values = effectiveGroup(defaults, g);
    const seq = values.timing !== 'same';
    const gStart = cursor;
    let t = gStart;
    let gEnd = gStart;
    const overlap = seq ? Math.max(0, Number(values.overlap) || 0) : 0;
    const rows = g.items.map(id => {
      const entry = entries[id];
      const d = clipSeconds(details[entry?.mediaId], effectiveLayer(values, entry));
      let start;
      if (seq) {
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
    return { id: g.id, start: gStart, end: gEnd, rows, starts, closing: seq ? t : gEnd, values };
  });
  return { groups: out, total };
}
