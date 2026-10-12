<template>
  <!-- Body of the settings panel's Mappings section: assign (Advanced) or pick one (Simple) -->
  <div class="maps-panel">
    <div v-if="!pick" class="hint">Drag onto layers, or click to arm</div>

    <div class="search-bar">
      <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <input type="search" v-model="query" placeholder="Filter mappings..." aria-label="Filter mappings" />
    </div>

    <div class="chips" role="group" aria-label="Filter by mapping type">
      <button
        v-for="t in typeChips"
        :key="t.key"
        type="button"
        class="chip"
        :class="{ on: typeFilter === t.key }"
        :aria-pressed="typeFilter === t.key"
        @click="typeFilter = t.key"
      >{{ t.label }} <span class="cnt">{{ t.count }}</span></button>
    </div>

    <!-- Simple: a fixed-height radio list, so the sections below never move -->
    <div v-if="pick" class="maps pick" role="radiogroup" aria-label="Mapping">
      <!-- The picked mapping outside the filter stays on top as a picked row -->
      <div v-if="pickedHidden" class="pinned">
        <div class="prow on" role="radio" aria-checked="true" title="Selected; not in the current filter">
          <span class="radio"></span>
          <span class="mtext">
            <span class="mname">{{ pickedMapping.name }}</span>
            <span class="mtype">{{ typeOf(pickedMapping) }}, {{ pickedMapping.res }}</span>
          </span>
          <span class="nf">Not in filter</span>
        </div>
      </div>
      <button
        v-for="m in visibleMappings"
        :key="m.path"
        type="button"
        class="prow"
        :class="{ on: picked === m.path }"
        role="radio"
        :aria-checked="picked === m.path"
        @click="picked = m.path"
      >
        <span class="radio"></span>
        <span class="mtext">
          <span class="mname">{{ m.name }}</span>
          <span class="mtype">{{ typeOf(m) }}, {{ m.res }}</span>
        </span>
      </button>
      <div v-if="!visibleMappings.length" class="empty">
        No mappings match the filter.
        <button type="button" class="link" @click="clearFilter">Clear filter</button>
      </div>
    </div>

    <div v-else class="maps">
      <button
        v-for="m in visibleMappings"
        :key="m.path"
        type="button"
        class="map"
        :class="{ armed: armed === m.path }"
        draggable="true"
        :aria-pressed="armed === m.path"
        :title="armed === m.path ? 'Armed: click a layer slot to assign, Esc to cancel' : 'Drag onto a layer slot or a group header, or click to arm'"
        @dragstart="startDrag($event, 'mapping', [m.path])"
        @dragend="endDrag"
        @click="armed = armed === m.path ? null : m.path"
      >
        <svg class="grip" width="10" height="16" viewBox="0 0 10 16" aria-hidden="true"><circle cx="3" cy="3" r="1.3" fill="currentColor"/><circle cx="7" cy="3" r="1.3" fill="currentColor"/><circle cx="3" cy="8" r="1.3" fill="currentColor"/><circle cx="7" cy="8" r="1.3" fill="currentColor"/><circle cx="3" cy="13" r="1.3" fill="currentColor"/><circle cx="7" cy="13" r="1.3" fill="currentColor"/></svg>
        <span class="mtag" :style="{ background: mappingColor(m.path) }"></span>
        <span class="mtext">
          <span class="mname">{{ m.name }}</span>
          <span class="mtype">{{ typeOf(m) }}, {{ m.res }}</span>
        </span>
        <span class="uses" :class="{ zero: !usage[m.path] }">{{ usage[m.path] ? `${usage[m.path]} ${usage[m.path] === 1 ? 'layer' : 'layers'}` : 'unused' }}</span>
      </button>
      <div v-if="!visibleMappings.length" class="empty">No mappings match the filter.</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { mappingColor } from '../../utils/mappingColors';
import { startDrag, endDrag } from '../../composables/useDragPayload';
import { usePersistedRef } from '../../composables/usePersistedRef';

const props = defineProps({
  mappings: { type: Array, required: true },    // getMappingList()
  usage: { type: Object, default: () => ({}) }, // mappingPath -> layers using it
  // Simple: pick one mapping (radio rows, no colour tags, no drag / arm / usage)
  pick: { type: Boolean, default: false }
});
// Path of the mapping armed for click-to-assign (keyboard/mouse alternative to drag & drop)
const armed = defineModel('armed', { type: String, default: null });
// Pick mode: path of the picked mapping
const picked = defineModel('picked', { type: String, default: null });

const typeOf = m => m.typeLabel || m.type || 'Other';

const query = ref('');
// Remembered per viewer; a type missing from this project counts as "All"
const storedTypeFilter = usePersistedRef('mediaSequencer.mappingTypeFilter', 'all', s => s || undefined);
const typeFilter = computed({
  get: () => (typeChips.value.some(t => t.key === storedTypeFilter.value) ? storedTypeFilter.value : 'all'),
  set: v => { storedTypeFilter.value = v; }
});

// Dynamic chips from the types present in the project (docs §11 Q9)
const typeChips = computed(() => {
  const counts = new Map();
  props.mappings.forEach(m => {
    const label = typeOf(m);
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return [
    { key: 'all', label: 'All', count: props.mappings.length },
    ...[...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, count]) => ({ key: label, label, count }))
  ];
});

const visibleMappings = computed(() => {
  const q = query.value.toLowerCase();
  return props.mappings.filter(m =>
    (typeFilter.value === 'all' || typeOf(m) === typeFilter.value) &&
    (!q || m.name.toLowerCase().includes(q)));
});

const pickedMapping = computed(() => props.mappings.find(m => m.path === picked.value) || null);
const pickedHidden = computed(() => !!pickedMapping.value && !visibleMappings.value.includes(pickedMapping.value));

function clearFilter() {
  query.value = '';
  typeFilter.value = 'all';
}
</script>

<style scoped>
* { box-sizing: border-box; }

.hint { font-size: 11px; color: #9c9c9c; margin-bottom: 8px; }

.search-bar { display: flex; align-items: center; background: #181818; border: 1px solid #3a3a3a; border-radius: 6px; padding: 6px 10px; transition: border-color 0.2s ease; }
.search-bar:focus-within { border-color: #0a84ff; }
.search-icon { color: #9c9c9c; margin-right: 8px; flex-shrink: 0; }
.search-bar input { background: transparent; border: none; color: #eeeeee; outline: none; width: 100%; font-size: 12px; }

.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.chip {
  height: 24px; padding: 0 8px; border-radius: 6px;
  border: 1px solid #3a3a3a; background: transparent; color: #aeaeae;
  font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
}
.chip:hover { border-color: #555555; color: #ffffff; }
.chip.on { background: rgba(10, 132, 255, 0.2); border-color: #0a84ff; color: #ffffff; }
.chip .cnt { color: #9c9c9c; font-weight: 500; }

/* Framed scroll well: the list's edges are visible, so cards cut at the top or bottom read as "scroll for more" */
.maps {
  display: flex; flex-direction: column; gap: 6px;
  margin-top: 10px; max-height: 340px; overflow-y: auto;
  padding: 6px;
  background: #181818; border: 1px solid #333333; border-radius: 6px;
}

.map {
  display: flex; align-items: center; gap: 8px;
  width: 100%; min-height: 50px; padding: 8px 10px 8px 6px;
  border: 1px solid #333333; background: #1e1e1e; border-radius: 6px;
  text-align: left; cursor: grab; transition: all 0.2s ease;
}
.map:hover { border-color: #555555; background: #242424; }
.map:active { cursor: grabbing; }
.map:focus-visible { outline: none; border-color: #0a84ff; }
.map.armed { border-color: #0a84ff; background: rgba(10, 132, 255, 0.15); }
.grip { color: #888888; flex-shrink: 0; }
.mtag { width: 5px; align-self: stretch; border-radius: 3px; flex-shrink: 0; }
.mtext { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; line-height: 1.3; }
.mname { font-size: 12px; font-weight: 600; color: #f2f2f2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mtype { font-size: 11px; color: #9c9c9c; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.uses { font-size: 11px; color: #d4d4d4; background: #333333; border-radius: 6px; padding: 1px 6px; flex-shrink: 0; font-variant-numeric: tabular-nums; }
.uses.zero { color: #888888; background: transparent; }
.empty { font-size: 11px; color: #888888; padding: 8px 2px; }

/* Pick mode (Simple): constant height whatever the filter, about 5 rows */
.maps.pick { height: 218px; max-height: none; padding: 4px; gap: 2px; }
.maps.pick .empty { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 6px; }
.prow {
  display: flex; align-items: center; gap: 8px; flex-shrink: 0;
  width: 100%; height: 40px; padding: 0 8px;
  border: 1px solid transparent; background: transparent; border-radius: 6px;
  text-align: left; cursor: pointer; transition: all 0.2s ease;
}
button.prow:hover { border-color: #555555; background: #242424; }
.prow:focus-visible { outline: none; border-color: #0a84ff; }
.prow.on, button.prow.on:hover { border-color: #0a84ff; background: rgba(10, 132, 255, 0.15); }
.prow.on .mname { color: #ffffff; }
.radio {
  width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0;
  border: 1.5px solid #777777; background: #181818;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s ease;
}
button.prow:hover .radio { border-color: #cccccc; }
.prow.on .radio, button.prow.on:hover .radio { border-color: #0a84ff; background: #0a84ff; }
.prow.on .radio::after { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #ffffff; }
/* Opaque and sticky: the filtered rows scroll under it */
.pinned {
  position: sticky; top: -4px; z-index: 1; flex-shrink: 0;
  margin: -4px -4px 2px; padding: 4px 4px 5px;
  background: #181818; border-bottom: 1px solid #333333;
}
.pinned .prow { cursor: default; }
.nf {
  font-size: 10px; font-weight: 600; color: #0a84ff; white-space: nowrap; flex-shrink: 0;
  border: 1px solid rgba(10, 132, 255, 0.45); border-radius: 4px; padding: 1px 6px;
}
.link { background: transparent; border: none; padding: 2px 4px; color: #0a84ff; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.2s ease; }
.link:hover { color: #ffffff; }
.link:focus-visible { outline: none; box-shadow: 0 0 0 2px #0a84ff; border-radius: 4px; }
</style>
