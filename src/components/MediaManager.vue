<template>
  <div class="media-manager" @click="handleContainerClick">
    <!-- Top Bar: Hierarchical Tabs -->
    <div class="top-bar-container">
      <!-- Top Level (Persistent) -->
      <div class="top-bar">
        <div class="tabs-container">
          <span class="view-label">VIEW:</span>
          <button 
            class="tab-btn" 
            :class="{ active: isAllSelected }"
            @click="selectAll"
          >
            ALL
          </button>
          <button 
            v-for="folder in rootLevelFolders" 
            :key="folder.id"
            class="tab-btn" 
            :class="{ active: isFolderInPath(folder, 0) }"
            @click="selectFolderAtLevel(folder, 0)"
          >
            {{ folder.name.toUpperCase() }}
          </button>
        </div>
        
        <button class="select-all-btn" @click.stop="toggleSelectAll">
          {{ selectedItems.size > 0 ? 'DESELECT ALL' : 'SELECT ALL' }}
        </button>
      </div>

      <!-- Sub-folder levels -->
      <div 
        v-for="(levelFolders, index) in subFolderLevels" 
        :key="index"
        class="top-bar sub-bar"
      >
        <div class="tabs-container">
          <span class="view-label"></span> <!-- Spacer -->
          <button 
            v-for="folder in levelFolders" 
            :key="folder.id"
            class="tab-btn" 
            :class="{ active: isFolderInPath(folder, index + 1) }"
            @click="selectFolderAtLevel(folder, index + 1)"
          >
            {{ folder.name.toUpperCase() }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">
      Loading...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else class="content-area">
      <div 
        class="media-grid" 
        ref="gridRef"
        @mousedown="startSelection"
      >
        <MediaCard
          v-for="(item, index) in filteredMediaList"
          :key="item.id"
          :item="item"
          :selected="selectedItems.has(item.id)"
          class="media-card-item"
          :data-id="item.id"
          @click.stop="handleSelection(item, index, $event)"
        />
        
        <div v-if="filteredMediaList.length === 0" class="empty-state">
          No media found.
        </div>

        <!-- Selection Frame -->
        <div 
          v-if="isSelecting" 
          class="selection-frame"
          :style="selectionFrameStyle"
        ></div>
      </div>
    </div>

    <!-- Bottom Bar: Controls -->
    <div class="bottom-bar">
      <div class="controls-left">
        <label class="control-item">
          <input type="checkbox" v-model="options.splitSection"> Split Section
        </label>
        <div class="control-item">
          Overlap: <input type="number" v-model="options.overlap" class="input-number"> s
        </div>
        <label class="control-item">
          <input type="checkbox" v-model="options.addCueTag"> Add Cue Tag
        </label>
      </div>
      <div class="controls-right">
        <span class="selection-count">{{ selectedItems.size }} selected</span>
        <button class="create-btn" @click="handleCreateLayers">CREATE LAYERS</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, onUnmounted, watch } from 'vue';
import { getMediaList } from '../services/disguiseService';
import MediaCard from './MediaCard.vue';

const props = defineProps({
  directorEndpoint: {
    type: String,
    required: true
  }
});

const loading = ref(true);
const error = ref(null);
const fullHierarchy = ref([]);
const selectedItems = reactive(new Set());

// Navigation state
const navigationPath = ref([]); // Array of folder objects
const isAllSelected = ref(true);

// Options state
const options = reactive({
  splitSection: false,
  overlap: 0,
  addCueTag: false
});

// Drag Selection State
const gridRef = ref(null);
const isSelecting = ref(false);
const wasDragging = ref(false);
const selectionStart = reactive({ x: 0, y: 0 });
const selectionEnd = reactive({ x: 0, y: 0 });
const initialSelection = new Set();
let lastSelectedIndex = -1;

// --- Computed Properties ---

// Computed: Top level folders (All, Root, FolderA...)
const rootLevelFolders = computed(() => {
  return fullHierarchy.value.filter(item => item.type === 'folder');
});

// Computed: Calculate subfolder levels to render
const subFolderLevels = computed(() => {
  if (isAllSelected.value || navigationPath.value.length === 0) return [];
  
  const levels = [];
  let currentLevelFolders = navigationPath.value[0].children?.filter(i => i.type === 'folder') || [];
  
  for (let i = 0; i < navigationPath.value.length; i++) {
    if (currentLevelFolders.length > 0) {
      levels.push(currentLevelFolders);
    }
    // Prep next level
    const nextInPath = navigationPath.value[i + 1];
    if (nextInPath) {
      currentLevelFolders = nextInPath.children?.filter(i => i.type === 'folder') || [];
    } else {
      break;
    }
  }
  return levels;
});

// Computed: Flatten all files from the hierarchy for 'ALL' view
const allFiles = computed(() => {
  const files = [];
  const traverse = (items) => {
    items.forEach(item => {
      if (item.type === 'file') {
        files.push(item);
      } else if (item.type === 'folder' && item.children) {
        traverse(item.children);
      }
    });
  };
  traverse(fullHierarchy.value);
  
  // Sort alphabetically
  return files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
});

// Computed: Get files based on active tab
const filteredMediaList = computed(() => {
  if (isAllSelected.value) {
    return allFiles.value;
  }
  
  if (navigationPath.value.length === 0) return [];
  
  // Return files in the last folder of the navigation path
  const currentFolder = navigationPath.value[navigationPath.value.length - 1];
  return currentFolder.children?.filter(item => item.type === 'file') || [];
});

// --- Navigation Helpers ---

const selectAll = () => {
  isAllSelected.value = true;
  navigationPath.value = [];
};

const selectFolderAtLevel = (folder, level) => {
  isAllSelected.value = false;
  // Truncate path to current level and add new selection
  navigationPath.value = navigationPath.value.slice(0, level);
  navigationPath.value.push(folder);
};

const isFolderInPath = (folder, level) => {
  return navigationPath.value[level]?.id === folder.id;
};

// --- Watchers & Lifecycle ---

watch([isAllSelected, navigationPath], () => {
  selectedItems.clear();
  lastSelectedIndex = -1;
}, { deep: true });

onMounted(async () => {
  try {
    loading.value = true;
    const media = await getMediaList(props.directorEndpoint);
    if (Array.isArray(media)) {
      fullHierarchy.value = media;
    }
  } catch (err) {
    error.value = `Failed to load media: ${err.message}`;
    console.error(err);
    generateMockData();
  } finally {
    loading.value = false;
  }
  window.addEventListener('mouseup', endSelection);
  window.addEventListener('mousemove', updateSelection);
});

onUnmounted(() => {
  window.removeEventListener('mouseup', endSelection);
  window.removeEventListener('mousemove', updateSelection);
});

// --- Methods ---

function generateMockData() {
    const mockFolders = ['content', 'sample', 'test'].map(name => ({
        id: name,
        name: name,
        type: 'folder',
        children: [
          ...Array.from({ length: 3 }, (_, i) => ({
              id: `${name}_file_${i}`,
              name: `${name}_image_${i + 1}.mov`,
              type: 'file',
              path: `/mock/${name}/image_${i}.mov`
          })),
          {
            id: `${name}_sub`,
            name: `sub_${name}`,
            type: 'folder',
            children: [{
              id: `${name}_sub_file`,
              name: `nested_${name}.mov`,
              type: 'file',
              path: `/mock/${name}/sub/file.mov`
            }]
          }
        ]
    }));
    fullHierarchy.value = [{id: 'Root', name: 'Root', type: 'folder', children: []}, ...mockFolders];
}

function handleCreateLayers() {
  console.log('Create Layers clicked', {
    selected: Array.from(selectedItems),
    options
  });
}

function handleSelection(item, index, event) {
  const id = item.id;
  if (event.ctrlKey || event.metaKey) {
    if (selectedItems.has(id)) selectedItems.delete(id);
    else selectedItems.add(id);
    lastSelectedIndex = index;
  } else if (event.shiftKey && lastSelectedIndex !== -1) {
    const start = Math.min(lastSelectedIndex, index);
    const end = Math.max(lastSelectedIndex, index);
    selectedItems.clear();
    for (let i = start; i <= end; i++) {
      const currentItem = filteredMediaList.value[i];
      selectedItems.add(currentItem.id);
    }
  } else {
    selectedItems.clear();
    selectedItems.add(id);
    lastSelectedIndex = index;
  }
}

function handleContainerClick() {
  if (!wasDragging.value) {
     selectedItems.clear();
     lastSelectedIndex = -1;
  }
  wasDragging.value = false;
}

function toggleSelectAll() {
  if (selectedItems.size > 0) {
    selectedItems.clear();
    lastSelectedIndex = -1;
  } else {
    filteredMediaList.value.forEach((item, index) => {
      selectedItems.add(item.id);
      lastSelectedIndex = index;
    });
  }
}

function startSelection(event) {
  if (event.target.closest('.media-card')) return;
  isSelecting.value = true;
  wasDragging.value = false;
  const rect = gridRef.value.getBoundingClientRect();
  selectionStart.x = event.clientX - rect.left + gridRef.value.scrollLeft;
  selectionStart.y = event.clientY - rect.top + gridRef.value.scrollTop;
  selectionEnd.x = selectionStart.x;
  selectionEnd.y = selectionStart.y;
  if (!event.ctrlKey && !event.metaKey) selectedItems.clear();
  initialSelection.clear();
  selectedItems.forEach(id => initialSelection.add(id));
}

function updateSelection(event) {
  if (!isSelecting.value || !gridRef.value) return;
  if (Math.abs(event.movementX) > 0 || Math.abs(event.movementY) > 0) wasDragging.value = true;
  const rect = gridRef.value.getBoundingClientRect();
  selectionEnd.x = event.clientX - rect.left + gridRef.value.scrollLeft;
  selectionEnd.y = event.clientY - rect.top + gridRef.value.scrollTop;
  const boxLeft = Math.min(selectionStart.x, selectionEnd.x);
  const boxTop = Math.min(selectionStart.y, selectionEnd.y);
  const boxRight = Math.max(selectionStart.x, selectionEnd.x);
  const boxBottom = Math.max(selectionStart.y, selectionEnd.y);
  const cards = gridRef.value.querySelectorAll('.media-card-item');
  const tempSelected = new Set(initialSelection);
  cards.forEach(card => {
      const id = card.dataset.id;
      const cardLeft = card.offsetLeft;
      const cardTop = card.offsetTop;
      const cardRight = cardLeft + card.offsetWidth;
      const cardBottom = cardTop + card.offsetHeight;
      const isIntersecting = !(cardLeft > boxRight || cardRight < boxLeft || cardTop > boxBottom || cardBottom < boxTop);
      if (isIntersecting) tempSelected.add(id);
  });
  selectedItems.clear();
  tempSelected.forEach(id => selectedItems.add(id));
}

function endSelection() {
  isSelecting.value = false;
}

const selectionFrameStyle = computed(() => {
  const left = Math.min(selectionStart.x, selectionEnd.x);
  const top = Math.min(selectionStart.y, selectionEnd.y);
  const width = Math.abs(selectionEnd.x - selectionStart.x);
  const height = Math.abs(selectionEnd.y - selectionStart.y);
  return { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` };
});
</script>

<style scoped>
.media-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #1e1e1e; /* Dark theme background */
  color: #e0e0e0;
}

.top-bar-container {
  display: flex;
  flex-direction: column;
  background-color: #252526;
  border-bottom: 1px solid #333;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
}

.sub-bar {
  border-top: 1px solid #333;
  padding: 5px 20px;
  background-color: #2d2d2d;
}

.tabs-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.view-label {
  color: #888;
  font-size: 0.8rem;
  font-weight: bold;
  margin-right: 5px;
  min-width: 40px;
}

.tab-btn {
  background: transparent;
  border: 1px solid #444;
  color: #888;
  padding: 5px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.tab-btn:hover {
  background-color: #333;
}

.tab-btn.active {
  border-color: #007acc;
  color: #007acc;
  background-color: rgba(0, 122, 204, 0.1);
}

.select-all-btn {
  background: transparent;
  border: 1px solid #555;
  color: #ccc;
  padding: 5px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.select-all-btn:hover {
  background-color: #333;
  color: white;
}

.content-area {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.media-grid {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
  align-content: start;
  position: relative;
}

.bottom-bar {
  height: 50px;
  background-color: #252526;
  border-top: 1px solid #333;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  font-size: 0.9rem;
}

.controls-left, .controls-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ccc;
  cursor: pointer;
}

.input-number {
  background-color: #333;
  border: 1px solid #444;
  color: white;
  padding: 4px;
  border-radius: 3px;
  width: 40px;
  text-align: center;
}

.selection-count {
  color: #888;
  font-size: 0.85rem;
}

.create-btn {
  background-color: #0e639c;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 2px;
  font-weight: 600;
  cursor: pointer;
  text-transform: uppercase;
  font-size: 0.85rem;
}

.create-btn:hover {
  background-color: #1177bb;
}

.loading, .error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
}

.error {
  color: #d32f2f;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 2rem;
  color: #555;
}

.selection-frame {
  position: absolute;
  background-color: rgba(0, 122, 204, 0.2);
  border: 1px solid rgba(0, 122, 204, 0.6);
  pointer-events: none;
  z-index: 100;
}
</style>
