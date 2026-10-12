<template>
  <div class="aabox" role="dialog" aria-label="Auto-assign mappings">
    <div class="aa-head">
      <span class="aa-title">Auto-assign</span>
      <span class="aa-tag">Mappings</span>
      <span class="hint">Assigns mappings to layers by file name or resolution</span>
      <button type="button" class="aa-x" aria-label="Close Auto-assign" title="Close (Esc)" @click="$emit('close')">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>

    <div class="aa-body">
      <div class="aa-col">
        <div class="aa-cap">Match by</div>
        <div class="olist">
          <button
            v-for="r in rules"
            :key="r.key"
            type="button"
            class="orow"
            :class="{ on: r.model.value }"
            role="checkbox"
            :aria-checked="r.model.value"
            :title="r.desc"
            @click="r.model.value = !r.model.value"
          >
            <span class="cb" :class="{ on: r.model.value }" aria-hidden="true">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>
            </span>
            <span class="o-txt">
              <span class="o-name">{{ r.name }}</span>
              <span class="o-desc">{{ r.desc }}</span>
            </span>
          </button>
        </div>
      </div>

      <div class="aa-col">
        <div class="aa-cap">Apply to</div>
        <div class="olist" role="radiogroup" aria-label="Apply to">
          <button
            v-for="opt in scopes"
            :key="opt.value"
            type="button"
            class="srow"
            :class="{ on: scope === opt.value }"
            role="radio"
            :aria-checked="scope === opt.value"
            @click="scope = opt.value"
          >
            <span class="rad" aria-hidden="true"></span>
            <span class="s-label">{{ opt.label }}</span>
            <span class="s-count">{{ opt.count }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="aa-foot">
      <span v-if="summary" class="result" role="status">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>
        <span>{{ summary }}</span>
      </span>
      <span v-else class="hint foot-hint">{{ mappedText }}</span>
      <button type="button" class="quiet danger" :disabled="!hasAnyMapping" @click="$emit('clear-all')">Clear all mappings</button>
      <button type="button" class="primary" :disabled="!byName && !byRes" @click="run">Run auto-assign</button>
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

const rules = [
  { key: 'name', model: byName, name: 'File name', desc: 'The file name contains the mapping name; the longest name wins.' },
  { key: 'res', model: byRes, name: 'Resolution', desc: 'The file resolution equals the mapping resolution. Skipped when several mappings share it.' }
];

const allIds = computed(() => props.planState.groups.flatMap(g => g.items));
const unassignedIds = computed(() => allIds.value.filter(id => !props.planState.entries[id]?.mappingPath));
const hasAnyMapping = computed(() => allIds.value.length > unassignedIds.value.length);

const scopes = computed(() => [
  { value: 'unassigned', label: 'Layers without mapping', count: unassignedIds.value.length },
  { value: 'selected', label: 'Selected layers', count: props.selectedIds.length },
  { value: 'all', label: 'All layers', count: allIds.value.length }
]);

const mappedText = computed(() => {
  const total = allIds.value.length;
  return `${total - unassignedIds.value.length} of ${total} ${total === 1 ? 'layer has' : 'layers have'} a mapping`;
});

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

/* Same shell as PlanDefaults; the frame (border, glow) comes from LayerPlan .pd-drop */
.aabox {
  margin: 10px 14px 0;
  border-radius: 6px;
  background: #1e1e1e;
  container-type: inline-size;
  /* In a short window only the body scrolls: the header and the Run button stay in view */
  display: flex;
  flex-direction: column;
}
/* Beats LayerPlan .pd-drop (overflow-y: auto), so the panel itself never scrolls */
.aabox.pd-drop { overflow: hidden; }
.aa-head, .aa-foot { flex-shrink: 0; }
.aa-head { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 6px 0 12px; background: #242424; border-bottom: 1px solid #2e2e2e; }
.aa-title { font-size: 12px; font-weight: 700; color: #ffffff; white-space: nowrap; }
.aa-tag {
  flex-shrink: 0; height: 18px; padding: 0 6px; border-radius: 4px;
  display: inline-flex; align-items: center;
  background: #0a84ff; color: #ffffff; font-size: 10px; font-weight: 700; white-space: nowrap;
}
.hint { flex: 1; min-width: 0; font-size: 11px; color: #9c9c9c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.aa-x {
  width: 24px; height: 24px; flex-shrink: 0; border: none; border-radius: 4px;
  background: transparent; color: #9c9c9c; cursor: pointer; padding: 0;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;
}
.aa-x:hover { background: #2c2c2c; color: #ffffff; }
.aa-x:focus-visible { outline: none; box-shadow: 0 0 0 2px #0a84ff; }

.aa-body { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 12px; min-height: 0; overflow-y: auto; }
/* Narrow pane: one column, the hint and the rule descriptions move to tooltips */
@container (max-width: 560px) {
  .aa-body { grid-template-columns: minmax(0, 1fr); }
  .aa-head .hint, .o-desc { display: none; }
  .aa-head .aa-x { margin-left: auto; }
  .orow { align-items: center; min-height: 34px; padding: 0 12px; }
  .orow .cb { margin-top: 0; }
}
/* Both lists take the height of the taller one, and their rows share it evenly */
.aa-col { min-width: 0; display: flex; flex-direction: column; }
.aa-cap { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #aeaeae; margin-bottom: 6px; }

/* Option lists in the chip popover style (SettingEditor .opts) */
.olist { flex: 1; display: flex; flex-direction: column; border: 1px solid #333333; border-radius: 6px; background: #181818; overflow: hidden; }
.orow, .srow {
  flex: 1; width: 100%; display: flex; gap: 10px; border: none; background: transparent;
  text-align: left; font: inherit; cursor: pointer; transition: background 0.15s ease;
}
.orow + .orow, .srow + .srow { border-top: 1px solid #262626; }
.orow:hover, .srow:hover { background: #2c2c2c; }
.orow:focus-visible, .srow:focus-visible { outline: none; box-shadow: inset 0 0 0 2px #0a84ff; }
.orow.on, .srow.on { background: rgba(10, 132, 255, 0.08); }

.orow { align-items: flex-start; padding: 9px 12px; }
.cb {
  width: 16px; height: 16px; margin-top: 1px; flex-shrink: 0;
  border: 1.5px solid #777777; border-radius: 4px; background: #181818; color: transparent;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;
}
.orow:hover .cb { border-color: #cccccc; }
.cb.on, .orow:hover .cb.on { background: #0a84ff; border-color: #0a84ff; color: #ffffff; }
.o-txt { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.o-name { font-size: 12px; font-weight: 600; color: #f2f2f2; }
.o-desc { font-size: 11px; color: #9c9c9c; line-height: 1.4; }

.srow { align-items: center; min-height: 34px; padding: 0 12px; font-size: 12px; color: #d4d4d4; }
.srow.on { color: #ffffff; font-weight: 600; }
.rad {
  width: 14px; height: 14px; flex-shrink: 0; border-radius: 50%;
  border: 1.5px solid #888888; background: transparent; transition: all 0.15s ease;
}
.srow:hover .rad { border-color: #cccccc; }
.srow.on .rad { border-color: #0a84ff; background: #0a84ff; box-shadow: inset 0 0 0 3px #181818; }
.s-label { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.s-count { font-size: 11px; font-weight: 500; color: #9c9c9c; font-variant-numeric: tabular-nums; }

.aa-foot {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px 6px 12px; background: #1a1a1a; border-top: 1px solid #2e2e2e;
}
.foot-hint { font-variant-numeric: tabular-nums; }
/* A very narrow pane: the status takes its own line above the buttons */
@container (max-width: 420px) {
  .aa-foot { flex-wrap: wrap; justify-content: flex-end; padding-top: 8px; }
  .result, .foot-hint { flex-basis: 100%; }
}
.result { flex: 1; min-width: 0; display: flex; align-items: flex-start; gap: 6px; font-size: 11px; color: #d4d4d4; line-height: 1.4; }
.result svg { color: #0a84ff; flex-shrink: 0; margin-top: 2px; }
.quiet {
  flex-shrink: 0; height: 26px; padding: 0 10px; border-radius: 6px;
  border: 1px solid transparent; background: transparent; color: #aeaeae;
  font: inherit; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.2s ease;
}
.quiet:hover:not(:disabled) { border-color: #6a6a6a; background: #2c2c2c; color: #ffffff; }
.quiet.danger:hover:not(:disabled) { border-color: #ef4444; background: transparent; color: #ef4444; }
.quiet:disabled { opacity: 0.4; cursor: not-allowed; }
.quiet:focus-visible { outline: none; box-shadow: 0 0 0 2px #0a84ff; }
.primary {
  flex-shrink: 0; height: 28px; padding: 0 14px; border: none; border-radius: 6px;
  background: #0a84ff; color: #ffffff; font: inherit; font-size: 12px; font-weight: 700;
  cursor: pointer; white-space: nowrap; transition: background 0.2s ease;
}
.primary:hover:not(:disabled) { background: #0060d1; }
.primary:disabled { opacity: 0.4; cursor: not-allowed; }
.primary:focus-visible { outline: none; box-shadow: 0 0 0 2px #ffffff; }
</style>
