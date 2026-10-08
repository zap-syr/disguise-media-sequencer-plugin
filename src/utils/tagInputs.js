/**
 * Input masks and validators for tag values typed in the settings panel.
 * Cue: X, X.Y or X.Y.Z (max 11 digits). MIDI: channel.note (max 6 digits).
 */

export function maskCueValue(raw) {
  const v = raw.replace(/[^0-9.]/g, '');
  let dotCount = 0;
  let stripped = '';
  for (const ch of v) {
    if (ch === '.') {
      if (dotCount < 2) { stripped += ch; dotCount++; }
    } else {
      stripped += ch;
    }
  }
  let result = '';
  let digits = 0;
  for (const ch of stripped) {
    if (ch === '.') { result += ch; }
    else if (digits < 11) { result += ch; digits++; }
  }
  return result;
}

export function isCueValueValid(value) {
  const val = value.replace(/\.$/, '');
  if (!val) return false;
  if (!/^\d+(\.\d+){0,2}$/.test(val)) return false;
  return val.replace(/\./g, '').length <= 11;
}

export function maskMidiValue(raw) {
  let v = raw.replace(/[^0-9.]/g, '');
  const di = v.indexOf('.');
  if (di !== -1) v = v.slice(0, di + 1) + v.slice(di + 1).replace(/\./g, '');
  let result = '', digits = 0;
  for (const ch of v) {
    if (ch === '.') { result += ch; }
    else if (digits < 6) { result += ch; digits++; }
  }
  return result;
}

export function isMidiValueValid(value) {
  if (!value) return false;
  if (!/^\d+(\.\d+)?$/.test(value)) return false;
  return value.replace('.', '').length <= 6;
}
