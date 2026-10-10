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
  { key: 'tags', label: 'Tags', title: 'Tags', keys: ['tag'], groupOnly: true },
  { key: 'split', label: 'Split', title: 'Split section', keys: ['split'], groupOnly: true },
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

// --- Saved plan (docs §6.4, Q6) ---

/** Bump when the stored shape changes; an older saved plan is then reset. */
export const PLAN_SCHEMA_VERSION = 1;

function cleanValues(ov, keys) {
  const out = {};
  if (ov && typeof ov === 'object') keys.forEach(k => { if (k in ov) out[k] = coerce(k, ov[k]); });
  return out;
}

/** The plan state (Plan defaults, groups, entries) as a JSON string for localStorage. */
export function serializePlan(state) {
  return JSON.stringify({ v: PLAN_SCHEMA_VERSION, plan: state.plan, groups: state.groups, entries: state.entries });
}

/**
 * Parses a saved plan back into { plan, groups, entries }, or null when the JSON is broken
 * or from another schema version. Unknown keys are dropped; rows whose entry is gone and
 * entries no group holds are dropped too.
 */
export function parsePlan(text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { return null; }
  if (!data || data.v !== PLAN_SCHEMA_VERSION || !Array.isArray(data.groups) || !data.entries || typeof data.entries !== 'object') return null;

  const entries = {};
  Object.entries(data.entries).forEach(([id, e]) => {
    if (!e || typeof e.mediaId !== 'string') return;
    entries[id] = {
      mediaId: e.mediaId,
      mappingPath: typeof e.mappingPath === 'string' ? e.mappingPath : null,
      via: e.via === 'name' || e.via === 'res' ? e.via : null,
      ov: cleanValues(e.ov, LAYER_KEYS)
    };
  });

  const groups = data.groups.filter(g => g && typeof g.id === 'string').map(g => ({
    id: g.id,
    name: String(g.name ?? ''),
    open: g.open !== false,
    scope: g.scope === 'group' ? 'group' : 'auto',
    ov: cleanValues(g.ov, GROUP_KEYS),
    items: (Array.isArray(g.items) ? g.items : []).filter(id => entries[id]),
    sourceFolder: g.sourceFolder && typeof g.sourceFolder.id === 'string'
      ? { id: g.sourceFolder.id, content: g.sourceFolder.content }
      : null
  }));

  const held = new Set(groups.flatMap(g => g.items));
  Object.keys(entries).forEach(id => { if (!held.has(id)) delete entries[id]; });

  return { plan: { ...PLAN_DEFAULTS, ...cleanValues(data.plan, GROUP_KEYS) }, groups, entries };
}

/**
 * Short value shown on a chip; it has to fit an equal-width chip column (docs §2.5.1).
 * `globals` = { tagsOn, splitOn } from the right panel.
 */
export function chipValue(chipKey, v, globals = {}) {
  switch (chipKey) {
    case 'start': return v.timing === 'same' ? 'All at once' : (Number(v.overlap) ? `Overlap ${v.overlap}s` : 'In order');
    case 'tags': return globals.tagsOn ? (v.tag === 'group' ? 'Group start' : 'Each file') : 'Off';
    case 'split': return globals.splitOn ? (v.split === 'group' ? 'Group start' : 'Each file') : 'Off';
    case 'mode': return v.mode;
    case 'end': return v.end;
    case 'fade': return v.bright ? `${v.brightT}s` : 'Off';
    case 'length': return v.fit ? 'Fit' : `${v.movieDur}s`;
    default: return '';
  }
}

/** Full value for tooltips and the ◆ row hint (the chip shows the short one). */
export function chipLongValue(chipKey, v, globals = {}) {
  switch (chipKey) {
    case 'start': return v.timing === 'same' ? 'All at once' : `In order${Number(v.overlap) ? `, overlap ${v.overlap}s` : ''}`;
    case 'fade': return v.bright ? `Fade in ${v.brightT}s` : 'Off';
    case 'length': return `${v.fit ? 'Fit to contents' : `Fixed ${v.movieDur}s`}, still images ${v.stillDur}s`;
    default: return chipValue(chipKey, v, globals);
  }
}

/** A setting that would give layers zero length (shown as a red dot on the chip). */
export function chipWarning(chipKey, v) {
  if (chipKey !== 'length') return '';
  if (!v.fit && !(Number(v.movieDur) > 0)) return 'Fixed length is 0s: videos get zero-length layers';
  if (!(Number(v.stillDur) > 0)) return 'Still images duration is 0s: stills get zero-length layers';
  return '';
}

/** Human list of a layer's overrides for the ◆ tooltip; `values` = the layer's effective values. */
export function describeOverrides(ov, values) {
  return CHIPS.filter(c => c.keys.some(k => k in ov))
    .map(c => `${c.title}: ${chipLongValue(c.key, values, { tagsOn: true, splitOn: true })}`)
    .join('; ');
}
