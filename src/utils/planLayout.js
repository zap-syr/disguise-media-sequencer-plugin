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
 * @param isMissing clip path -> true when the clip is gone from the project; such rows get zero
 *                  length and place nothing, like plan_prepare.py skipping a clip it cannot load
 * Each group in the result: { id, start, end, rows: [{ id, start, duration, missing }], starts, closing, values, last }
 * where `starts` = starts of the placed (not missing) rows, `closing` = where a closing split
 * goes (seq: the cursor, same: the group end) and `last` = the last group that places layers.
 */
export function computePlanLayout(groups, entries, details, defaults, isMissing = () => false) {
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
      if (isMissing(entry?.mediaId)) return { id, start: seq ? t : gStart, duration: 0, missing: true };
      const d = clipSeconds(details[entry?.mediaId], effectiveLayer(values, entry));
      let start;
      if (seq) {
        start = t;
        t = Math.max(gStart, t + d - overlap);
      } else {
        start = gStart;
      }
      gEnd = Math.max(gEnd, start + d);
      return { id, start, duration: d, missing: false };
    });
    const starts = [...new Set(rows.filter(r => !r.missing).map(r => r.start))];
    cursor = gEnd;
    total = Math.max(total, gEnd);
    return { id: g.id, start: gStart, end: gEnd, rows, starts, closing: seq ? t : gEnd, values, last: false };
  });
  const lastPlaced = out.filter(g => g.starts.length).pop();
  if (lastPlaced) lastPlaced.last = true;
  return { groups: out, total };
}

/**
 * Marker times of one layout group, same placement rules as plan_prepare.py:
 * split 'file' = every start + the closing split, 'group' = the group start (+ the group end
 * for the last group); tag 'file' = every unique start, 'group' = the group start.
 * Groups with no placed rows place nothing.
 */
export function groupMarkerTimes(group) {
  if (!group.starts.length) return { splits: [], tags: [] };
  const { start, end, starts, closing, values, last } = group;
  return {
    splits: values.split === 'file' ? [...new Set([...starts, closing])] : (last ? [start, end] : [start]),
    tags: values.tag === 'file' ? starts : [start]
  };
}

/**
 * What Create will place on the timeline: { splits, tags: { tc, cue, midi } } counts.
 * Splits are deduplicated across groups (a group start can close the previous group);
 * tags are not (plan_prepare.py places one per position per tag type).
 * `on` = { split, tc, cue, midi } global switches from the settings panel.
 */
export function countMarkers(layout, on) {
  const splitTimes = new Set();
  let tagCount = 0;
  layout.groups.forEach(g => {
    const m = groupMarkerTimes(g);
    m.splits.forEach(t => splitTimes.add(Math.round(t * 1000)));
    tagCount += m.tags.length;
  });
  return {
    splits: on.split ? splitTimes.size : 0,
    tags: { tc: on.tc ? tagCount : 0, cue: on.cue ? tagCount : 0, midi: on.midi ? tagCount : 0 }
  };
}

/** "3 splits, 5 cue tags" parts of countMarkers(); empty when nothing is placed. */
export function describeMarkers(m) {
  const n = (count, one, many) => `${count} ${count === 1 ? one : many}`;
  return [
    m.splits ? n(m.splits, 'split', 'splits') : null,
    m.tags.tc ? n(m.tags.tc, 'TC tag', 'TC tags') : null,
    m.tags.cue ? n(m.tags.cue, 'cue tag', 'cue tags') : null,
    m.tags.midi ? n(m.tags.midi, 'MIDI tag', 'MIDI tags') : null
  ].filter(Boolean);
}
