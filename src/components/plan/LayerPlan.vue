<template>
  <section class="plan-pane" aria-label="Layer plan" tabindex="-1" @click.stop @keydown="onKeydown">
    <header class="ph">
      <span class="ph-title">LAYER PLAN</span>
      <span class="ph-sum">{{ summary }}</span>
      <!-- One block that wraps as a whole and stays right-aligned in a narrow pane -->
      <div class="ph-actions">
      <slot name="header-extra"></slot>
      <button
        ref="autoBtn"
        type="button"
        class="ghost icon-text"
        :class="{ active: openPanel === 'auto' }"
        :aria-pressed="openPanel === 'auto'"
        aria-haspopup="dialog"
        title="Assign mappings by file name or resolution"
        :disabled="!layerCount"
        @click="togglePanel('auto')"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8L4 10.6l5 3.7L7.2 20 12 16.5l4.8 3.5-1.8-5.7 5-3.7-6.1-1.8z"/></svg>
        <span class="btn-label">Auto-assign</span>
      </button>
      <button
        ref="pdBtn"
        type="button"
        class="ghost icon-text"
        :class="{ active: openPanel === 'defaults' }"
        :aria-pressed="openPanel === 'defaults'"
        aria-haspopup="dialog"
        title="Settings every group inherits"
        @click="togglePanel('defaults')"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span class="btn-label">Plan defaults</span>
      </button>
      <button type="button" class="ghost icon-text" title="Add an empty group" aria-label="Add group" @click="$emit('add-group')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        <span class="btn-label">Group</span>
      </button>
      </div>
    </header>

    <!-- Header panels drop down over the groups instead of pushing them down -->
    <div class="pd-anchor">
      <PlanDefaults
        v-if="openPanel === 'defaults'"
        ref="panelRef"
        class="pd-drop"
        :plan="planState.plan"
        :stats="overrideStats"
        :counts="overrideCounts"
        :globals="globals"
        @patch="p => $emit('set-plan', p)"
        @reset-keys="keys => $emit('reset-plan-keys', keys)"
        @clear-overrides="keys => $emit('clear-overrides', keys)"
        @reset-all="$emit('reset-all-overrides')"
        @close="closePanel"
      />
      <AutoAssign
        v-else-if="openPanel === 'auto'"
        ref="panelRef"
        class="pd-drop"
        :plan-state="planState"
        :selected-ids="selectedIds"
        :mappings="mappings"
        :details="details"
        @apply="list => $emit('auto-assign', list)"
        @clear-all="$emit('clear-all-mappings')"
        @close="closePanel"
      />
    </div>

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

    <!-- Floating bar over the list: checking layers or arming a mapping moves nothing -->
    <div v-if="armedMapping" class="sel-bar" role="status">
      <span class="armed-dot" :style="{ background: armedColor }"></span>
      <span class="bar-text">Assigning <strong>{{ armedMapping.name }}</strong><span class="bar-hint">: click layer slots</span></span>
      <span class="bar-sep"></span>
      <!-- The click way to "drop on a selected row" (no drag and drop in the Designer window) -->
      <button
        type="button"
        class="bar-btn"
        :title="selectedIds.length ? `Assign to the ${selectedIds.length} selected ${selectedIds.length === 1 ? 'layer' : 'layers'}` : 'Select layers first (click, Ctrl+Click, Shift+Click)'"
        aria-label="Assign to selected layers"
        :disabled="!selectedIds.length"
        @click="$emit('assign-selected', armed)"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/></svg>
        <span class="bar-btn-lbl">Assign to selected<template v-if="selectedIds.length"> ({{ selectedIds.length }})</template></span>
      </button>
      <button
        type="button"
        class="bar-btn"
        :title="layerCount ? `Assign to all ${layerCount} ${layerCount === 1 ? 'layer' : 'layers'} in ${placedGroups} ${placedGroups === 1 ? 'group' : 'groups'}` : 'The plan has no layers'"
        aria-label="Assign to all layers"
        :disabled="!layerCount"
        @click="$emit('assign-all', armed)"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5"/><path d="m2 17 10 5 10-5"/></svg>
        <span class="bar-btn-lbl">Assign to all</span>
      </button>
      <button type="button" class="bar-btn" title="Stop assigning (Esc)" @click="$emit('disarm')">Done</button>
    </div>
    <div v-else-if="selectedIds.length" class="sel-bar" role="status" title="Drag rows to move them, drop a mapping on a selected row to assign it to all">
      <span class="sel-count">{{ selectedIds.length }}</span>
      <span class="bar-text">{{ selectedIds.length === 1 ? 'layer' : 'layers' }} selected</span>
      <span class="bar-sep"></span>
      <span class="bar-lbl">Chips edit</span>
      <div class="bar-seg" role="group" aria-label="Chips edit">
        <button type="button" :class="{ on: selScopeMode === 'selected' }" :aria-pressed="selScopeMode === 'selected'" title="Group chips edit the selected layers" @click="setSelScope('selected')">Selected</button>
        <button type="button" :class="{ on: selScopeMode === 'group' }" :aria-pressed="selScopeMode === 'group'" title="Group chips edit the whole group" @click="setSelScope('group')">Group</button>
      </div>
      <span class="bar-sep"></span>
      <button type="button" class="bar-btn" title="Clear mappings of the selected layers" aria-label="Clear mappings" @click="$emit('clear-entries', selectedIds)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H9L4 15l10-10 7 7-6 6"/><path d="m9 10 6 6"/></svg>
        <span class="bar-btn-lbl">Clear mappings</span>
      </button>
      <button type="button" class="bar-btn danger" title="Remove the selected layers (Delete)" aria-label="Remove" @click="$emit('remove-selected')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
        <span class="bar-btn-lbl">Remove</span>
      </button>
      <button type="button" class="bar-x" aria-label="Deselect" title="Deselect (Esc)" @click="$emit('deselect')">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>

    <div v-if="planState.groups.length" ref="listRef" class="plan" @dragover="onListOver" @drop="onListDrop">
      <template v-for="(g, gi) in planState.groups" :key="g.id">
      <div
        v-if="draggingNew"
        class="gap-drop"
        :class="{ over: gapOver === gi }"
        @dragover.prevent="gapOver = gi"
        @dragleave="gapOver = null"
        @drop.prevent.stop="onGapDrop(gi)"
      >{{ draggingFolders ? 'Drop to create groups here' : 'Drop to create a new group here' }}</div>
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
        :globals="globals"
        @set-group-ov="(patch, removeKeys) => $emit('set-group-ov', g.id, patch, removeKeys)"
        @set-layer-ov="(ids, patch, keys) => $emit('set-layer-ov', ids, patch, keys)"
        @reset-group="$emit('reset-group', g.id)"
        @apply-to-all="keys => $emit('apply-to-all', g.id, keys)"
        @apply-to-group="(ids, keys) => $emit('apply-to-group', g.id, ids, keys)"
        @remove="$emit('remove-group', g.id)"
        @remove-entry="eid => $emit('remove-entry', g.id, eid)"
        @drop-folders="d => $emit('drop-folders', { ...d, gid: g.id })"
        @drop-group="d => $emit('drop-group', { ...d, targetGid: g.id })"
      />
      </template>
      <!-- A group dragged over the space under the last group moves to the end -->
      <div v-if="groupEndOver" class="group-end-line"></div>
      <!-- The free space under the last group (and the list background) creates a group at the end -->
      <div
        v-if="draggingNew"
        class="gap-drop gap-end"
        :class="{ over: gapOver === planState.groups.length }"
        @dragover.prevent="gapOver = planState.groups.length"
        @dragleave="gapOver = null"
        @drop.prevent.stop="onGapDrop(planState.groups.length)"
      >{{ draggingFolders ? 'Drop to create groups at the end' : 'Drop to create a new group' }}</div>
    </div>
    <div
      v-else
      class="empty"
      :class="{ 'is-drop': draggingNew && gapOver === 0 }"
      @dragover="draggingNew && ($event.preventDefault(), gapOver = 0)"
      @dragleave="gapOver = null"
      @drop.prevent="draggingNew && onGapDrop(0)"
    >{{ draggingNew
      ? (draggingFolders ? 'Drop to create groups' : 'Drop to create a new group')
      : 'Drag files here to create a group, or select folders in the tree. Repeat to build Group 2, Group 3 and so on.' }}</div>
  </section>
</template>

<script setup>
import { computed, ref, nextTick, watch, onBeforeUnmount } from 'vue';
import PlanGroup from './PlanGroup.vue';
import PlanDefaults from './PlanDefaults.vue';
import AutoAssign from './AutoAssign.vue';
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
  selectedIds: { type: Array, default: () => [] },   // selected ids in plan order
  overrideStats: { type: Object, required: true },   // useLayerPlan().overrideStats
  overrideCounts: { type: Object, required: true },  // useLayerPlan().overrideCounts
  mappings: { type: Array, default: () => [] },      // getMappingList() result (auto-assign)
  globals: { type: Object, default: () => ({ tagsOn: true, splitOn: true }) }
});
const emit = defineEmits(['add-group', 'update-group', 'remove-group', 'remove-entry', 'set-all-open',
  'assign', 'clear-entries', 'assign-group', 'assign-all', 'assign-selected', 'clear-group', 'clear-all-mappings', 'disarm',
  'row-click', 'row-check', 'group-check', 'drop-rows', 'drop-files', 'remove-selected', 'deselect',
  'drop-folders', 'drop-folder-groups', 'drop-file-group', 'drop-group',
  'set-plan', 'reset-plan-keys', 'clear-overrides', 'reset-all-overrides', 'auto-assign',
  'set-group-ov', 'set-layer-ov', 'reset-group', 'apply-to-all', 'apply-to-group']);

// Header drop-down panels: 'defaults' | 'auto' | null (one at a time)
const openPanel = ref(null);
const panelRef = ref(null);
const pdBtn = ref(null);
const autoBtn = ref(null);
const panelBtn = () => (openPanel.value === 'auto' ? autoBtn.value : pdBtn.value);

function togglePanel(name) {
  openPanel.value = openPanel.value === name ? null : name;
}
function closePanel() {
  openPanel.value = null;
}
/** Opens Plan defaults (the settings panel's "Open Plan defaults" button). */
function openDefaults() {
  openPanel.value = 'defaults';
}
// A chip popover or "+N" list floats above the panel (teleported): it handles its own clicks and Esc
const floatingOpen = () => !!document.querySelector('.chip-pop, .chip-overflow');
// Close on a click outside the panel (not on its toggle button) and on Esc
function onPdOutside(event) {
  const el = panelRef.value?.$el;
  if (el?.contains(event.target) || panelBtn()?.contains(event.target)) return;
  if (event.target.closest?.('.chip-pop, .chip-overflow')) return;
  closePanel();
}
function onPdEsc(event) {
  if (event.key !== 'Escape' || floatingOpen()) return;
  event.stopPropagation();
  const btn = panelBtn();
  closePanel();
  btn?.focus();
}
watch(() => !!openPanel.value, open => {
  const fn = open ? 'addEventListener' : 'removeEventListener';
  window[fn]('pointerdown', onPdOutside, true);
  window[fn]('keydown', onPdEsc, true);
});onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onPdOutside, true);
  window.removeEventListener('keydown', onPdEsc, true);
});

// Folders or files dropped between groups, under the last one or on the empty plan create
// groups there (docs §2.3.0, §2.3.2); a drop onto a group or a row adds to that group instead
const draggingFolders = computed(() => dragPayload.kind === 'folders');
const draggingNew = computed(() => dragPayload.kind === 'folders' || dragPayload.kind === 'files');
const gapOver = ref(null);
watch(draggingNew, () => { gapOver.value = null; });
function onGapDrop(index) {
  if (!draggingNew.value) return;
  const ids = [...dragPayload.ids];
  if (draggingFolders.value) emit('drop-folder-groups', { folderIds: ids, index });
  else emit('drop-file-group', { paths: ids, index });
  gapOver.value = null;
  endDrag();
}

// A dragged group over the list background (under the last group) goes to the end (Phase 10)
const draggingGroup = computed(() => dragPayload.kind === 'group');
const groupEndOver = ref(false);
watch(draggingGroup, () => { groupEndOver.value = false; });

/** List background (outside any group): auto-scroll, and a drop target for a group at the end. */
function onListOver(event) {
  autoScroll(event);
  if (draggingGroup.value) {
    // Only below the last group: the gaps between groups are not targets
    const last = [...listRef.value.querySelectorAll('.group')].pop();
    groupEndOver.value = !!last && event.clientY > last.getBoundingClientRect().bottom;
    if (groupEndOver.value) event.preventDefault();
    return;
  }
  if (!draggingNew.value) return;
  if (event.target === listRef.value) {
    event.preventDefault();
    gapOver.value = props.planState.groups.length;
  } else if (!event.target.closest('.gap-drop')) {
    gapOver.value = null;   // over a group: it adds to that group
  }
}
function onListDrop(event) {
  if (draggingGroup.value) {
    if (!groupEndOver.value) return;
    event.preventDefault();
    emit('drop-group', { gid: dragPayload.ids[0], targetGid: null, pos: 'after' });
    groupEndOver.value = false;
    endDrag();
    return;
  }
  if (!draggingNew.value || event.target !== listRef.value) return;
  event.preventDefault();
  onGapDrop(props.planState.groups.length);
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

// "Chips edit" in the selection bar: the groups that hold selected rows edit them or the whole group
const selGroups = computed(() => props.planState.groups.filter(g => g.items.some(id => props.checked.has(id))));
const selScopeMode = computed(() => (selGroups.value.some(g => g.scope === 'group') ? 'group' : 'selected'));
function setSelScope(mode) {
  selGroups.value.forEach(g => emit('update-group', g.id, { scope: mode === 'group' ? 'group' : 'auto' }));
}

const hasAnyMapping = computed(() => Object.values(props.planState.entries).some(e => e.mappingPath));
const armedMapping = computed(() => (props.armed ? props.mappingsByPath[props.armed] : null));
const armedColor = computed(() => mappingColor(props.armed));

const listRef = ref(null);
const flashId = ref(null);
let flashTimer = null;

const layerCount = computed(() => props.planState.groups.reduce((n, g) => n + g.items.length, 0));
const placedGroups = computed(() => props.planState.groups.filter(g => g.items.length).length);
// The plan emptied while Auto-assign was open
watch(layerCount, n => { if (!n && openPanel.value === 'auto') closePanel(); });
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

defineExpose({ jump, openDefaults });
</script>

<style scoped>
* { box-sizing: border-box; }

.plan-pane {
  position: relative;
  flex: 1 0 320px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #1a1a1a;
}

/*
 * The header is always one row. As the plan pane narrows: the summary ellipsizes away, the
 * Auto-assign / Plan defaults / Group buttons become icons, then the workspace switch does
 * (WorkspaceSwitch.vue), then paddings and gaps tighten.
 */
.ph {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 52px;
  padding: 0 16px;
  border-bottom: 1px solid #222222;
  flex-shrink: 0;
}
.ph-title { font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #0a84ff; white-space: nowrap; flex-shrink: 0; }
.ph-sum { flex: 1 1 0; font-size: 12px; color: #888888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; font-variant-numeric: tabular-nums; }
.ph-spacer { flex: 1; }
.plan-pane { container-type: inline-size; }
@container (max-width: 760px) {
  .btn-label { display: none; }
  .ghost.icon-text { padding: 6px 8px; }
}
@container (max-width: 360px) {
  .ph { padding: 0 12px; gap: 8px; }
  .ph .ph-actions { gap: 6px; }
}
.ph-actions { flex-shrink: 0; display: flex; align-items: center; gap: 8px; }

.pd-anchor { position: relative; height: 0; z-index: 20; }
.pd-drop {
  position: absolute; top: 0; left: 0; right: 0;
  max-height: min(70vh, 560px); overflow-y: auto;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55);
}

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
.ghost.icon-text { display: flex; align-items: center; gap: 6px; }
.ghost.active { border-color: #0a84ff; color: #ffffff; background: rgba(10, 132, 255, 0.15); }

.plan-pane:focus { outline: none; }
.ghost.danger:hover:not(:disabled) { border-color: #ef4444; color: #ef4444; }

/* Floating selection / armed-mapping bar at the bottom centre of the pane */
.sel-bar {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 15;
  max-width: calc(100% - 24px);
  height: 44px;
  padding: 0 6px 0 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #242424;
  /* Blue edge and glow, so the bar stands apart from the plan background under it */
  border: 1px solid rgba(10, 132, 255, 0.55);
  border-radius: 6px;
  box-shadow: 0 0 0 1px rgba(10, 132, 255, 0.12), 0 0 14px rgba(10, 132, 255, 0.22), 0 10px 28px rgba(0, 0, 0, 0.55);
  font-size: 12px;
  color: #cccccc;
  white-space: nowrap;
}
.sel-bar strong { color: #ffffff; }
.bar-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.sel-count {
  min-width: 22px; height: 20px; padding: 0 6px; border-radius: 10px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  background: #0a84ff; color: #ffffff; font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums;
}
.bar-sep { width: 1px; height: 20px; background: #3a3a3a; flex-shrink: 0; }
.bar-lbl { font-size: 11px; color: #888888; flex-shrink: 0; }
.bar-seg { display: inline-flex; height: 28px; padding: 2px; flex-shrink: 0; border: 1px solid #3a3a3a; border-radius: 6px; background: #181818; }
.bar-seg button {
  border: none; background: transparent; color: #888888;
  padding: 0 8px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
}
.bar-seg button:hover { color: #cccccc; }
.bar-seg button.on { background: #3a3a3a; color: #ffffff; }
.bar-seg button:focus-visible { outline: none; box-shadow: 0 0 0 2px #0a84ff; }
.bar-btn {
  display: inline-flex; align-items: center; gap: 6px;
  flex-shrink: 0; height: 28px; padding: 0 10px; border-radius: 6px;
  border: 1px solid #3a3a3a; background: transparent; color: #cccccc;
  font-size: 12px; cursor: pointer; transition: all 0.2s ease;
}
.bar-btn:hover:not(:disabled) { border-color: #555555; background: #2a2a2a; color: #ffffff; }
.bar-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.bar-btn.danger:hover { border-color: #ef4444; color: #ef4444; background: transparent; }
.bar-btn:focus-visible, .bar-x:focus-visible { outline: none; box-shadow: 0 0 0 2px #0a84ff; }
.bar-x {
  width: 28px; height: 28px; flex-shrink: 0; border: none; border-radius: 6px;
  background: transparent; color: #888888; cursor: pointer; padding: 0;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;
}
.bar-x:hover { background: #333333; color: #ffffff; }
.armed-dot { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }
/* Narrow pane: the bar keeps its actions and drops the labels; the armed text shortens first */
@container (max-width: 760px) {
  .bar-hint { display: none; }
}
@container (max-width: 620px) {
  .bar-lbl, .sel-bar .bar-text { display: none; }
}
@container (max-width: 400px) {
  .sel-bar { gap: 6px; padding-left: 8px; }
  .bar-btn { padding: 0 7px; }
  .bar-btn-lbl { display: none; }
}

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
.chip-count { color: #888888; font-weight: 500; font-variant-numeric: tabular-nums; }

/* Constant bottom room, so the last group can always be scrolled above the floating bar */
.plan { flex: 1; overflow-y: auto; padding-bottom: 76px; }

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
/* Insert line under the last group while a group is dragged to the end (same as the group insert line) */
.group-end-line { height: 2px; margin: -6px 14px 4px; background: #0a84ff; border-radius: 1px; pointer-events: none; }
/* A big target under the last group (the list's bottom padding stays below it) */
.gap-end { min-height: 64px; display: flex; align-items: center; justify-content: center; }
</style>
