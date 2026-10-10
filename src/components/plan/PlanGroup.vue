<template>
  <section
    class="group"
    :class="{ 'is-flash': flash, 'is-drop': groupOver }"
    :id="`plan-group-${group.id}`"
    @dragover="onGroupOver"
    @dragleave="onGroupLeave"
    @drop="onGroupDrop"
  >
    <header
      class="g-head"
      :class="{ 'map-over': headOver }"
      title="Drop a mapping here to assign it to every layer in this group"
      @dragover="onHeadOver"
      @dragleave="onHeadLeave"
      @drop="onHeadDrop"
    >
      <button type="button" class="chev" :class="{ 'is-open': group.open }" :aria-expanded="group.open" :aria-label="(group.open ? 'Collapse ' : 'Expand ') + label" @click="$emit('toggle')">
        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M3 1.5 L8 5 L3 8.5 Z" fill="currentColor"/></svg>
      </button>
      <span class="g-label">{{ label }}</span>
      <input class="g-name" type="text" :value="group.name" aria-label="Group name" @change="$emit('rename', $event.target.value)" />
      <div class="g-span" title="Group position on the plan timeline">
        <span class="span" :style="spanStyle"></span>
        <span v-for="(p, i) in splitMarks" :key="'s' + i" class="mk-split" :style="{ left: p + '%' }"></span>
        <span v-for="(p, i) in tagMarks" :key="'t' + i" class="mk-tag" :style="{ left: p + '%' }"></span>
      </div>
      <span class="g-meta" :class="{ 'is-drop': headOver }">{{ headOver ? `Assign to all ${group.items.length}` : meta }}</span>
      <div class="g-actions">
        <button type="button" class="icon-btn" title="Group and its layers back to Plan defaults" aria-label="Reset group settings to Plan defaults" :disabled="!groupHasOverrides" @click="$emit('reset-group')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
        <button type="button" class="icon-btn" title="Clear mappings in this group" aria-label="Clear mappings in this group" :disabled="!hasMappings" @click="$emit('clear-group')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H9L4 15l10-10 7 7-6 6"/><path d="m9 10 6 6"/></svg>
        </button>
        <button type="button" class="icon-btn" title="Delete group" aria-label="Delete group" @click="$emit('remove')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
        </button>
      </div>
    </header>

    <template v-if="group.open">
      <div class="g-set">
        <!-- Select-all sits above the row checkboxes, so the group needs no column header row -->
        <span class="selall-cell">
          <button
            v-if="rows.length"
            type="button"
            class="cb selall"
            :class="{ on: allChecked, part: someChecked && !allChecked }"
            :aria-pressed="allChecked"
            :aria-label="(allChecked ? 'Deselect all layers in ' : 'Select all layers in ') + label"
            :title="(allChecked ? 'Deselect all layers in ' : 'Select all layers in ') + label"
            @click="$emit('group-check')"
          >
            <svg v-if="allChecked" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>
            <svg v-else-if="someChecked" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"><path d="M6 12h12"/></svg>
          </button>
        </span>
        <ChipRow ref="chipRow" :chips="chips" :open-key="openChip" :scope="selScope" @open="toggleChip" />
      </div>

      <ChipPopover
        v-if="openSpec"
        :anchor="chipRow?.anchorOf(openChip)"
        :keep-open-on="chipRow?.rowEl"
        :chip-key="openSpec.key"
        :values="popValues.values"
        :mixed="popValues.mixed"
        :globals="globals"
        :tag="popLayers ? `${selInGroup.length} ${selInGroup.length === 1 ? 'layer' : 'layers'}` : label"
        :reset="popLayers
          ? { enabled: openSpec.ov, tip: 'Selected layers back to the group value' }
          : { enabled: openSpec.ov, tip: 'Back to the Plan default' }"
        :secondary="popLayers
          ? { label: 'Apply to whole group', disabled: openSpec.mixed, tip: openSpec.mixed ? 'The selected layers have different values' : 'The value goes to the group and is removed from its layers' }
          : { label: 'Apply to all groups', tip: 'The value becomes the Plan default and is removed from every group' }"
        :layer-note="popLayers ? 0 : openSpec.layerCount"
        @patch="onPatch"
        @reset="onReset"
        @secondary="onSecondary"
        @reset-layers="$emit('set-layer-ov', layerIdsOverriding(openSpec.keys), null, openSpec.keys)"
        @close="closePop"
      />

      <div v-if="rows.length" class="rows" :class="{ 'has-sel': anySelected }">
        <div
          v-for="row in rows"
          :key="row.id"
          class="row"
          :class="{
            'is-checked': checked.has(row.id),
            'is-dragging': draggingRows && dragPayload.ids.includes(row.id),
            'drop-before': rowOver?.id === row.id && rowOver.pos === 'before',
            'drop-after': rowOver?.id === row.id && rowOver.pos === 'after'
          }"
          draggable="true"
          :aria-selected="checked.has(row.id)"
          title="Click to select, Ctrl/Cmd+click to add, Shift+click for a range, drag to move"
          @click="$emit('row-click', row.id, $event)"
          @dragstart="onRowDragStart($event, row)"
          @dragend="onDragEnd"
          @dragover="onRowOver($event, row)"
          @dragleave="onRowLeave($event, row)"
          @drop="onRowDrop($event, row)"
        >
          <span class="ord-cell">
            <span class="ord">{{ row.index }}</span>
            <button
              type="button"
              class="cb"
              :class="{ on: checked.has(row.id) }"
              :aria-pressed="checked.has(row.id)"
              :aria-label="(checked.has(row.id) ? 'Deselect ' : 'Select ') + row.name"
              @click.stop="$emit('row-check', row.id)"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>
            </button>
          </span>
          <span class="thumb">
            <img v-if="row.thumbUrl && !brokenThumbs[row.id]" :src="row.thumbUrl" alt="" @error="brokenThumbs[row.id] = true" />
          </span>
          <div class="pname">
            <div class="pname-txt" :title="row.name">
              <button
                v-if="row.ovText"
                type="button"
                class="ov-mark"
                :title="`Layer overrides: ${row.ovText}. Click to edit this layer.`"
                :aria-label="`${row.name} overrides: ${row.ovText}`"
                @click.stop="onOvMark(row.id)"
              >◆</button>{{ row.name }}
            </div>
            <div class="pname-sub">{{ row.sub }}</div>
          </div>
          <div
            class="slot"
            :class="{ assigned: !!row.mappingPath, ready: slotsReady, over: overSlot === row.id, missing: row.mappingMissing }"
            role="button"
            tabindex="0"
            :title="slotTitle(row)"
            :aria-label="slotTitle(row)"
            @click.stop="onSlotClick(row)"
            @keydown.enter.prevent="onSlotClick(row)"
            @dragover="onSlotOver($event, row)"
            @dragleave="onSlotLeave(row)"
            @drop="onSlotDrop($event, row)"
          >
            <span class="dot" :style="{ background: row.color }"></span>
            <template v-if="row.mappingPath">
              <span class="sname">{{ row.mappingName }}</span>
              <span v-if="row.via" class="via" :title="row.via === 'name' ? 'Auto-assigned: file name matches' : 'Auto-assigned: resolution matches'">{{ row.via }}</span>
              <button type="button" class="slot-x" :aria-label="`Clear mapping of ${row.name}`" title="Clear mapping" @click.stop="$emit('clear-entries', [row.id])">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </template>
            <span v-else class="sname empty-slot">{{ armed ? 'Click to assign' : 'Drop mapping here' }}</span>
          </div>
          <button type="button" class="icon-btn" :aria-label="`Remove ${row.name} from ${label}`" title="Remove from group" @click.stop="$emit('remove-entry', row.id)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
      <div v-else class="g-empty">Empty group. Select files and use "Add to group", or drag files or rows here.</div>
    </template>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { formatClock, formatDuration } from '../../utils/format';
import { mappingColor } from '../../utils/mappingColors';
import { dragPayload, startDrag, endDrag } from '../../composables/useDragPayload';
import { CHIPS, LAYER_KEYS, chipValue, chipLongValue, chipWarning, effectiveLayer, describeOverrides, sameValue } from '../../utils/planSchema';
import { groupMarkerTimes } from '../../utils/planLayout';
import ChipRow from './ChipRow.vue';
import ChipPopover from './ChipPopover.vue';

const props = defineProps({
  group: { type: Object, required: true },
  index: { type: Number, required: true },
  layout: { type: Object, required: true },       // { start, end, rows, starts, closing, values }
  globals: { type: Object, default: () => ({ tagsOn: true, splitOn: true }) },
  total: { type: Number, required: true },        // plan length in seconds
  rowOffset: { type: Number, default: 0 },        // global layer number before this group
  entries: { type: Object, required: true },
  filesByPath: { type: Object, required: true },  // clip path -> file node { name, uid }
  details: { type: Object, required: true },
  thumbBase: { type: String, default: '' },       // http://director/api/v1/thumbnail/
  showSplits: { type: Boolean, default: false },
  showTags: { type: Boolean, default: false },
  flash: { type: Boolean, default: false },
  mappingsByPath: { type: Object, default: () => ({}) }, // mapping path -> mapping
  armed: { type: String, default: null },                 // armed mapping path (click-to-assign)
  checked: { type: Set, default: () => new Set() },       // selected entry ids (whole plan)
  selectedIds: { type: Array, default: () => [] },        // selected entry ids in plan order
  anySelected: { type: Boolean, default: false }
});
const emit = defineEmits(['toggle', 'rename', 'remove', 'remove-entry',
  'assign', 'clear-entries', 'assign-group', 'clear-group',
  'row-click', 'row-check', 'group-check', 'drop-rows', 'drop-files', 'drop-folders',
  'set-group-ov', 'set-layer-ov', 'reset-group', 'apply-to-all', 'apply-to-group']);

// --- Settings chips (Phase 7 / 8b, docs §2.4 / §2.5.1 / §2.6) ---
const selInGroup = computed(() => props.group.items.filter(id => props.checked.has(id)));
/** Selection scope: rows of this group are selected and the selection bar is not on "Group". */
const selScope = computed(() => selInGroup.value.length > 0 && props.group.scope !== 'group');
const hasOv = id => Object.keys(props.entries[id]?.ov || {}).length > 0;
const layerValues = id => effectiveLayer(props.layout.values, props.entries[id]);

/** Values the editor shows: the group's effective values, or the selection's with mixed keys. */
const scopeValues = computed(() => {
  if (!selScope.value) return { values: props.layout.values, mixed: new Set() };
  const all = selInGroup.value.map(layerValues);
  const mixed = new Set(LAYER_KEYS.filter(k => all.some(v => !sameValue(k, v[k], all[0][k]))));
  return { values: all[0], mixed };
});

function layerIdsOverriding(keys) {
  return props.group.items.filter(id => keys.some(k => k in (props.entries[id]?.ov || {})));
}

/** A chip edits the selected layers in selection scope; group-only chips (Start / Tags / Split) always edit the group. */
const editsLayers = c => selScope.value && !c.groupOnly;

function chipInfo(c) {
  const { values, mixed } = editsLayers(c) ? scopeValues.value : { values: props.layout.values, mixed: new Set() };
  const warn = chipWarning(c.key, values);
  if (editsLayers(c)) {
    const isMixed = c.keys.some(k => mixed.has(k));
    const ov = selInGroup.value.some(id => c.keys.some(k => k in (props.entries[id]?.ov || {})));
    const long = isMixed ? 'Mixed' : chipLongValue(c.key, values, props.globals);
    return {
      ...c, layerCount: 0, ov, mixed: isMixed, off: false, warn: isMixed ? '' : warn,
      value: isMixed ? 'Mixed' : chipValue(c.key, values, props.globals),
      tip: `${c.title}: ${long}. ${ov ? 'Set on selected layers' : 'Inherited from the group'}${warn && !isMixed ? `. ${warn}` : ''}`
    };
  }
  const layerCount = layerIdsOverriding(c.keys).length;
  const ov = c.keys.some(k => k in props.group.ov);
  const off = (c.key === 'tags' && !props.globals.tagsOn) || (c.key === 'split' && !props.globals.splitOn);
  const long = off ? `${chipLongValue(c.key, values, { tagsOn: true, splitOn: true })}, off for the whole plan` : chipLongValue(c.key, values, props.globals);
  const from = ov ? 'Set on this group' : 'Inherited from Plan defaults';
  const tail = layerCount ? `, ${layerCount} ${layerCount === 1 ? 'layer overrides' : 'layers override'} it` : '';
  return {
    ...c, layerCount, ov, mixed: false, off, warn,
    value: chipValue(c.key, values, props.globals),
    tip: `${c.title}: ${long}. ${from}${tail}${warn ? `. ${warn}` : ''}`
  };
}

const chips = computed(() => CHIPS.map(chipInfo));
const chipRow = ref(null);
const openChip = ref(null);
const openSpec = computed(() => chips.value.find(c => c.key === openChip.value) || null);
/** The open popover edits the selected layers (otherwise the group). */
const popLayers = computed(() => !!openSpec.value && editsLayers(openSpec.value));
const popValues = computed(() => (popLayers.value ? scopeValues.value : { values: props.layout.values, mixed: new Set() }));
const groupHasOverrides = computed(() => Object.keys(props.group.ov).length > 0 || props.group.items.some(hasOv));

// The group collapsed (or the chip is gone): close
watch([openSpec, () => props.group.open], ([spec, open]) => { if ((!spec || !open) && openChip.value) closePop(); });

function closePop() {
  openChip.value = null;
}
function toggleChip(key) {
  openChip.value = openChip.value === key ? null : key;
}
function onPatch(patch) {
  if (popLayers.value) emit('set-layer-ov', selInGroup.value, patch);
  else emit('set-group-ov', patch);
}
function onReset() {
  const keys = openSpec.value.keys;
  if (popLayers.value) emit('set-layer-ov', selInGroup.value, null, keys);
  else emit('set-group-ov', {}, keys);
}
function onSecondary() {
  const keys = openSpec.value.keys;
  if (popLayers.value) emit('apply-to-group', selInGroup.value, keys);
  else emit('apply-to-all', keys);
}
/** ◆ on a row: select that layer, which puts the group into selection scope. */
function onOvMark(id) {
  emit('row-click', id, { ctrlKey: false, metaKey: false, shiftKey: false });
}

const allChecked = computed(() => props.group.items.length > 0 && props.group.items.every(id => props.checked.has(id)));
const someChecked = computed(() => props.group.items.some(id => props.checked.has(id)));

/** A mapping applied to a selected row goes to the whole selection (docs §2.4). */
function targetsFor(rowId) {
  return props.checked.has(rowId) ? props.selectedIds : [rowId];
}

// --- Row / file drag and drop ---
const rowOver = ref(null);   // { id, pos: 'before' | 'after' }
const groupOver = ref(false);
const draggingRows = computed(() => dragPayload.kind === 'rows');
const draggingMovable = computed(() => ['rows', 'files', 'folders'].includes(dragPayload.kind));

function onRowDragStart(event, row) {
  event.stopPropagation();
  startDrag(event, 'rows', targetsFor(row.id));
}
function onDragEnd() {
  rowOver.value = null;
  groupOver.value = false;
  endDrag();
}
function onRowOver(event, row) {
  if (!draggingMovable.value) return;
  event.preventDefault();
  event.stopPropagation();
  const rect = event.currentTarget.getBoundingClientRect();
  const pos = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
  if (rowOver.value?.id !== row.id || rowOver.value.pos !== pos) rowOver.value = { id: row.id, pos };
  groupOver.value = false;
}
function onRowLeave(event, row) {
  if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) return;
  if (rowOver.value?.id === row.id) rowOver.value = null;
}
function onRowDrop(event, row) {
  if (!draggingMovable.value) return;
  event.preventDefault();
  event.stopPropagation();
  emitDrop(row.id, rowOver.value?.pos || 'after');
}
function onGroupOver(event) {
  if (!draggingMovable.value) return;
  event.preventDefault();
  groupOver.value = true;
}
function onGroupLeave(event) {
  if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) return;
  groupOver.value = false;
}
function onGroupDrop(event) {
  if (!draggingMovable.value) return;
  event.preventDefault();
  emitDrop(null, 'after');
}
function emitDrop(targetId, pos) {
  const ids = [...dragPayload.ids];
  if (dragPayload.kind === 'rows') emit('drop-rows', { ids, targetId, pos });
  else if (dragPayload.kind === 'folders') emit('drop-folders', { folderIds: ids, targetId, pos });
  else emit('drop-files', { paths: ids, targetId, pos });
  rowOver.value = null;
  groupOver.value = false;
  endDrag();
}

const brokenThumbs = reactive({});

// --- Mapping drop targets ---
const overSlot = ref(null);
const headOver = ref(false);
const draggingMapping = computed(() => dragPayload.kind === 'mapping');
const slotsReady = computed(() => draggingMapping.value || !!props.armed);
const hasMappings = computed(() => props.group.items.some(id => props.entries[id]?.mappingPath));

function slotTitle(row) {
  if (row.mappingMissing) return `Mapping not found in the project: ${row.mappingPath}`;
  if (row.mappingPath) return `Mapping: ${row.mappingName}`;
  return props.armed ? 'Click to assign the armed mapping' : 'Drop a mapping here';
}
function onSlotClick(row) {
  if (props.armed) emit('assign', targetsFor(row.id), props.armed);
  else emit('row-click', row.id, { ctrlKey: false, metaKey: false, shiftKey: false });
}
function onSlotOver(event, row) {
  if (!draggingMapping.value) return;
  event.preventDefault();
  event.stopPropagation();
  overSlot.value = row.id;
}
function onSlotLeave(row) {
  if (overSlot.value === row.id) overSlot.value = null;
}
function onSlotDrop(event, row) {
  if (!draggingMapping.value) return;
  event.preventDefault();
  event.stopPropagation();
  emit('assign', targetsFor(row.id), dragPayload.ids[0]);
  overSlot.value = null;
  endDrag();
}
function onHeadOver(event) {
  if (!draggingMapping.value) return;
  event.preventDefault();
  headOver.value = true;
}
function onHeadLeave(event) {
  if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) return;
  headOver.value = false;
}
function onHeadDrop(event) {
  if (!draggingMapping.value) return;
  event.preventDefault();
  emit('assign-group', dragPayload.ids[0]);
  headOver.value = false;
  endDrag();
}

const label = computed(() => `G${props.index + 1}`);
const pct = x => (props.total > 0 ? (x / props.total) * 100 : 0);

const spanStyle = computed(() => ({
  left: pct(props.layout.start) + '%',
  width: Math.max(0.8, pct(props.layout.end - props.layout.start)) + '%'
}));
// Same placement rules as plan_prepare.py (utils/planLayout.js)
const markerTimes = computed(() => groupMarkerTimes(props.layout));
const splitMarks = computed(() => (props.showSplits ? markerTimes.value.splits.map(pct) : []));
const tagMarks = computed(() => (props.showTags ? markerTimes.value.tags.map(pct) : []));

const meta = computed(() => {
  const n = props.group.items.length;
  const length = formatDuration(props.layout.end - props.layout.start) || '0s';
  return `${n} ${n === 1 ? 'file' : 'files'}, ${length}`;
});

const rows = computed(() => props.layout.rows.map((r, i) => {
  const mediaId = props.entries[r.id]?.mediaId;
  const file = props.filesByPath[mediaId];
  const det = props.details[mediaId];
  const name = file?.name || (mediaId || '').split('/').pop();
  const sub = [formatClock(r.start), formatDuration(r.duration), det?.res].filter(Boolean).join(', ');
  const mappingPath = props.entries[r.id]?.mappingPath || null;
  const mapping = mappingPath ? props.mappingsByPath[mappingPath] : null;
  const ov = props.entries[r.id]?.ov || {};
  return {
    ovText: Object.keys(ov).length ? describeOverrides(ov, layerValues(r.id)) : '',
    mappingPath,
    mappingName: mapping?.name || (mappingPath || '').split('/').pop().replace(/\.apx$/i, ''),
    mappingMissing: !!mappingPath && !mapping,
    via: mappingPath ? props.entries[r.id]?.via || null : null,
    color: mappingColor(mappingPath),
    id: r.id,
    index: props.rowOffset + i + 1,
    name,
    sub,
    thumbUrl: file?.uid && props.thumbBase ? props.thumbBase + file.uid : null
  };
}));
</script>

<style scoped>
* { box-sizing: border-box; }

.group {
  border: 1px solid #333333;
  border-radius: 6px;
  background: #1e1e1e;
  margin: 10px 14px;
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
}
.group.is-flash { border-color: #0a84ff; box-shadow: 0 0 0 1px #0a84ff; }
.group.is-drop { border-color: #0a84ff; box-shadow: 0 0 0 1px #0a84ff; }

.g-head {
  display: grid;
  grid-template-columns: 22px 34px minmax(120px, 1fr) minmax(60px, 140px) auto auto;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #242424;
  border-radius: 6px;
}
.group:has(.g-set) .g-head { border-radius: 6px 6px 0 0; }

.chev {
  width: 22px; height: 22px;
  border: none; background: transparent; color: #aaaaaa;
  display: flex; align-items: center; justify-content: center;
  border-radius: 4px; cursor: pointer; padding: 0;
}
.chev svg { transition: transform 0.18s ease; }
.chev.is-open svg { transform: rotate(90deg); }
.chev:hover { color: #ffffff; }

.g-label {
  font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
  height: 22px; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  background: #0a84ff; color: #ffffff;
}

.g-name {
  min-width: 0; height: 28px;
  background: transparent; border: 1px solid transparent; border-radius: 6px;
  color: #dddddd; font: inherit; font-size: 13px; font-weight: 600;
  padding: 0 6px; outline: none; transition: border-color 0.2s ease;
}
.g-name:hover { border-color: #3a3a3a; }
.g-name:focus { border-color: #0a84ff; background: #181818; }

.g-span { position: relative; height: 14px; background: #151515; border-radius: 3px; min-width: 0; }
.g-span .span { position: absolute; top: 3px; bottom: 3px; background: #3a3a3a; border-radius: 2px; }
.mk-split { position: absolute; top: 0; bottom: 0; width: 2px; background: #dddddd; transform: translateX(-1px); }
.mk-tag { position: absolute; top: 3px; width: 7px; height: 7px; background: #0a84ff; transform: translateX(-50%) rotate(45deg); }

.g-meta { font-size: 11px; color: #888888; white-space: nowrap; font-variant-numeric: tabular-nums; }
.g-meta.is-drop { color: #0a84ff; font-weight: 600; }
.g-head.map-over { box-shadow: inset 0 0 0 1px #0a84ff; background: rgba(10, 132, 255, 0.15); }
.g-actions { display: flex; gap: 2px; }
.icon-btn:disabled { opacity: 0.35; cursor: not-allowed; background: transparent; color: #888888; }

.icon-btn {
  width: 24px; height: 24px; border: none; border-radius: 4px;
  background: transparent; color: #888888;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; padding: 0; transition: all 0.2s ease;
}
.icon-btn:hover { background: #333333; color: #ffffff; }

.g-set {
  display: flex; align-items: center; gap: 10px;
  /* left padding matches .row so the select-all lines up with the row checkboxes */
  padding: 8px 12px 8px 10px; border-top: 1px solid #2a2a2a; background: #1e1e1e;
}
.selall-cell { width: 26px; height: 24px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }

.ov-mark {
  border: none; background: transparent; padding: 0 5px 0 0;
  color: #ffd60a; font-size: 10px; cursor: pointer; vertical-align: 1px;
}
.ov-mark:hover { color: #ffffff; }

.rows { border-top: 1px solid #2a2a2a; }
.row {
  display: grid;
  grid-template-columns: 26px 40px minmax(0, 1fr) minmax(140px, 200px) 26px;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 10px;
  border-bottom: 1px solid #222222;
}
.row:last-child { border-bottom: none; }
.row { cursor: default; user-select: none; position: relative; }
.row:hover { background: #242424; }
/* Selection is colour only: nothing changes size when rows are checked */
.row.is-checked { background: rgba(10, 132, 255, 0.10); }
.row.is-checked:hover { background: rgba(10, 132, 255, 0.15); }
.row.is-dragging { opacity: 0.4; }
.row.drop-before { box-shadow: inset 0 2px 0 #0a84ff; }
.row.drop-after { box-shadow: inset 0 -2px 0 #0a84ff; }

.ord-cell { width: 26px; height: 22px; display: flex; align-items: center; justify-content: center; }
.ord { font-size: 11px; color: #888888; text-align: center; font-variant-numeric: tabular-nums; }
.cb {
  display: none;
  width: 16px; height: 16px; padding: 0;
  border: 1.5px solid #777777; border-radius: 4px; background: #181818; color: transparent;
  align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease;
}
.cb:hover { border-color: #cccccc; }
.cb.on, .cb.part { background: #0a84ff; border-color: #0a84ff; color: #ffffff; }
.cb:focus-visible { box-shadow: 0 0 0 2px #0a84ff; }
.cb.selall { display: flex; }
/* Checkbox replaces the row number on hover, and everywhere while the plan has a selection */
.row:hover .cb, .rows.has-sel .cb, .cb:focus-visible { display: flex; }
.row:hover .ord, .rows.has-sel .ord { display: none; }
.thumb { width: 40px; height: 26px; border-radius: 4px; background: #151515; overflow: hidden; }
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pname { min-width: 0; }
.pname-txt { font-size: 12px; color: #cccccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pname-sub { font-size: 11px; color: #666666; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.slot {
  display: flex; align-items: center; gap: 8px;
  height: 30px; padding: 0 4px 0 10px; min-width: 0;
  border: 1px dashed #3a3a3a; border-radius: 6px; background: #181818;
  font-size: 12px; cursor: default; outline: none; transition: all 0.2s ease;
}
.slot.assigned { border-style: solid; background: #242424; }
.slot.ready { border-color: #0a84ff; cursor: pointer; }
.slot.over { border-style: solid; border-color: #0a84ff; background: rgba(10, 132, 255, 0.2); }
.slot.missing { border-color: #ef4444; }
.slot:focus-visible { border-color: #0a84ff; box-shadow: 0 0 0 1px #0a84ff; }
.dot { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }
.sname { flex: 1; min-width: 0; color: #dddddd; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sname.empty-slot { color: #666666; font-style: italic; }
.via {
  flex-shrink: 0; padding: 1px 5px; border-radius: 4px;
  background: rgba(10, 132, 255, 0.15); color: #0a84ff;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;
}
.slot-x {
  width: 20px; height: 20px; flex-shrink: 0; border: none; border-radius: 4px;
  background: transparent; color: #888888; cursor: pointer; padding: 0;
  display: flex; align-items: center; justify-content: center;
}
.slot-x:hover { background: #3a3a3a; color: #ffffff; }

/* Narrow plan pane (small window): drop the mini-timeline and thumbnails so names and slots fit */
.group { container-type: inline-size; }
@container (max-width: 460px) {
  .g-head { grid-template-columns: 22px 34px minmax(0, 1fr) auto auto; gap: 6px; padding: 8px; }
  .g-span { display: none; }
  .row { grid-template-columns: 26px minmax(0, 1fr) minmax(84px, 38%) 24px; gap: 8px; padding: 0 8px; }
  .thumb { display: none; }
  .g-set { padding: 8px 8px; gap: 8px; }
}
/* Minimum plan width: the name needs the room more than "6 files, 1m 51s" (the gnav chip has the count) */
@container (max-width: 300px) {
  .g-meta { display: none; }
}

.g-empty { padding: 14px; text-align: center; color: #666666; font-size: 12px; border-top: 1px solid #2a2a2a; }
</style>
