<template>
  <section class="plan-pane" aria-label="Layer plan" @click.stop>
    <header class="ph">
      <span class="ph-title">LAYER PLAN</span>
      <span class="ph-sum">{{ summary }}</span>
      <div class="ph-spacer"></div>
      <slot name="header-extra"></slot>
      <button type="button" class="ghost" @click="$emit('add-group')">+ Group</button>
    </header>

    <div v-if="planState.groups.length" class="gnav-wrap">
      <nav class="gnav" aria-label="Jump to group">
        <button v-for="(g, gi) in planState.groups" :key="g.id" type="button" class="chip" title="Scroll to this group" @click="jump(g.id)">
          <span class="chip-label">G{{ gi + 1 }}</span> {{ g.name }} <span class="chip-count">{{ g.items.length }}</span>
        </button>
      </nav>
      <button type="button" class="ghost icon-only" title="Clear mappings in all groups" aria-label="Clear mappings in all groups" :disabled="!hasAnyMapping" @click="$emit('clear-all-mappings')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H9L4 15l10-10 7 7-6 6"/><path d="m9 10 6 6"/></svg>
      </button>
      <button type="button" class="ghost" @click="$emit('set-all-open', !anyOpen)">{{ anyOpen ? 'Collapse all' : 'Expand all' }}</button>
    </div>

    <div v-if="armedMapping" class="armed-strip" role="status">
      <span class="armed-dot" :style="{ background: armedColor }"></span>
      <span>Assigning <strong>{{ armedMapping.name }}</strong> — click layer slots. Esc to cancel.</span>
      <div class="ph-spacer"></div>
      <button type="button" class="ghost" @click="$emit('disarm')">Done</button>
    </div>

    <div v-if="planState.groups.length" ref="listRef" class="plan">
      <PlanGroup
        v-for="(g, gi) in planState.groups"
        :key="g.id"
        :group="g"
        :index="gi"
        :layout="layout.groups[gi]"
        :total="layout.total"
        :row-offset="rowOffsets[gi]"
        :entries="planState.entries"
        :files-by-path="filesByPath"
        :details="details"
        :thumb-base="thumbBase"
        :show-splits="showSplits"
        :show-tags="showTags"
        :flash="flashId === g.id"
        :mappings-by-path="mappingsByPath"
        :armed="armed"
        @assign="(ids, path) => $emit('assign', ids, path)"
        @clear-entries="ids => $emit('clear-entries', ids)"
        @assign-group="path => $emit('assign-group', g.id, path)"
        @clear-group="$emit('clear-group', g.id)"
        @toggle="$emit('update-group', g.id, { open: !g.open })"
        @rename="name => $emit('update-group', g.id, { name })"
        @set-timing="timing => $emit('update-group', g.id, { timing })"
        @remove="$emit('remove-group', g.id)"
        @remove-entry="eid => $emit('remove-entry', g.id, eid)"
      />
    </div>
    <div v-else class="empty">Select files and press “New group”. Repeat to build Group 2, Group 3…</div>
  </section>
</template>

<script setup>
import { computed, ref, nextTick } from 'vue';
import PlanGroup from './PlanGroup.vue';
import { formatDuration } from '../../utils/format';
import { mappingColor } from '../../utils/mappingColors';

const props = defineProps({
  planState: { type: Object, required: true },   // useLayerPlan().state
  layout: { type: Object, required: true },      // computePlanLayout() result
  details: { type: Object, required: true },
  filesByPath: { type: Object, required: true },
  thumbBase: { type: String, default: '' },
  showSplits: { type: Boolean, default: false },
  showTags: { type: Boolean, default: false },
  mappingsByPath: { type: Object, default: () => ({}) },
  armed: { type: String, default: null }
});
defineEmits(['add-group', 'update-group', 'remove-group', 'remove-entry', 'set-all-open',
  'assign', 'clear-entries', 'assign-group', 'clear-group', 'clear-all-mappings', 'disarm']);

const hasAnyMapping = computed(() => Object.values(props.planState.entries).some(e => e.mappingPath));
const armedMapping = computed(() => (props.armed ? props.mappingsByPath[props.armed] : null));
const armedColor = computed(() => mappingColor(props.armed));

const listRef = ref(null);
const flashId = ref(null);
let flashTimer = null;

const layerCount = computed(() => props.planState.groups.reduce((n, g) => n + g.items.length, 0));
const anyOpen = computed(() => props.planState.groups.some(g => g.open));
const rowOffsets = computed(() => {
  let n = 0;
  return props.planState.groups.map(g => { const at = n; n += g.items.length; return at; });
});
const summary = computed(() => {
  const g = props.planState.groups.length;
  if (!g) return 'empty';
  return `${g} ${g === 1 ? 'group' : 'groups'} · ${layerCount.value} layers · ≈${formatDuration(props.layout.total) || '0s'}`;
});

/** Scrolls a group into view and flashes it (also used after New group / Add to group). */
async function jump(gid) {
  await nextTick();
  document.getElementById(`plan-group-${gid}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  flashId.value = gid;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { if (flashId.value === gid) flashId.value = null; }, 1400);
}

defineExpose({ jump });
</script>

<style scoped>
* { box-sizing: border-box; }

.plan-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #1a1a1a;
}

.ph {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 0 16px;
  border-bottom: 1px solid #222222;
  flex-shrink: 0;
}
.ph-title { font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #0a84ff; white-space: nowrap; }
.ph-sum { font-size: 12px; color: #888888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.ph-spacer { flex: 1; }

.ghost {
  flex-shrink: 0;
  background: transparent;
  border: 1px solid #333333;
  color: #aaaaaa;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}
.ghost:hover:not(:disabled) { border-color: #555555; color: #ffffff; background: #1f1f1f; }
.ghost:disabled { opacity: 0.35; cursor: not-allowed; }
.ghost.icon-only { padding: 6px 8px; display: flex; align-items: center; }

.armed-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: rgba(10, 132, 255, 0.15);
  border-bottom: 1px solid #0a84ff;
  font-size: 12px;
  color: #dddddd;
  flex-shrink: 0;
}
.armed-strip strong { color: #ffffff; }
.armed-dot { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }

.gnav-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-bottom: 1px solid #222222;
  flex-shrink: 0;
}
.gnav { flex: 1; min-width: 0; display: flex; gap: 6px; overflow-x: auto; padding: 2px 0; }
.chip {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid #333333;
  background: transparent;
  color: #cccccc;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}
.chip:hover { border-color: #555555; color: #ffffff; }
.chip-label { color: #0a84ff; }
.chip-count { color: #888888; font-weight: 500; }

.plan { flex: 1; overflow-y: auto; padding-bottom: 24px; }
.plan::-webkit-scrollbar { width: 8px; }
.plan::-webkit-scrollbar-thumb { background: #333333; border-radius: 4px; }

.empty { padding: 40px 18px; text-align: center; color: #555555; font-size: 13px; }
</style>
