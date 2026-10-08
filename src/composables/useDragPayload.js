import { reactive } from 'vue';

/**
 * One drag at a time inside the plugin (docs §4.5). The payload lives here instead of
 * dataTransfer so every drop target can react while dragging (highlighting slots, headers).
 * kind: 'mapping' | 'files' | 'rows' | 'folders'
 */
export const dragPayload = reactive({ kind: null, ids: [] });

export function startDrag(event, kind, ids) {
  dragPayload.kind = kind;
  dragPayload.ids = ids;
  if (event?.dataTransfer) {
    // Firefox needs data to start a drag; the real payload is dragPayload
    event.dataTransfer.setData('text/plain', `${kind}:${ids.join(',')}`);
    event.dataTransfer.effectAllowed = kind === 'rows' ? 'move' : 'copy';
  }
}

export function endDrag() {
  dragPayload.kind = null;
  dragPayload.ids = [];
}
