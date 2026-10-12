<template>
  <button
    type="button"
    class="schip"
    :class="{ ov: !!chip.ov, off: chip.off, mixed: chip.mixed, open, scope }"
    :title="chip.tip"
    aria-haspopup="dialog"
    :aria-expanded="open"
  >
    <span class="schip-k">{{ chip.label }}</span>
    <span class="schip-v">{{ chip.value }}</span>
    <!-- Corner marks are absolute, so they never change the chip width -->
    <span class="corner" aria-hidden="true">
      <span v-if="chip.warn" class="warn-dot"></span>
      <span v-if="chip.count" class="ov-count">◆ {{ chip.count }}</span>
      <span v-else-if="chip.ov" class="ov-mark">◆</span>
    </span>
  </button>
</template>

<script setup>
/**
 * One setting chip (docs §2.5.1): key on top, short value below, ◆ / "◆ N" / red dot in the corner.
 * chip = { key, label, value, tip, ov, off, mixed, warn, count }
 */
defineProps({
  chip: { type: Object, required: true },
  open: { type: Boolean, default: false },
  scope: { type: Boolean, default: false }   // the chips edit the selected layers
});
</script>

<style scoped>
* { box-sizing: border-box; }

.schip {
  position: relative;
  width: 100%; min-width: 0; height: 36px; padding: 3px 8px;
  display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 1px;
  border: 1px solid #444444; border-radius: 6px; background: #2c2c2c;
  text-align: left; cursor: pointer; font: inherit;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}
.schip:hover { border-color: #6a6a6a; }
.schip:focus-visible { outline: none; box-shadow: 0 0 0 2px #0a84ff; }
.schip-k {
  max-width: calc(100% - 14px);
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #aeaeae;
  line-height: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.schip-v {
  max-width: 100%;
  font-size: 12px; font-weight: 500; color: #ffffff; line-height: 16px;
  font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.corner { position: absolute; top: 3px; right: 5px; display: flex; align-items: center; gap: 4px; pointer-events: none; }
.ov-mark { color: #ffd60a; font-size: 9px; line-height: 1; }
.ov-count { color: #ffd60a; font-size: 9px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
.warn-dot { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; }

.schip.scope { border-color: rgba(10, 132, 255, 0.45); background: rgba(10, 132, 255, 0.10); }
.schip.ov { border-color: rgba(255, 214, 10, 0.55); }
.schip.ov .schip-v { color: #ffd60a; }
.schip.mixed .schip-v { font-style: italic; color: #888888; }
.schip.off .schip-v { color: #888888; text-decoration: line-through; }
.schip.open { border-color: #0a84ff; box-shadow: 0 0 0 1px #0a84ff; }
</style>
