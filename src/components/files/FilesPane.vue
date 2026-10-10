<template>
  <main class="main-content">
    <!-- One row; a narrow pane puts search + refresh on a second row under the title -->
    <header class="top-nav-bar" :class="{ 'has-extra': !!$slots['nav-extra'] }">
      <div class="breadcrumb" :title="breadcrumb.map(c => c.name).join(' / ')">
        <template v-for="(crumb, index) in breadcrumb" :key="crumb.id">
          <span class="crumb-text" @click="$emit('select-folder', crumb.id)">{{ crumb.name }}</span>
          <span v-if="index < breadcrumb.length - 1" class="crumb-divider">/</span>
        </template>
      </div>

      <div class="top-nav-right">
        <div v-if="$slots['nav-extra']" class="nav-extra"><slot name="nav-extra"></slot></div>
        <div class="search-row">
          <div class="search-bar">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" v-model="searchQuery" :placeholder="selectedFolderId === 'all' ? 'Search all files...' : 'Search current folder...'" />
          </div>

          <button
            class="refresh-btn"
            :class="{ 'is-refreshing': isRefreshing }"
            :disabled="isRefreshing"
            title="Refresh media, mappings and tracks"
            @click="$emit('refresh')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
          </button>
        </div>
      </div>
    </header>

    <div class="action-toolbar">
      <div class="selection-group">
        <button
          class="master-checkbox-btn"
          @click.stop="selection.toggleSelectAll"
          :disabled="items.length === 0"
          :title="selection.isAllSelected.value ? 'Deselect All' : 'Select All'"
        >
          <svg v-if="selection.isAllSelected.value && items.length > 0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" stroke="#111111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="3" stroke="none"/><path d="M8 12l3 3 6-6" fill="none" stroke="#111111" stroke-width="3"/></svg>
          <svg v-else-if="selection.isIndeterminate.value" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#666666" stroke="#111111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="3" stroke="none"/><line x1="7" y1="12" x2="17" y2="12" stroke="#111111" stroke-width="3"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="3"/></svg>
        </button>

        <span class="status-text" :title="selection.selectedItems.size > 0 ? `${selection.selectedItems.size} of ${items.length} selected` : `${items.length} item(s)`">
          <template v-if="selection.selectedItems.size > 0">
            <span class="highlight">{{ selection.selectedItems.size }}</span><span class="status-long"> of {{ items.length }} selected</span><span class="status-short">/{{ items.length }}</span>
          </template>
          <template v-else>
            {{ items.length }}<span class="status-long"> item(s)</span>
          </template>
        </span>
      </div>

      <slot name="selection-actions"></slot>

      <div class="view-controls">
        <div class="segmented-control compact grid-size-control" v-if="viewMode === 'grid'">
          <button type="button" class="segment" :class="{ active: gridSize === 'small' }" title="Small thumbnails" @click.stop="gridSize = 'small'">S</button>
          <button type="button" class="segment" :class="{ active: gridSize === 'medium' }" title="Medium thumbnails" @click.stop="gridSize = 'medium'">M</button>
          <button type="button" class="segment" :class="{ active: gridSize === 'large' }" title="Large thumbnails" @click.stop="gridSize = 'large'">L</button>
        </div>

        <div class="segmented-control compact view-mode-control">
          <button type="button" class="segment icon-segment" :class="{ active: viewMode === 'grid' }" title="Grid view" @click.stop="viewMode = 'grid'">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          </button>
          <button type="button" class="segment icon-segment" :class="{ active: viewMode === 'list' }" title="List view" @click.stop="viewMode = 'list'">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
          <button
            type="button"
            class="segment icon-segment subfolder-segment"
            :class="{ active: includeSubfolders }"
            :disabled="selectedFolderId === 'all'"
            :title="selectedFolderId === 'all' ? 'Already showing all files' : (includeSubfolders ? 'Showing files from subfolders' : 'Show files from subfolders')"
            @click.stop="includeSubfolders = !includeSubfolders"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4v14"/>
              <path d="M4 7h4"/>
              <path d="M4 17h4"/>
              <rect x="10" y="4" width="10" height="6" rx="1.5"/>
              <rect x="10" y="14" width="10" height="6" rx="1.5"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div
      class="media-grid"
      ref="gridRef"
      :class="viewMode === 'list' ? 'is-list-view' : `grid-size-${gridSize}`"
      @mousedown="selection.startSelection($event, gridRef)"
    >
      <div v-if="items.length === 0" class="empty-state">
        {{ searchQuery ? 'No files match your search.' : 'No media found.' }}
      </div>

      <MediaCard
        v-for="(item, index) in items"
        :key="item.id"
        :item="item"
        :selected="selection.selectedItems.has(item.id)"
        :director-endpoint="directorEndpoint"
        :view-mode="viewMode"
        :selection-order="selection.selectionOrderMap.value.get(item.id)"
        :show-order="selection.selectedItems.size > 1"
        :details="mediaDetails[item.path]"
        :compact="viewMode === 'grid' && gridSize === 'small'"
        :group-label="(groupLabels[item.path] || []).join(', ')"
        :class="['media-card-item', { 'no-transition': isViewSwitching, 'is-missing': isMissing(item) }]"
        :data-id="item.id"
        :draggable="dragEnabled && !isMissing(item) ? 'true' : null"
        @click.stop="selection.handleSelection(item, index, $event)"
        @dragstart="onFileDragStart($event, item)"
        @dragend="endDrag"
      />
      <div v-if="selection.isSelecting.value" class="selection-marquee" :style="selection.selectionFrameStyle.value"></div>
    </div>
  </main>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import MediaCard from './MediaCard.vue';
import { startDrag, endDrag } from '../../composables/useDragPayload';

const props = defineProps({
  items: { type: Array, required: true },
  breadcrumb: { type: Array, required: true },
  selectedFolderId: { type: String, required: true },
  isRefreshing: { type: Boolean, default: false },
  directorEndpoint: { type: String, required: true },
  // getMediaDetails() result keyed by clip path
  mediaDetails: { type: Object, default: () => ({}) },
  // clip path -> ['G1', 'G3'] (Advanced plan membership)
  groupLabels: { type: Object, default: () => ({}) },
  // Advanced with the plan visible: files can be dragged into plan groups
  dragEnabled: { type: Boolean, default: false },
  // return value of useFileSelection()
  selection: { type: Object, required: true }
});
defineEmits(['select-folder', 'refresh']);

const searchQuery = defineModel('searchQuery', { type: String, default: '' });
const viewMode = defineModel('viewMode', { type: String, default: 'grid' });
const gridSize = defineModel('gridSize', { type: String, default: 'medium' });
const includeSubfolders = defineModel('includeSubfolders', { type: Boolean, default: false });

const gridRef = ref(null);

// Media deleted in Designer: shown with a badge, cannot be selected or dragged into the plan
const isMissing = item => !!props.mediaDetails[item.path]?.missing;

/** Dragging a selected file drags the whole selection (in selection order), otherwise just this file. */
function onFileDragStart(event, item) {
  if (!props.dragEnabled || isMissing(item)) return;
  const selected = props.selection.selectedItems;
  let paths = [item.path];
  if (selected.has(item.id)) {
    const byId = new Map(props.items.map(i => [i.id, i.path]));
    paths = Array.from(selected).map(id => byId.get(id)).filter(Boolean);
  }
  startDrag(event, 'files', paths);
}

// Switching view mode changes a card's border/box-shadow/background via CSS
// classes while its size snaps instantly (size isn't transitioned) - without
// this, the color/glow transition keeps animating for 200ms around the
// already-reshaped card, which reads as a flash. Suppress transitions for the
// one frame the class change lands, then restore them for hover/click feedback.
const isViewSwitching = ref(false);
watch(viewMode, () => {
  isViewSwitching.value = true;
  nextTick(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isViewSwitching.value = false;
      });
    });
  });
});
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: transparent;
  height: 100%;
  overflow: hidden;
  position: relative;
}
.top-nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 52px;
  padding: 0 24px;
  background-color: transparent;
  border-bottom: 1px solid #222222;
  flex-shrink: 0;
}
.top-nav-bar { gap: 12px; }
.breadcrumb { display: flex; align-items: center; font-size: 14px; text-transform: uppercase; font-weight: 600; min-width: 0; overflow: hidden; white-space: nowrap; flex: 0 1 auto; }
.crumb-text { cursor: pointer; color: #888888; transition: color 0.2s; }
.crumb-text:hover { color: #ffffff; }
.crumb-text:last-child { color: #dddddd; cursor: default; }
.crumb-divider { margin: 0 8px; color: #444444; font-weight: 400;}
.top-nav-right { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex: 1 1 0; min-width: 0; }
.nav-extra { display: flex; flex-shrink: 0; }
.search-row { display: flex; align-items: center; gap: 8px; flex: 0 1 300px; min-width: 0; }
/* In one row the search keeps a usable width and the path ends with an ellipsis instead */
.search-bar { display: flex; align-items: center; background: #151515; border: 1px solid #333333; border-radius: 6px; padding: 6px 12px; flex: 1 1 auto; min-width: 120px; }
.search-bar input { min-width: 0; }

/*
 * Narrow pane: title on the first row (with the workspace switch in the Files layout), search
 * and refresh on a second row at full width. The switch needs room too, so a bar with it
 * switches earlier.
 */
@container (max-width: 500px) {
  .top-nav-bar { padding: 0 12px; }
}
@container (max-width: 380px) {
  .top-nav-bar {
    display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "crumb extra" "search search";
    align-items: center; row-gap: 8px; column-gap: 8px; height: auto; min-height: 52px; padding: 10px 12px;
  }
  .top-nav-right { display: contents; }
  .breadcrumb { grid-area: crumb; }
  .nav-extra { grid-area: extra; }
  .search-row { grid-area: search; }
}
@container (max-width: 480px) {
  .top-nav-bar.has-extra {
    display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "crumb extra" "search search";
    align-items: center; row-gap: 8px; column-gap: 8px; height: auto; min-height: 52px; padding: 10px 12px;
  }
  .has-extra .top-nav-right { display: contents; }
  .has-extra .breadcrumb { grid-area: crumb; }
  .has-extra .nav-extra { grid-area: extra; }
  .has-extra .search-row { grid-area: search; }
}
.search-bar:focus-within { border-color: #666666; }
.search-icon { color: #666666; margin-right: 8px; }
.search-bar input { background: transparent; border: none; color: #cccccc; outline: none; width: 100%; font-size: 12px; }

.refresh-btn {
  background: transparent;
  border: 1px solid #333333;
  color: #888888;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
  flex-shrink: 0;
}
.refresh-btn:hover:not(:disabled) { color: #ffffff; border-color: #555555; background: #1f1f1f; }
.refresh-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.refresh-btn.is-refreshing svg { animation: spin 0.8s linear infinite; }

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.action-toolbar {
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  background-color: #1a1a1a;
  border-bottom: 1px solid #2a2a2a;
  flex-shrink: 0;
}
.selection-group { display: flex; align-items: center; gap: 12px; }
.action-toolbar { gap: 12px; }
.master-checkbox-btn { background: transparent; border: none; color: #777777; padding: 4px; margin-left: -4px; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: all 0.2s; }
.master-checkbox-btn:hover:not(:disabled) { background: #2a2a2a; color: #ffffff; }
.master-checkbox-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.status-text { font-size: 12px; color: #888888; white-space: nowrap; }
.highlight { color: #ffffff; font-weight: 600; }
.status-short { display: none; }

/* The toolbar stays one row in a narrow pane: the size toggle goes first, then the counter shortens */
.main-content { container-type: inline-size; }
.selection-group { flex-shrink: 0; }
.view-controls { flex-shrink: 0; }
@container (max-width: 500px) {
  .action-toolbar { padding: 0 12px; }
  .view-controls .segmented-control.grid-size-control { display: none; }
}
@container (max-width: 340px) {
  .status-long { display: none; }
  .status-short { display: inline; }
  .action-toolbar, .selection-group { gap: 8px; }
  .action-toolbar { padding: 0 8px; }
  .view-controls .segmented-control.compact .segment.icon-segment { padding: 5px 5px; }
  .view-controls .subfolder-segment { margin-left: 4px; }
}

/* --- View controls --- */
.view-controls { display: flex; align-items: center; gap: 8px; margin-left: auto; }

.segmented-control {
  display: flex;
  background: #181818;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  padding: 2px;
  width: 100%;
}
.segment {
  flex: 1;
  background: transparent;
  border: none;
  color: #888;
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}
.segment:hover:not(:disabled) { color: #ccc; }
.segment.active {
  background: #3a3a3a;
  color: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
.segment:disabled { opacity: 0.3; cursor: not-allowed; }
.segmented-control.compact { display: inline-flex; width: auto; padding: 2px; }
.segmented-control.compact .segment { flex: none; width: auto; padding: 5px 10px; }
.segmented-control.compact .segment.icon-segment { display: flex; align-items: center; justify-content: center; padding: 5px 8px; }
.subfolder-segment { margin-left: 6px; position: relative; }
.subfolder-segment::before { content: ''; position: absolute; left: -4px; top: 3px; bottom: 3px; width: 1px; background: #3a3a3a; }

/* --- Grid View --- */
.media-grid {
  display: grid;
  gap: 16px;
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  align-content: start;
  position: relative;
}
.media-grid.grid-size-small { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); grid-auto-rows: 100px; }
.media-grid.grid-size-medium { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); grid-auto-rows: 140px; }
.media-grid.grid-size-large { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); grid-auto-rows: 190px; }

/* --- List View --- */
.media-grid.is-list-view {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.empty-state { grid-column: 1 / -1; text-align: center; padding: 40px; color: #555555; font-size: 14px; }
.selection-marquee {
  position: absolute;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.4);
  pointer-events: none;
  z-index: 100;
}
</style>
