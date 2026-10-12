<template>
  <aside
    class="tree-sidebar"
    :class="{ 'is-collapsed': isSidebarCollapsed, 'is-resizing': isResizing }"
    :style="{ width: isSidebarCollapsed ? '50px' : `${sidebarWidth}px`, minWidth: isSidebarCollapsed ? '50px' : `${sidebarWidth}px` }"
    @click.stop
  >
    <div class="tree-sidebar-header">
      <button class="panel-toggle-btn" @click="toggleSidebar" title="Toggle Sidebar">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" x2="9" y1="3" y2="21"/></svg>
      </button>
      <span class="tree-header-title" :class="{ 'hidden': isSidebarCollapsed }">HIERARCHY</span>
    </div>

    <div class="tree-container" :class="{ 'hidden': isSidebarCollapsed, 'has-checked': selectEnabled && checkedFolders.size > 0 }" @keydown.esc="$emit('clear-checked')">
      <div
        v-for="node in folders"
        :key="node.id"
        :class="['tree-item', { 'is-selected': selectedFolderId === node.id, 'is-checked': checkedFolders.has(node.id) }]"
        :style="{ paddingLeft: `${node.depth * 16 + 12}px`, '--padding-left': `${node.depth * 16 + 12}px` }"
        tabindex="0"
        :draggable="selectEnabled && node.id !== 'all' ? 'true' : null"
        :title="selectEnabled && node.id !== 'all' ? 'Click to open, Ctrl/Cmd or Shift+click to select folders, drag into the plan' : null"
        @click="onRowClick(node, $event)"
        @keydown.space.prevent="selectEnabled && $emit('folder-check', node.id)"
        @keydown.enter.prevent="onEnter(node)"
        @dragstart="onDragStart(node, $event)"
        @dragend="endDrag"
      >
        <!-- Same expand arrow as the plan group header -->
        <button
          type="button"
          class="chevron-btn"
          :class="{ 'is-expanded': expandedFolders.has(node.id), 'is-hidden': !node.hasChildren }"
          :aria-expanded="node.hasChildren ? expandedFolders.has(node.id) : null"
          :aria-label="node.hasChildren ? (expandedFolders.has(node.id) ? 'Collapse ' : 'Expand ') + node.name : null"
          :tabindex="node.hasChildren ? 0 : -1"
          @click.stop="$emit('toggle', node.id)"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 1.5 L8 5 L3 8.5 Z" fill="currentColor"/></svg>
        </button>

        <!-- Fixed cell: the checkbox takes the folder icon's place, so names never move -->
        <span class="icon-cell" :class="{ checkable: selectEnabled && node.id !== 'all' }">
          <svg v-if="node.id === 'all'" class="folder-icon special-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          <svg v-else class="folder-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
          <button
            v-if="selectEnabled && node.id !== 'all'"
            type="button"
            class="fcb"
            :class="{ on: checkedFolders.has(node.id) }"
            :aria-pressed="checkedFolders.has(node.id)"
            :aria-label="(checkedFolders.has(node.id) ? 'Unselect folder ' : 'Select folder ') + node.name"
            tabindex="-1"
            @click.stop="$emit('folder-check', node.id)"
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>
          </button>
        </span>

        <span class="folder-name">{{ node.name }}</span>
        <span
          v-if="hiddenChecked(node)"
          class="checked-badge"
          :title="`${hiddenChecked(node)} selected folder(s) inside`"
        >{{ hiddenChecked(node) }}</span>
        <span class="folder-count" :title="`${node.count} file(s) including subfolders`">{{ node.count }}</span>
      </div>
    </div>

    <div v-if="!isSidebarCollapsed" class="tree-footer">
      <slot name="footer"></slot>
    </div>

    <div class="resize-handle" v-show="!isSidebarCollapsed" @mousedown.prevent="startResize"></div>
  </aside>
</template>

<script setup>
import { ref } from 'vue';
import { startDrag, endDrag } from '../../composables/useDragPayload';

const props = defineProps({
  folders: { type: Array, required: true },
  selectedFolderId: { type: String, required: true },
  expandedFolders: { type: Set, required: true },
  // Advanced mode: folder multi-selection for "groups from folders" (docs §2.3.2)
  selectEnabled: { type: Boolean, default: false },
  checkedFolders: { type: Set, default: () => new Set() }
});
const emit = defineEmits(['select', 'toggle', 'folder-click', 'folder-check', 'clear-checked', 'create-groups']);

function onRowClick(node, event) {
  const gesture = event.ctrlKey || event.metaKey || event.shiftKey;
  if (props.selectEnabled && gesture && node.id !== 'all') emit('folder-click', node.id, event);
  else emit('select', node.id);
}

/** Enter creates the groups when folders are checked, otherwise opens the folder. */
function onEnter(node) {
  if (props.selectEnabled && props.checkedFolders.size) emit('create-groups');
  else emit('select', node.id);
}

/** Dragging a checked folder drags all checked folders, otherwise just this one. */
function onDragStart(node, event) {
  if (!props.selectEnabled || node.id === 'all') return;
  const ids = props.checkedFolders.has(node.id) ? [...props.checkedFolders] : [node.id];
  startDrag(event, 'folders', ids);
}

/** Checked folders hidden inside a collapsed branch, shown as a badge on that branch. */
function hiddenChecked(node) {
  if (!props.selectEnabled || !props.checkedFolders.size || !node.hasChildren || props.expandedFolders.has(node.id)) return 0;
  let n = 0;
  props.checkedFolders.forEach(id => { if (id.startsWith(node.id + '/')) n++; });
  return n;
}

// Controlled by the shell so layouts can collapse it (Split / Plan workspaces)
const isSidebarCollapsed = defineModel('collapsed', { type: Boolean, default: false });
const sidebarWidth = ref(260);
const isResizing = ref(false);

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
}

function startResize() {
  isResizing.value = true;
  window.addEventListener('mousemove', doResize);
  window.addEventListener('mouseup', stopResize);
  document.body.style.cursor = 'col-resize';
}

function doResize(event) {
  if (isResizing.value) {
    let newWidth = event.clientX;
    if (newWidth < 150) newWidth = 150;
    if (newWidth > 300) newWidth = 300;
    sidebarWidth.value = newWidth;
  }
}

function stopResize() {
  isResizing.value = false;
  window.removeEventListener('mousemove', doResize);
  window.removeEventListener('mouseup', stopResize);
  document.body.style.cursor = '';
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.tree-sidebar {
  background-color: transparent;
  border-right: 1px solid #2a2a2a;
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: width 0.3s ease, min-width 0.3s ease;
  position: relative;
  flex-shrink: 0;
}
.tree-sidebar.is-resizing {
  transition: none;
}

.tree-sidebar-header {
  height: 52px;
  display: flex;
  align-items: center;
  padding: 0 13px;
  border-bottom: 1px solid #222222;
  position: relative;
  overflow: hidden;
}

.panel-toggle-btn {
  background: transparent;
  border: none;
  color: #9c9c9c;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: color 0.2s, background 0.2s;
  flex-shrink: 0;
}
.panel-toggle-btn:hover {
  color: #fff;
  background: #2a2a2a;
}

.tree-header-title {
  position: absolute;
  left: 52px;
  font-size: 11px;
  font-weight: 700;
  color: #9c9c9c;
  letter-spacing: 0.5px;
  transition: opacity 0.2s ease;
  white-space: nowrap;
}
.tree-header-title.hidden {
  opacity: 0;
  pointer-events: none;
}

.tree-container {
  overflow: auto;
  flex: 1;
  padding-top: 10px;
  transition: opacity 0.2s ease;
}
.tree-container.hidden {
  opacity: 0;
  pointer-events: none;
  overflow: hidden;
}


.tree-item {
  border-left: 3px solid transparent;
  display: flex;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
  user-select: none;
  width: max-content;
  min-width: 100%;
}
.tree-item:hover { background: #1f1f1f; }
.tree-item.is-selected { background: rgba(10, 132, 255, 0.1); border-left: 3px solid #0a84ff; color: #ffffff; padding-left: calc(var(--padding-left) - 3px); }

/* Expand arrow: the plan group header's .chev */
.chevron-btn {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #aeaeae;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.chevron-btn svg { transition: transform 0.18s ease; }
.chevron-btn.is-expanded svg { transform: rotate(90deg); }
.chevron-btn:hover { color: #ffffff; }
.chevron-btn:focus-visible { outline: none; box-shadow: 0 0 0 1px #0a84ff; }
.chevron-btn.is-hidden { visibility: hidden; }

.icon-cell {
  width: 16px;
  height: 16px;
  margin: 0 8px 0 2px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.folder-icon { color: #9c9c9c; }
.tree-item.is-selected .folder-icon { color: #d4d4d4; }

.folder-name {
  font-size: 13px;
  white-space: nowrap;
}

.folder-count {
  margin-left: auto;
  padding-left: 12px;
  font-size: 11px;
  color: #9c9c9c;
  font-variant-numeric: tabular-nums;
}
.tree-item.is-selected .folder-count { color: #d4d4d4; }

.tree-item:focus-visible { outline: none; box-shadow: inset 0 0 0 1px #0a84ff; }
.tree-item.is-checked { background: rgba(10, 132, 255, 0.15); color: #ffffff; }
.tree-item.is-checked:hover { background: rgba(10, 132, 255, 0.2); }

/* Folder checkbox: replaces the icon on hover, keyboard focus, and on every row while folders are checked.
   Lighter and filled, so it reads as a checkbox next to the hollow #666666 folder icon. */
.fcb {
  display: none;
  width: 14px; height: 14px; padding: 0; flex-shrink: 0;
  border: 1.5px solid #aaaaaa; border-radius: 4px; background: #242424; color: transparent;
  align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease;
}
/* Row under the pointer: the box that replaced the icon turns blue, so the swap is obvious */
.tree-item:hover .fcb { border-color: #0a84ff; background: rgba(10, 132, 255, 0.10); }
.tree-item:hover .fcb:hover { background: rgba(10, 132, 255, 0.20); }
.fcb:focus-visible { outline: none; box-shadow: 0 0 0 2px #0a84ff; }
.fcb.on, .tree-item:hover .fcb.on { background: #0a84ff; border-color: #0a84ff; color: #ffffff; }
.tree-item:hover .checkable .fcb,
.tree-item:focus-visible .checkable .fcb,
.tree-container.has-checked .checkable .fcb { display: flex; }
.tree-item:hover .checkable .folder-icon,
.tree-item:focus-visible .checkable .folder-icon,
.tree-container.has-checked .checkable .folder-icon { display: none; }

.checked-badge {
  margin-left: 8px;
  padding: 0 5px;
  border-radius: 6px;
  background: #0a84ff;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  line-height: 15px;
}

.tree-footer { flex-shrink: 0; }

.resize-handle {
  position: absolute;
  top: 0;
  right: -3px;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  z-index: 10;
}
.resize-handle:hover {
  background-color: rgba(10, 132, 255, 0.2);
}
</style>
