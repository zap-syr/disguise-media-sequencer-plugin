<template>
  <div class="media-manager" @click="handleContainerClick">
    <!-- Top Bar: Tabs -->
    <div class="top-bar">
      <div class="tabs-container">
        <span class="view-label">VIEW:</span>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'ALL' }"
          @click="activeTab = 'ALL'"
        >
          ALL
        </button>
        <button 
          v-for="folder in folders" 
          :key="folder.id"
          class="tab-btn" 
          :class="{ active: activeTab === folder.id }"
          @click="activeTab = folder.id"
        >
          {{ folder.name.toUpperCase() }}
        </button>
      </div>
      
      <button class="select-all-btn" @click.stop="toggleSelectAll">
        {{ selectedItems.size > 0 ? 'DESELECT ALL' : 'SELECT ALL' }}
      </button>
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
import { getLastProject, getMediaList } from '../services/disguiseService';
import MediaCard from './MediaCard.vue';

const props = defineProps({
  directorEndpoint: {
    type: String,
    required: true
  }
});

const loading = ref(true);
const error = ref(null);
const projectName = ref('');
// fullHierarchy stores the raw tree from the service
const fullHierarchy = ref([]);
const selectedItems = reactive(new Set());
const activeTab = ref('ALL');

// Options state
const options = reactive({
  splitSection: false,
  overlap: 0,
  addCueTag: false
});

// Drag Selection State
const gridRef = ref(null);
const isSelecting = ref(false);
const wasDragging = ref(false); // Track if a drag operation actually occurred
const selectionStart = reactive({ x: 0, y: 0 });
const selectionEnd = reactive({ x: 0, y: 0 });
const initialSelection = new Set();
let lastSelectedIndex = -1;

// Computed: Extract top-level folders for tabs
const folders = computed(() => {
  return fullHierarchy.value.filter(item => item.type === 'folder');
});

// Computed: Flatten all files from the hierarchy for 'ALL' view
const allFiles = computed(() => {
  const files = [];
  
  function traverse(items) {
    items.forEach(item => {
      if (item.type === 'file') {
        files.push(item);
      } else if (item.type === 'folder' && item.children) {
        traverse(item.children);
      }
    });
  }
  
  traverse(fullHierarchy.value);
  return files;
});

// Computed: Get files based on active tab
const filteredMediaList = computed(() => {
  if (activeTab.value === 'ALL') {
    return allFiles.value;
  }
  
  const folder = folders.value.find(f => f.id === activeTab.value);
  if (!folder) return [];
  
  const files = [];
  function traverse(items) {
    items.forEach(item => {
      if (item.type === 'file') {
        files.push(item);
      } else if (item.type === 'folder' && item.children) {
        traverse(item.children);
      }
    });
  }
  traverse(folder.children || []);
  return files;
});

// Watch for tab changes to clear selection
watch(activeTab, () => {
  selectedItems.clear();
  lastSelectedIndex = -1;
});

onMounted(async () => {
  try {
    loading.value = true;
    
    const projectData = await getLastProject(props.directorEndpoint);
    projectName.value = projectData.name;

    const media = await getMediaList(props.directorEndpoint, projectName.value);
    
    if (Array.isArray(media)) {
      fullHierarchy.value = media;
    }
    
  } catch (err) {
    error.value = `Failed to load media: ${err.message}`;
    console.error(err);
    
    // Mock data for UI development if API fails
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

function generateMockData() {
    // Generate structure: Content, Sample, Test folders
    const mockFolders = ['content', 'sample', 'test'].map(name => ({
        id: name,
        name: name,
        type: 'folder',
        children: Array.from({ length: 5 }, (_, i) => ({
            id: `${name}_file_${i}`,
            name: `${name}_image_${i + 1}`,
            type: 'file',
            path: `/mock/${name}/image_${i}.png`
        }))
    }));
    fullHierarchy.value = mockFolders;
}

function handleCreateLayers() {
  console.log('Create Layers clicked', {
    selected: Array.from(selectedItems),
    options
  });
  // Logic to be implemented later
}

function handleSelection(item, index, event) {
  // We need to find the actual index in the *current filtered list* for range selection logic
  // The 'index' passed from v-for is correct for the current view.
  
  const id = item.id;

  if (event.ctrlKey || event.metaKey) {
    if (selectedItems.has(id)) {
      selectedItems.delete(id);
    } else {
      selectedItems.add(id);
    }
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

function handleContainerClick(event) {
  // Only clear selection if we didn't just finish a drag operation
  if (!wasDragging.value) {
     // Optional: check if target is strictly the container/grid, not other UI elements
     // but @click on root usually implies clearing.
     // However, user requested "remain selected".
     // If this is a simple click on empty space, standard behavior is deselect.
     // If user meant "don't deselect when releasing drag", that is handled by wasDragging check.
     // If user meant "never deselect on empty click", I should comment this out.
     // Assuming "remain selected rather than be deselected [by the drag release]" logic.
     selectedItems.clear();
     lastSelectedIndex = -1;
  }
  // Reset drag flag
  wasDragging.value = false;
}

function toggleSelectAll() {
  if (selectedItems.size > 0) {
    selectedItems.clear();
    lastSelectedIndex = -1;
  } else {
    filteredMediaList.value.forEach((item, index) => {
      selectedItems.add(item.id);
      lastSelectedIndex = index; // Set last selected to last item
    });
  }
}

// Drag Selection Logic

function startSelection(event) {
  if (event.target.closest('.media-card')) return;

  isSelecting.value = true;
  wasDragging.value = false;
  
  const rect = gridRef.value.getBoundingClientRect();
  selectionStart.x = event.clientX - rect.left + gridRef.value.scrollLeft;
  selectionStart.y = event.clientY - rect.top + gridRef.value.scrollTop;
  selectionEnd.x = selectionStart.x;
  selectionEnd.y = selectionStart.y;

  // Standard behavior: clicking empty space clears selection immediately
  // But if we are starting a drag that ADDS to selection, we shouldn't.
  // User requested "remain selected". If we clear here, we violate that if they just drag to add.
  // So let's ONLY clear if NOT dragging (handled in click) OR if dragging without modifier?
  // Actually, standard OS behavior: drag on empty space = new selection (clears old).
  // Ctrl+drag = add to selection.
  // To support "remain selected", maybe they want to ADD by default?
  // Let's implement standard behavior first, but fix the "release clears it" bug.
  // The bug was likely the click handler.
  
  if (!event.ctrlKey && !event.metaKey) {
     // We clear at start of new selection, which is standard.
     // If user implies "don't clear my previous selection when I start a new one", they should use Ctrl.
     // But maybe they want to build selection by dragging multiple times?
     // I'll stick to standard: clear here. The 'release' bug is fixed by handleContainerClick logic.
    selectedItems.clear();
  }
  
  initialSelection.clear();
  selectedItems.forEach(id => initialSelection.add(id));
}

function updateSelection(event) {
  if (!isSelecting.value || !gridRef.value) return;
  
  // If we moved enough, consider it a drag
  if (Math.abs(event.movementX) > 0 || Math.abs(event.movementY) > 0) {
      wasDragging.value = true;
  }

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
      const id = card.dataset.id; // ID is string now
      const cardLeft = card.offsetLeft;
      const cardTop = card.offsetTop;
      const cardRight = cardLeft + card.offsetWidth;
      const cardBottom = cardTop + card.offsetHeight;

      const isIntersecting = !(
          cardLeft > boxRight ||
          cardRight < boxLeft ||
          cardTop > boxBottom ||
          cardBottom < boxTop
      );

      if (isIntersecting) {
        tempSelected.add(id);
      }
  });
  
  selectedItems.clear();
  tempSelected.forEach(id => selectedItems.add(id));
}

function endSelection() {
  isSelecting.value = false;
  // Note: wasDragging is NOT cleared here, it's checked in handleContainerClick then cleared.
}

const selectionFrameStyle = computed(() => {
  const left = Math.min(selectionStart.x, selectionEnd.x);
  const top = Math.min(selectionStart.y, selectionEnd.y);
  const width = Math.abs(selectionEnd.x - selectionStart.x);
  const height = Math.abs(selectionEnd.y - selectionStart.y);
  
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`
  };
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

/* Top Bar */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between; /* Space out tabs and select button */
  padding: 10px 20px;
  background-color: #252526;
  border-bottom: 1px solid #333;
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

/* Content Area */
.content-area {
  flex: 1;
  overflow: hidden; /* Manage scroll inside grid */
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

/* Bottom Bar */
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

/* Utility */
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
