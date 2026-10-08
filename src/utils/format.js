/** Short human duration: 15s, 1m 05s, 1h 02m. */
export function formatDuration(seconds) {
  if (seconds == null || !isFinite(seconds)) return '';
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}
