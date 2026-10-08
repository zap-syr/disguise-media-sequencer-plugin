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

    <div class="tree-container" :class="{ 'hidden': isSidebarCollapsed }">
      <div
        v-for="node in folders"
        :key="node.id"
        :class="['tree-item', { 'is-selected': selectedFolderId === node.id }]"
        :style="{ paddingLeft: `${node.depth * 16 + 12}px`, '--padding-left': `${node.depth * 16 + 12}px` }"
        @click="$emit('select', node.id)"
      >
        <button
          class="chevron-btn"
          :class="{ 'is-expanded': expandedFolders.has(node.id), 'is-hidden': !node.hasChildren }"
          @click.stop="$emit('toggle', node.id)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>

        <svg v-if="node.id === 'all'" class="folder-icon special-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
        <svg v-else class="folder-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>

        <span class="folder-name">{{ node.name }}</span>
      </div>
    </div>

    <div class="resize-handle" v-show="!isSidebarCollapsed" @mousedown.prevent="startResize"></div>
  </aside>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  folders: { type: Array, required: true },
  selectedFolderId: { type: String, required: true },
  expandedFolders: { type: Set, required: true }
});
defineEmits(['select', 'toggle']);

const isSidebarCollapsed = ref(false);
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
  color: #888;
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
  color: #666666;
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

.tree-container::-webkit-scrollbar { width: 8px; height: 8px; }
.tree-container::-webkit-scrollbar-thumb { background: #333333; border-radius: 4px; }

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

.chevron-btn {
  background: transparent;
  border: none;
  color: #555555;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.chevron-btn.is-expanded { transform: rotate(90deg); }
.chevron-btn.is-hidden { visibility: hidden; }

.folder-icon { margin: 0 8px 0 2px; color: #666666; }
.tree-item.is-selected .folder-icon { color: #aaaaaa; }

.folder-name {
  font-size: 13px;
  white-space: nowrap;
}

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
