import { reactive } from 'vue';

/**
 * Colour tags for mappings (docs §7, Q7 default). Designer has no mapping colour, so the
 * plugin assigns one. Colours go out in the order of the project's (sorted) mapping list,
 * so up to 12 mappings never share a colour; with more, the set repeats. The set differs in
 * hue AND lightness so neighbours stay distinguishable on the dark theme.
 */
export const MAPPING_COLORS = [
  '#0a84ff', '#ffd60a', '#34c759', '#ff375f',
  '#30b0c7', '#ff9f0a', '#bf5af2', '#a3d65c',
  '#ff6b5a', '#64d2ff', '#7d7aff', '#c9a27e'
];

/** Unassigned slot dot */
export const NO_MAPPING_COLOR = '#555555';

// path -> colour for the current project; reactive so tags update after a Refresh
const palette = reactive({});

/** Call whenever the mapping list changes (load / refresh). */
export function setMappingPalette(mappings) {
  Object.keys(palette).forEach(key => delete palette[key]);
  mappings.forEach((m, i) => { palette[m.path] = MAPPING_COLORS[i % MAPPING_COLORS.length]; });
}

export function mappingColor(path) {
  if (!path) return NO_MAPPING_COLOR;
  if (palette[path]) return palette[path];
  // Mapping not in the current list (e.g. deleted in Designer): stable colour from its path
  let h = 0;
  for (let i = 0; i < path.length; i++) h = (h * 31 + path.charCodeAt(i)) >>> 0;
  return MAPPING_COLORS[h % MAPPING_COLORS.length];
}
