<template>
  <div class="aabox" role="dialog" aria-label="Auto-assign mappings">
    <div class="aa-head">
      <span class="aa-title">AUTO-ASSIGN</span>
      <span class="hint">Assigns mappings to layers by file name or resolution.</span>
    </div>

    <div class="aa-rules">
      <label class="rule">
        <input v-model="byName" type="checkbox" />
        <span>
          <span class="rule-name">Match name</span>
          <span class="rule-desc">The file name contains the mapping name; the longest name wins.</span>
        </span>
      </label>
      <label class="rule">
        <input v-model="byRes" type="checkbox" />
        <span>
          <span class="rule-name">Match resolution</span>
          <span class="rule-desc">The file resolution equals the mapping resolution. Skipped when several mappings share it.</span>
        </span>
      </label>
    </div>

    <div class="aa-scope">
      <span class="aa-lbl">Apply to</span>
      <div class="seg" role="group" aria-label="Apply to">
        <button
          v-for="opt in scopes"
          :key="opt.value"
          type="button"
          :class="{ on: scope === opt.value }"
          :aria-pressed="scope === opt.value"
          @click="scope = opt.value"
        >{{ opt.label }}</button>
      </div>
    </div>

    <div v-if="summary" class="aa-result" role="status">{{ summary }}</div>

    <div class="aa-foot">
      <button type="button" class="ghost danger" :disabled="!hasAnyMapping" @click="$emit('clear-all')">Clear all mappings</button>
      <div class="foot-btns">
        <button type="button" class="ghost" @click="$emit('close')">Done</button>
        <button type="button" class="primary" :disabled="!byName && !byRes" @click="run">Run auto-assign</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { usePersistedRef } from '../../composables/usePersistedRef';
import { autoAssign, autoAssignSummary } from '../../utils/autoAssign';

const props = defineProps({
  planState: { type: Object, required: true },        // useLayerPlan().state
  selectedIds: { type: Array, default: () => [] },    // selected entry ids in plan order
  mappings: { type: Array, default: () => [] },       // getMappingList() result
  details: { type: Object, required: true }           // getMediaDetails() result
});
const emit = defineEmits(['apply', 'clear-all', 'close']);

const byName = usePersistedRef('mediaSequencer.autoByName', true, s => s === 'true');
const byRes = usePersistedRef('mediaSequencer.autoByRes', true, s => s === 'true');
const scope = usePersistedRef('mediaSequencer.autoScope', 'unassigned', s => ['unassigned', 'selected', 'all'].includes(s) ? s : undefined);

const allIds = computed(() => props.planState.groups.flatMap(g => g.items));
const unassignedIds = computed(() => allIds.value.filter(id => !props.planState.entries[id]?.mappingPath));
const hasAnyMapping = computed(() => allIds.value.length > unassignedIds.value.length);

const scopes = computed(() => [
  { value: 'unassigned', label: `Without mapping (${unassignedIds.value.length})` },
  { value: 'selected', label: `Selected (${props.selectedIds.length})` },
  { value: 'all', label: `All layers (${allIds.value.length})` }
]);

const summary = ref('');
// A stale result would describe a different setup
watch([byName, byRes, scope], () => { summary.value = ''; });

function run() {
  const ids = scope.value === 'all' ? allIds.value : scope.value === 'selected' ? props.selectedIds : unassignedIds.value;
  const { assignments, stats } = autoAssign(ids, props.planState.entries, props.mappings, props.details,
    { byName: byName.value, byRes: byRes.value });
  if (assignments.length) emit('apply', assignments);
  summary.value = autoAssignSummary(stats);
}
</script>

<style scoped>
* { box-sizing: border-box; }

.aabox {
  margin: 10px 14px 0;
  padding: 12px 14px;
  border: 1px solid #333333;
  border-radius: 6px;
  background: #242424;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.aa-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px 12px; }
.aa-title { font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #0a84ff; }
.hint { font-size: 11px; color: #888888; }

.aa-rules { display: flex; flex-direction: column; gap: 8px; }
.rule { display: flex; align-items: flex-start; gap: 8px; cursor: pointer; margin: 0; }
.rule input { margin: 2px 0 0; accent-color: #0a84ff; width: 14px; height: 14px; flex-shrink: 0; cursor: pointer; }
.rule-name { display: block; font-size: 12px; color: #dddddd; font-weight: 600; }
.rule-desc { display: block; font-size: 11px; color: #888888; line-height: 1.4; }

.aa-scope { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 10px; }
.aa-lbl { font-size: 11px; color: #aaaaaa; font-weight: 600; }
.seg { display: inline-flex; flex-wrap: wrap; background: #181818; border: 1px solid #3a3a3a; border-radius: 6px; padding: 2px; }
.seg button {
  flex: 1 1 auto;
  border: none; background: transparent; color: #888888;
  padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer;
  white-space: nowrap; transition: all 0.2s ease;
}
.seg button:hover { color: #cccccc; }
.seg button.on { background: #3a3a3a; color: #ffffff; }
.seg button:focus-visible { outline: none; box-shadow: 0 0 0 2px #0a84ff; }

.aa-result {
  font-size: 12px; color: #dddddd; line-height: 1.4;
  padding: 8px 10px; border-radius: 6px; background: rgba(10, 132, 255, 0.15); border: 1px solid rgba(10, 132, 255, 0.5);
}

.aa-foot { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding-top: 10px; border-top: 1px solid #333333; }
.foot-btns { display: flex; gap: 8px; margin-left: auto; }
.ghost {
  background: transparent; border: 1px solid #333333; color: #aaaaaa;
  border-radius: 6px; padding: 6px 10px; font-size: 12px; cursor: pointer; transition: all 0.2s ease;
}
.ghost:hover:not(:disabled) { border-color: #555555; color: #ffffff; background: #1f1f1f; }
.ghost:disabled { opacity: 0.35; cursor: not-allowed; }
.ghost.danger:hover:not(:disabled) { border-color: #ef4444; color: #ef4444; }
.primary {
  background: #0a84ff; border: none; color: #ffffff; border-radius: 6px;
  padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.2s ease;
}
.primary:hover:not(:disabled) { background: #0060d1; }
.primary:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
