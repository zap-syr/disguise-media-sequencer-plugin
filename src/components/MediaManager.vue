<template>
  <div class="media-manager" @click="handleContainerClick">
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <div v-else class="main-layout">
      <!-- Left Panel: Navigation & Media -->
      <div class="left-panel">
        <div class="top-bar-container">
          <div class="top-bar">
            <div class="tabs-container">
              <span class="view-label">VIEW:</span>
              <button class="tab-btn" :class="{ active: isAllSelected }" @click="selectAll">ALL</button>
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

            <div class="top-bar-right">
              <div class="search-container">
                <input 
                  type="text" 
                  v-model="searchQuery" 
                  placeholder="Search files..." 
                  class="search-input"
                  @click.stop
                >
              </div>
              <button class="select-all-btn" @click.stop="toggleSelectAll">
                {{ selectedItems.size > 0 ? 'DESELECT ALL' : 'SELECT ALL' }}
              </button>
            </div>
          </div>

          <div v-for="(levelFolders, index) in subFolderLevels" :key="index" class="top-bar sub-bar">
            <div class="tabs-container">
              <span class="view-label"></span>
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

        <div class="content-area">
          <div class="media-grid" ref="gridRef" @mousedown="startSelection">
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
              {{ searchQuery ? 'No files match your search.' : 'No media found.' }}
            </div>
            <div v-if="isSelecting" class="selection-frame" :style="selectionFrameStyle"></div>
          </div>
        </div>
      </div>

      <!-- Settings Sidebar -->
      <div class="settings-sidebar" @click.stop>
        <div class="sidebar-title">SETTINGS</div>
        
        <div class="sidebar-content">
          <div class="sidebar-group">
            <label class="sidebar-label">MAPPING</label>
            <div class="dropdown-wrapper" ref="mappingRef">
              <button class="dropdown-btn" @click="toggleMappingMenu">
                {{ selectedMapping ? selectedMapping.name : 'Select Mapping...' }}
                <span class="arrow">▼</span>
              </button>
              <ul v-if="isMappingMenuOpen" class="dropdown-menu">
                <li 
                  v-for="m in mappings" 
                  :key="m.uid" 
                  @click="selectMapping(m)"
                  :class="{ active: selectedMapping?.uid === m.uid }"
                >
                  {{ m.name }}
                </li>
                <li v-if="mappings.length === 0" class="disabled">No mappings found</li>
              </ul>
            </div>
          </div>

          <div class="sidebar-group">
            <label class="sidebar-label">MODE</label>
            <select v-model="options.mode" class="sidebar-select">
              <option value="Normal">Normal</option>
              <option value="Locked">Locked</option>
            </select>
          </div>

          <div class="sidebar-group">
            <label class="sidebar-label">AT END POINT</label>
            <select v-model="options.atEndPoint" class="sidebar-select">
              <option value="Loop">Loop</option>
              <option value="Ping-Pong">Ping-Pong</option>
              <option value="Pause">Pause</option>
            </select>
          </div>

          <div class="sidebar-group">
            <label class="sidebar-label">STILL IMG DURATION (s)</label>
            <input 
              type="number" 
              v-model.number="options.stillDuration" 
              class="sidebar-input-number"
              min="0"
              step="1"
            >
          </div>

          <div class="sidebar-group">
            <label class="sidebar-label">MOVIE DURATION</label>
            <div class="duration-row">
              <label class="control-item">
                <input type="checkbox" v-model="options.fitToContent"> Fit To Contents
              </label>
              <input 
                v-if="!options.fitToContent"
                type="number" 
                v-model.number="options.movieDuration" 
                class="sidebar-input-number mini"
                min="0"
                step="1"
              >
              <span v-if="!options.fitToContent" class="unit">s</span>
            </div>
          </div>

          <div class="sidebar-group">
            <label class="sidebar-label">OVERLAP (s)</label>
            <input 
              type="number" 
              v-model.number="options.overlap" 
              class="sidebar-input-number"
              min="0"
              step="0.5"
            >
          </div>

          <div class="sidebar-group divider"></div>

          <div class="sidebar-group row">
            <input type="checkbox" id="splitSection" v-model="options.splitSection">
            <label for="splitSection">Split Section</label>
          </div>

          <div class="sidebar-group row">
            <input type="checkbox" id="addCueTag" v-model="options.addCueTag">
            <label for="addCueTag">Add Cue Tag</label>
          </div>

          <div v-if="options.addCueTag" class="sidebar-group">
            <input 
              type="text" 
              v-model="options.cueValue" 
              class="sidebar-input-text" 
              placeholder="e.g. 1.2.3"
              :class="{ invalid: !isCueValid && options.cueValue !== '' }"
            >
          </div>
        </div>

        <div class="sidebar-footer">
          <div class="selection-info">{{ selectedItems.size }} item(s) selected</div>
          <button 
            class="create-btn-sidebar" 
            :disabled="!isCreateLayersEnabled || isCreating" 
            @click="handleCreateLayers"
          >
            {{ isCreating ? 'CREATING...' : 'CREATE LAYERS' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, onUnmounted, watch } from 'vue';
import { getMediaList, getMappingList, createLayers } from '../services/disguiseService';
import MediaCard from './MediaCard.vue';

const props = defineProps({
  directorEndpoint: { type: String, required: true }
});

const loading = ref(true);
const isCreating = ref(false);
const error = ref(null);
const fullHierarchy = ref([]);
const mappings = ref([]);
const selectedMapping = ref(null);
const isMappingMenuOpen = ref(false);
const selectedItems = reactive(new Set());
const searchQuery = ref('');

// Options state
const options = reactive({
  mode: 'Normal',
  atEndPoint: 'Loop',
  stillDuration: 5,
  fitToContent: true,
  movieDuration: 30,
  overlap: 0,
  splitSection: false,
  addCueTag: false,
  cueValue: ''
});

// Navigation state
const navigationPath = ref([]);
const isAllSelected = ref(true);

// Drag Selection State
const gridRef = ref(null);
const mappingRef = ref(null);
const isSelecting = ref(false);
const wasDragging = ref(false);
const selectionStart = reactive({ x: 0, y: 0 });
const selectionEnd = reactive({ x: 0, y: 0 });
const initialSelection = new Set();
let lastSelectedIndex = -1;

// --- Computed Properties ---

const rootLevelFolders = computed(() => fullHierarchy.value.filter(item => item.type === 'folder'));

const subFolderLevels = computed(() => {
  if (isAllSelected.value || navigationPath.value.length === 0) return [];
  const levels = [];
  let currentLevelFolders = navigationPath.value[0].children?.filter(i => i.type === 'folder') || [];
  for (let i = 0; i < navigationPath.value.length; i++) {
    if (currentLevelFolders.length > 0) levels.push(currentLevelFolders);
    const nextInPath = navigationPath.value[i + 1];
    if (nextInPath) currentLevelFolders = nextInPath.children?.filter(i => i.type === 'folder') || [];
    else break;
  }
  return levels;
});

const allFiles = computed(() => {
  const files = [];
  const traverse = (items) => {
    items.forEach(item => {
      if (item.type === 'file') files.push(item);
      else if (item.children) traverse(item.children);
    });
  };
  traverse(fullHierarchy.value);
  return files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
});

const filteredMediaList = computed(() => {
  let list = [];
  if (isAllSelected.value) {
    list = allFiles.value;
  } else if (navigationPath.value.length > 0) {
    const currentFolder = navigationPath.value[navigationPath.value.length - 1];
    list = currentFolder.children?.filter(item => item.type === 'file') || [];
  }

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    return list.filter(item => item.name.toLowerCase().includes(query));
  }
  
  return list;
});

const isCueValid = computed(() => {
  if (!options.addCueTag) return true;
  const segment = '([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])';
  const regex = new RegExp(`^${segment}(\\.${segment}){0,2}$`);
  return regex.test(options.cueValue);
});

const isCreateLayersEnabled = computed(() => {
  const hasSelection = selectedItems.size > 0;
  const hasMapping = !!selectedMapping.value;
  const validCue = isCueValid.value && (options.addCueTag ? options.cueValue !== '' : true);
  return hasSelection && hasMapping && validCue;
});

// --- Helpers ---

const selectAll = () => {
  isAllSelected.value = true;
  navigationPath.value = [];
};

const selectFolderAtLevel = (folder, level) => {
  isAllSelected.value = false;
  navigationPath.value = navigationPath.value.slice(0, level);
  navigationPath.value.push(folder);
};

const isFolderInPath = (folder, level) => navigationPath.value[level]?.id === folder.id;

const toggleMappingMenu = () => isMappingMenuOpen.value = !isMappingMenuOpen.value;
const selectMapping = (m) => {
  selectedMapping.value = m;
  isMappingMenuOpen.value = false;
};

const handleClickOutside = (e) => {
  if (mappingRef.value && !mappingRef.value.contains(e.target)) {
    isMappingMenuOpen.value = false;
  }
};

// --- Watchers & Lifecycle ---

watch([isAllSelected, navigationPath], () => {
  selectedItems.clear();
  lastSelectedIndex = -1;
}, { deep: true });

// Input Validations
watch(() => options.overlap, (newVal) => { if (newVal < 0) options.overlap = 0; });
watch(() => options.stillDuration, (newVal) => { if (newVal < 0) options.stillDuration = 0; });
watch(() => options.movieDuration, (newVal) => { if (newVal < 0) options.movieDuration = 0; });

onMounted(async () => {
  try {
    loading.value = true;
    const [media, mps] = await Promise.all([
      getMediaList(props.directorEndpoint),
      getMappingList(props.directorEndpoint)
    ]);
    if (Array.isArray(media)) fullHierarchy.value = media;
    if (Array.isArray(mps)) mappings.value = mps;
  } catch (err) {
    error.value = `Failed to load data: ${err.message}`;
    console.error(err);
  } finally {
    loading.value = false;
  }
  window.addEventListener('mouseup', endSelection);
  window.addEventListener('mousemove', updateSelection);
  window.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener('mouseup', endSelection);
  window.removeEventListener('mousemove', updateSelection);
  window.removeEventListener('mousedown', handleClickOutside);
});

// --- UI Logic ---

async function handleCreateLayers() {
  if (!isCreateLayersEnabled.value || isCreating.value) return;

  try {
    isCreating.value = true;
    const selectedFiles = allFiles.value.filter(file => selectedItems.has(file.id));
    const selectedPaths = selectedFiles.map(file => file.path);
    const requestOptions = {
      ...options,
      mappingPath: selectedMapping.value.path
    };
    const result = await createLayers(props.directorEndpoint, requestOptions, selectedPaths);
    if (result && (result.status === 'success' || result.code === 0)) {
      selectedItems.clear();
      lastSelectedIndex = -1;
      alert(`Successfully created ${result.count || selectedPaths.length} layers.`);
    } else {
      throw new Error(result.message || 'Unknown error during layer creation.');
    }
  } catch (err) {
    alert(`Failed to create layers: ${err.message}`);
    console.error(err);
  } finally {
    isCreating.value = false;
  }
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
  if (event.target.closest('.media-card') || event.target.closest('.top-bar-container')) return;
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
  height: 100vh;
  background-color: #1e1e1e;
  color: #e0e0e0;
  overflow: hidden;
}

.main-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0; /* Important for responsive shrinking */
}

.top-bar-container {
  display: flex;
  flex-direction: column;
  background-color: #252526;
  border-bottom: 1px solid #333;
  z-index: 10;
  flex-shrink: 0;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  gap: 20px;
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
  overflow-x: auto; /* Enable horizontal scrolling for tabs */
  padding-bottom: 5px; /* Space for scrollbar */
  scrollbar-width: thin;
}

.tabs-container::-webkit-scrollbar {
  height: 4px;
}

.tabs-container::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 2px;
}

.view-label {
  color: #888;
  font-size: 0.8rem;
  font-weight: bold;
  margin-right: 5px;
  min-width: 40px;
  flex-shrink: 0;
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
  white-space: nowrap; /* Prevent tab text wrapping */
}

.tab-btn:hover { background-color: #333; }
.tab-btn.active {
  border-color: #007acc;
  color: #007acc;
  background-color: rgba(0, 122, 204, 0.1);
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-shrink: 0; /* Prevent search/buttons from disappearing */
}

.search-input {
  background-color: #1e1e1e;
  border: 1px solid #444;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.85rem;
  width: 180px;
}

.select-all-btn {
  background: transparent;
  border: 1px solid #555;
  color: #ccc;
  padding: 5px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  white-space: nowrap;
}

.content-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.media-grid {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
  align-content: start;
}

/* Settings Sidebar */
.settings-sidebar {
  width: 350px;
  background-color: #252526;
  border-left: 1px solid #333;
  display: flex;
  flex-direction: column;
  height: 100%;
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 0.9rem;
  font-weight: bold;
  color: #888;
  padding: 15px;
  border-bottom: 1px solid #333;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto; /* Make settings scrollable */
  padding: 20px;
}

.sidebar-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.sidebar-group.row {
  flex-direction: row;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.duration-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sidebar-group.divider {
  height: 1px;
  background-color: #333;
  margin: 10px 0 20px;
}

.sidebar-label {
  font-size: 0.75rem;
  font-weight: bold;
  color: #aaa;
}

.sidebar-select, .sidebar-input-number, .sidebar-input-text {
  background-color: #333;
  border: 1px solid #444;
  color: white;
  padding: 8px;
  border-radius: 4px;
  font-size: 0.85rem;
}

.sidebar-input-number { width: 100px; }
.sidebar-input-number.mini { width: 60px; padding: 4px 8px; }
.unit { font-size: 0.8rem; color: #888; }

.dropdown-wrapper { position: relative; }
.dropdown-btn {
  width: 100%;
  background-color: #333;
  border: 1px solid #444;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background-color: #252526;
  border: 1px solid #444;
  border-radius: 0 0 4px 4px;
  list-style: none;
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
  padding: 5px 0;
}

.dropdown-menu li { padding: 8px 12px; cursor: pointer; font-size: 0.85rem; }
.dropdown-menu li:hover { background-color: #007acc; color: white; }

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid #333;
  background-color: #252526;
}

.selection-info {
  font-size: 0.8rem;
  color: #888;
  margin-bottom: 15px;
}

.create-btn-sidebar {
  width: 100%;
  background-color: #0e639c;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  text-transform: uppercase;
  font-size: 0.9rem;
}

.create-btn-sidebar:disabled {
  background-color: #3a3d41;
  color: #757575;
  cursor: not-allowed;
}

.loading, .error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
}

.selection-frame {
  position: absolute;
  background-color: rgba(0, 122, 204, 0.2);
  border: 1px solid rgba(0, 122, 204, 0.6);
  pointer-events: none;
  z-index: 100;
}

.invalid { border-color: #f44336 !important; }
</style>
