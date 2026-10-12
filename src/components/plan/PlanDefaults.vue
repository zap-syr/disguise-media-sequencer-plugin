<template>
  <div class="pdbox" role="dialog" aria-label="Plan defaults">
    <div class="pd-head">
      <span class="pd-title">Plan defaults</span>
      <span class="pd-tag">All groups</span>
      <span class="hint">Every group starts from these values</span>
      <button type="button" class="pd-x" aria-label="Close Plan defaults" title="Close (Esc)" @click="$emit('close')">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="pd-body">
      <ChipRow ref="chipRow" :chips="chips" :open-key="openChip" @open="toggleChip" />
    </div>
    <div class="pd-foot">
      <span class="hint" :class="{ warm: total }">{{ statsText }}</span>
      <button type="button" class="quiet" :disabled="!total" @click="$emit('reset-all')">Reset all overrides</button>
    </div>

    <ChipPopover
      v-if="openSpec"
      :anchor="chipRow?.anchorOf(openChip)"
      :keep-open-on="chipRow?.rowEl"
      :chip-key="openSpec.key"
      :values="plan"
      :globals="globals"
      tag="All groups"
      :reset="{ enabled: !isBuiltIn(openSpec), tip: 'Back to the built-in value' }"
      :secondary="{
        label: openSpec.count ? `Clear ${openSpec.count} ${openSpec.count === 1 ? 'override' : 'overrides'}` : 'No overrides',
        disabled: !openSpec.count,
        icon: 'clear',
        tip: 'Removes this setting from every group and layer that sets its own value, so they all use the Plan default'
      }"
      @patch="p => $emit('patch', p)"
      @reset="$emit('reset-keys', openSpec.keys)"
      @secondary="$emit('clear-overrides', openSpec.keys)"
      @close="openChip = null"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { CHIPS, PLAN_DEFAULTS, chipValue, chipLongValue, chipWarning, sameValue } from '../../utils/planSchema';
import ChipRow from './ChipRow.vue';
import ChipPopover from './ChipPopover.vue';

const props = defineProps({
  plan: { type: Object, required: true },     // useLayerPlan().state.plan
  stats: { type: Object, required: true },    // useLayerPlan().overrideStats
  counts: { type: Object, required: true },   // useLayerPlan().overrideCounts (chip key -> N)
  globals: { type: Object, default: () => ({ tagsOn: true, splitOn: true }) }
});
defineEmits(['patch', 'reset-keys', 'clear-overrides', 'reset-all', 'close']);

const isBuiltIn = c => c.keys.every(k => sameValue(k, props.plan[k], PLAN_DEFAULTS[k]));

const chips = computed(() => CHIPS.map(c => {
  const count = props.counts[c.key] || 0;
  const off = (c.key === 'tags' && !props.globals.tagsOn) || (c.key === 'split' && !props.globals.splitOn);
  const warn = chipWarning(c.key, props.plan);
  const long = off ? `${chipLongValue(c.key, props.plan, { tagsOn: true, splitOn: true })}, off for the whole plan` : chipLongValue(c.key, props.plan, props.globals);
  const tail = count ? `. ${count} ${count === 1 ? 'group or layer sets' : 'groups and layers set'} their own value` : '';
  return { ...c, count, off, warn, value: chipValue(c.key, props.plan, props.globals), tip: `${c.title}: ${long}${tail}${warn ? `. ${warn}` : ''}` };
}));

const chipRow = ref(null);
const openChip = ref(null);
const openSpec = computed(() => chips.value.find(c => c.key === openChip.value) || null);
function toggleChip(key) {
  openChip.value = openChip.value === key ? null : key;
}

const total = computed(() => props.stats.groupValues + props.stats.layers);
const statsText = computed(() => {
  const g = props.stats.groupValues;
  const l = props.stats.layers;
  if (!g && !l) return 'Every group uses these values';
  const parts = [g ? `${g} group ${g === 1 ? 'value' : 'values'}` : null, l ? `${l} ${l === 1 ? 'layer' : 'layers'}` : null].filter(Boolean);
  return `◆ ${parts.join(' and ')} set their own values`;
});
</script>

<style scoped>
* { box-sizing: border-box; }

.pdbox {
  /* The frame (border, glow) comes from LayerPlan .pd-drop */
  margin: 10px 14px 0;
  border-radius: 6px;
  background: #1e1e1e;
  overflow: hidden;
}
.pd-head { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 6px 0 12px; background: #242424; border-bottom: 1px solid #2e2e2e; }
.pd-title { font-size: 12px; font-weight: 700; color: #ffffff; white-space: nowrap; }
.pd-tag {
  flex-shrink: 0; height: 18px; padding: 0 6px; border-radius: 4px;
  display: inline-flex; align-items: center;
  background: #0a84ff; color: #ffffff; font-size: 10px; font-weight: 700; white-space: nowrap;
}
.hint { flex: 1; min-width: 0; font-size: 11px; color: #9c9c9c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hint.warm { color: #ffd60a; }
/* The footer summary wraps instead of being cut in a narrow pane */
.pd-foot .hint { white-space: normal; line-height: 1.4; }
.pd-x {
  width: 24px; height: 24px; flex-shrink: 0; border: none; border-radius: 4px;
  background: transparent; color: #9c9c9c; cursor: pointer; padding: 0;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;
}
.pd-x:hover { background: #2c2c2c; color: #ffffff; }
.pd-x:focus-visible { outline: none; box-shadow: 0 0 0 2px #0a84ff; }

.pd-body { display: flex; padding: 10px 12px; }
.pd-foot {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px 6px 12px; background: #1a1a1a; border-top: 1px solid #2e2e2e;
}
.quiet {
  flex-shrink: 0; height: 26px; padding: 0 10px; border-radius: 6px;
  border: 1px solid transparent; background: transparent; color: #aeaeae;
  font: inherit; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.2s ease;
}
.quiet:hover:not(:disabled) { border-color: #6a6a6a; background: #2c2c2c; color: #ffffff; }.quiet:disabled { opacity: 0.4; cursor: not-allowed; }
.quiet:focus-visible { outline: none; box-shadow: 0 0 0 2px #0a84ff; }
</style>
