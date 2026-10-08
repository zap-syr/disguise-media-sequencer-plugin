<template>
  <section class="plan-pane" aria-label="Layer plan" tabindex="-1" @click.stop @keydown="onKeydown">
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

    <div v-if="selectedIds.length" class="sel-strip" role="status">
      <span><strong>{{ selectedIds.length }}</strong> {{ selectedIds.length === 1 ? 'layer' : 'layers' }} selected. Drag to move, drop a mapping on one to assign all.</span>
      <div class="ph-spacer"></div>
      <button type="button" class="ghost" @click="$emit('clear-entries', selectedIds)">Clear mappings</button>
      <button type="button" class="ghost danger" @click="$emit('remove-selected')">Remove</button>
      <button type="button" class="ghost" @click="$emit('deselect')">Deselect</button>
    </div>

    <div v-if="armedMapping" class="armed-strip" role="status">
      <span class="armed-dot" :style="{ background: armedColor }"></span>
      <span>Assigning <strong>{{ armedMapping.name }}</strong>: click layer slots. Esc to cancel.</span>
      <div class="ph-spacer"></div>
      <button type="button" class="ghost" @click="$emit('disarm')">Done</button>
    </div>

    <div v-if="planState.groups.length" ref="listRef" class="plan" @dragover="autoScroll">
      <template v-for="(g, gi) in planState.groups" :key="g.id">
      <div
        v-if="draggingFolders"
        class="gap-drop"
        :class="{ over: gapOver === gi }"
        @dragover.prevent="gapOver = gi"
        @dragleave="gapOver = null"
        @drop.prevent="onGapDrop(gi)"
      >Drop to create groups here</div>
      <PlanGroup
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
        :checked="checked"
        :selected-ids="selectedIds"
        :any-selected="selectedIds.length > 0"
        @row-click="(id, ev) => $emit('row-click', id, ev)"
        @row-check="id => $emit('row-check', id)"
        @group-check="$emit('group-check', g)"
        @drop-rows="d => $emit('drop-rows', { ...d, gid: g.id })"
        @drop-files="d => $emit('drop-files', { ...d, gid: g.id })"
        @toggle="$emit('update-group', g.id, { open: !g.open })"
        @rename="name => $emit('update-group', g.id, { name })"
        @set-timing="timing => $emit('update-group', g.id, { timing })"
        @remove="$emit('remove-group', g.id)"
        @remove-entry="eid => $emit('remove-entry', g.id, eid)"
        @drop-folders="d => $emit('drop-folders', { ...d, gid: g.id })"
      />
      </template>
      <div
        v-if="draggingFolders"
        class="gap-drop"
        :class="{ over: gapOver === planState.groups.length }"
        @dragover.prevent="gapOver = planState.groups.length"
        @dragleave="gapOver = null"
        @drop.prevent="onGapDrop(planState.groups.length)"
      >Drop to create groups at the end</div>
    </div>
    <div
      v-else
      class="empty"
      :class="{ 'is-drop': draggingFolders && gapOver === 0 }"
      @dragover="draggingFolders && ($event.preventDefault(), gapOver = 0)"
      @dragleave="gapOver = null"
      @drop.prevent="draggingFolders && onGapDrop(0)"
    >Select files and press "New group", or select folders in the tree. Repeat to build Group 2, Group 3 and so on.</div>
  </section>
</template>

<script setup>
import { computed, ref, nextTick } from 'vue';
import PlanGroup from './PlanGroup.vue';
import { formatDuration } from '../../utils/format';
import { mappingColor } from '../../utils/mappingColors';
import { dragPayload, endDrag } from '../../composables/useDragPayload';

const props = defineProps({
  planState: { type: Object, required: true },   // useLayerPlan().state
  layout: { type: Object, required: true },      // computePlanLayout() result
  details: { type: Object, required: true },
  filesByPath: { type: Object, required: true },
  thumbBase: { type: String, default: '' },
  showSplits: { type: Boolean, default: false },
  showTags: { type: Boolean, default: false },
  mappingsByPath: { type: Object, default: () => ({}) },
  armed: { type: String, default: null },
  checked: { type: Set, default: () => new Set() },  // usePlanSelection().checked
  selectedIds: { type: Array, default: () => [] }    // selected ids in plan order
});
const emit = defineEmits(['add-group', 'update-group', 'remove-group', 'remove-entry', 'set-all-open',
  'assign', 'clear-entries', 'assign-group', 'clear-group', 'clear-all-mappings', 'disarm',
  'row-click', 'row-check', 'group-check', 'drop-rows', 'drop-files', 'remove-selected', 'deselect',
  'drop-folders', 'drop-folder-groups']);

// Folders dragged from the tree: drop between groups creates groups there (docs §2.3.2)
const draggingFolders = computed(() => dragPayload.kind === 'folders');
const gapOver = ref(null);
function onGapDrop(index) {
  emit('drop-folder-groups', { folderIds: [...dragPayload.ids], index });
  gapOver.value = null;
  endDrag();
}

/** Delete / Backspace removes the selected rows (not while typing in an input). */
function onKeydown(event) {
  if (!['Delete', 'Backspace'].includes(event.key) || !props.selectedIds.length) return;
  if (event.target.closest('input, textarea, select')) return;
  event.preventDefault();
  emit('remove-selected');
}

/** Scrolls the plan list while dragging near its top / bottom edge. */
function autoScroll(event) {
  const el = listRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const edge = 40;
  if (event.clientY < rect.top + edge) el.scrollTop -= 12;
  else if (event.clientY > rect.bottom - edge) el.scrollTop += 12;
}

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
  const total = formatDuration(props.layout.total) || '0s';
  return `${g} ${g === 1 ? 'group' : 'groups'}, ${layerCount.value} layers, ≈${total}`;
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

.plan-pane:focus { outline: none; }
.ghost.danger:hover:not(:disabled) { border-color: #ef4444; color: #ef4444; }

.sel-strip {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
  padding: 8px 16px;
  background: #242424;
  border-bottom: 1px solid #333333;
  font-size: 12px;
  color: #cccccc;
  flex-shrink: 0;
}
.sel-strip strong { color: #ffffff; }

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

.empty { padding: 40px 18px; text-align: center; color: #555555; font-size: 13px; border: 1px dashed transparent; margin: 10px 14px; border-radius: 6px; }
.empty.is-drop { border-color: #0a84ff; color: #0a84ff; background: rgba(10, 132, 255, 0.15); }

.gap-drop {
  margin: 6px 14px;
  padding: 8px;
  border: 1px dashed #3a3a3a;
  border-radius: 6px;
  text-align: center;
  font-size: 11px;
  color: #777777;
  transition: all 0.2s ease;
}
.gap-drop.over { border-color: #0a84ff; border-style: solid; color: #0a84ff; background: rgba(10, 132, 255, 0.15); }
</style>
