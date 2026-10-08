/**
 * Settings inheritance of the layer plan (docs §2.6):
 *   Plan defaults  ->  group overrides (group.ov)  ->  layer overrides (entry.ov)
 * An override equal to its parent value is never stored (normalisation), so the ◆ marker
 * only appears when a value really differs.
 */

export const PLAN_DEFAULTS = {
  timing: 'seq',     // 'seq' | 'same'
  overlap: 0,        // seconds, 'seq' only
  tag: 'file',       // 'file' | 'group'
  split: 'group',    // 'file' | 'group'
  mode: 'Normal',    // 'Normal' | 'Locked'
  end: 'Loop',       // 'Loop' | 'Ping-Pong' | 'Pause'
  bright: false,
  brightT: 1,        // fade time, seconds
  fit: true,
  movieDur: 30,      // seconds, when not fit
  stillDur: 5        // seconds
};

export const GROUP_KEYS = Object.keys(PLAN_DEFAULTS);
export const LAYER_KEYS = ['mode', 'end', 'bright', 'brightT', 'fit', 'movieDur', 'stillDur'];
const NUMERIC_KEYS = new Set(['overlap', 'brightT', 'movieDur', 'stillDur']);
const BOOLEAN_KEYS = new Set(['bright', 'fit']);

/** The settings chips; linked keys are edited and reset together. */
export const CHIPS = [
  { key: 'start', label: 'Start', title: 'Layers start', keys: ['timing', 'overlap'], groupOnly: true },
  { key: 'tags', label: 'Tags', title: 'Tags placement', keys: ['tag'], groupOnly: true },
  { key: 'split', label: 'Split', title: 'Split section placement', keys: ['split'], groupOnly: true },
  { key: 'mode', label: 'Mode', title: 'Mode', keys: ['mode'] },
  { key: 'end', label: 'End', title: 'At end point', keys: ['end'] },
  { key: 'fade', label: 'Fade', title: 'Animate brightness', keys: ['bright', 'brightT'] },
  { key: 'length', label: 'Length', title: 'Layer duration', keys: ['fit', 'movieDur', 'stillDur'] }
];

/** Coerces a value coming from an input to the key's type. */
export function coerce(key, value) {
  if (NUMERIC_KEYS.has(key)) return Math.max(0, Number(value) || 0);
  if (BOOLEAN_KEYS.has(key)) return value === true || value === 'true';
  return value;
}

export function sameValue(key, a, b) {
  return coerce(key, a) === coerce(key, b);
}

export function effectiveGroup(planDefaults, group) {
  return { ...planDefaults, ...(group?.ov || {}) };
}

export function effectiveLayer(groupValues, entry) {
  const out = {};
  LAYER_KEYS.forEach(k => { out[k] = groupValues[k]; });
  return Object.assign(out, entry?.ov || {});
}

/** Drops overrides that equal their parent value, in place. */
export function pruneOverrides(ov, parent) {
  Object.keys(ov).forEach(k => { if (sameValue(k, ov[k], parent[k])) delete ov[k]; });
}

export function hasOverrides(obj) {
  return !!obj?.ov && Object.keys(obj.ov).length > 0;
}

/** Short value shown on a chip. `globals` = { tagsOn, splitOn } from the right panel. */
export function chipValue(chipKey, v, globals = {}) {
  switch (chipKey) {
    case 'start': return v.timing === 'same' ? 'All at once' : `One after another${Number(v.overlap) ? `, -${v.overlap}s` : ''}`;
    case 'tags': return globals.tagsOn ? (v.tag === 'group' ? 'Group start' : 'Each file') : 'Off';
    case 'split': return globals.splitOn ? (v.split === 'group' ? 'Group start' : 'Each file') : 'Off';
    case 'mode': return v.mode;
    case 'end': return v.end;
    case 'fade': return v.bright ? `${v.brightT}s` : 'Off';
    case 'length': return `${v.fit ? 'Fit' : `${v.movieDur}s`}, still ${v.stillDur}s`;
    default: return '';
  }
}

/** Human list of a layer's overrides for the ◆ tooltip; `values` = the layer's effective values. */
export function describeOverrides(ov, values) {
  return CHIPS.filter(c => c.keys.some(k => k in ov))
    .map(c => `${c.title}: ${chipValue(c.key, values, { tagsOn: true, splitOn: true })}`)
    .join('; ');
}
