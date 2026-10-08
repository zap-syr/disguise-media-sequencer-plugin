/**
 * Colour tags for mappings (docs §7, Q7 default). Designer has no mapping colour, so each
 * mapping gets a stable colour from its path. The set differs in hue AND lightness so
 * neighbours stay distinguishable on the dark theme.
 */
export const MAPPING_COLORS = [
  '#0a84ff', '#30b0c7', '#34c759', '#a3d65c',
  '#ffd60a', '#ff9f0a', '#ff6b5a', '#ff375f',
  '#bf5af2', '#7d7aff', '#64d2ff', '#c9a27e'
];

/** Unassigned slot dot */
export const NO_MAPPING_COLOR = '#555555';

export function mappingColor(path) {
  if (!path) return NO_MAPPING_COLOR;
  let h = 0;
  for (let i = 0; i < path.length; i++) h = (h * 31 + path.charCodeAt(i)) >>> 0;
  return MAPPING_COLORS[h % MAPPING_COLORS.length];
}
