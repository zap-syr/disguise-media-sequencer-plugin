<template>
  <div class="pdbox" role="region" aria-label="Plan defaults">
    <div class="pd-head">
      <span class="pd-title">PLAN DEFAULTS</span>
      <span class="hint">Every group inherits these values. Values changed on a group or a layer are marked ◆.</span>
    </div>
    <div class="pd-grid">
      <div v-for="chip in CHIPS" :key="chip.key" class="pd-item">
        <span class="pd-lbl">{{ chip.title }}</span>
        <SettingEditor :chip-key="chip.key" :values="plan" :globals="globals" @patch="p => $emit('patch', p)" />
      </div>
    </div>
    <div class="pd-foot">
      <span class="hint">{{ statsText }}</span>
      <div class="spacer"></div>
      <button type="button" class="ghost" :disabled="!stats.groupValues && !stats.layers" @click="$emit('reset-all')">Reset all overrides</button>
      <button type="button" class="primary" @click="$emit('close')">Done</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { CHIPS } from '../../utils/planSchema';
import SettingEditor from './SettingEditor.vue';

const props = defineProps({
  plan: { type: Object, required: true },     // useLayerPlan().state.plan
  stats: { type: Object, required: true },    // useLayerPlan().overrideStats
  globals: { type: Object, default: () => ({ tagsOn: true, splitOn: true }) }
});
defineEmits(['patch', 'reset-all', 'close']);

const statsText = computed(() => {
  const g = props.stats.groupValues;
  const l = props.stats.layers;
  if (!g && !l) return 'No group or layer overrides these defaults.';
  return `${g} group ${g === 1 ? 'value' : 'values'} and ${l} ${l === 1 ? 'layer' : 'layers'} currently override these defaults.`;
});
</script>

<style scoped>
* { box-sizing: border-box; }

.pdbox {
  margin: 10px 14px 0;
  padding: 12px 14px;
  border: 1px solid #333333;
  border-radius: 6px;
  background: #242424;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}
.pd-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px 12px; }
.pd-title { font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #0a84ff; }
.hint { font-size: 11px; color: #888888; }
.pd-grid { display: flex; flex-wrap: wrap; gap: 12px 24px; }
.pd-item { display: flex; flex-direction: column; gap: 6px; }
.pd-lbl { font-size: 11px; color: #aaaaaa; font-weight: 600; }
.pd-foot { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding-top: 10px; border-top: 1px solid #333333; }
.spacer { flex: 1; }

.ghost {
  background: transparent; border: 1px solid #333333; color: #aaaaaa;
  border-radius: 6px; padding: 6px 10px; font-size: 12px; cursor: pointer; transition: all 0.2s ease;
}
.ghost:hover:not(:disabled) { border-color: #555555; color: #ffffff; background: #1f1f1f; }
.ghost:disabled { opacity: 0.35; cursor: not-allowed; }
.primary {
  background: #0a84ff; border: none; color: #ffffff; border-radius: 6px;
  padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.2s ease;
}
.primary:hover { background: #0060d1; }
</style>
