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

      <!-- Settings Sidebar (New Design) -->
      <div class="sidebar" @click.stop>
        <div class="header-title">SETTINGS</div>

        <div class="sidebar-content">
          
          <!-- LAYER PROPERTIES -->
          <div class="group-box">
            <div class="group-header">LAYER PROPERTIES</div>
            <div class="control">
              <label>MAPPING</label>
              <div class="dropdown-wrapper" ref="mappingRef">
                <button class="dropdown-btn" @click="toggleMappingMenu">
                  <span class="dropdown-text">{{ selectedMapping ? selectedMapping.name : 'Select Mapping...' }}</span>
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
            <div class="row">
              <div class="control">
                <label>MODE</label>
                <select v-model="options.mode">
                  <option value="Normal">Normal</option>
                  <option value="Locked">Locked</option>
                </select>
              </div>
              <div class="control">
                <label>AT END POINT</label>
                <select v-model="options.atEndPoint">
                  <option value="Loop">Loop</option>
                  <option value="Ping-Pong">Ping-Pong</option>
                  <option value="Pause">Pause</option>
                </select>
              </div>
            </div>
          </div>

          <!-- INSERT SETTINGS -->
          <div class="group-box">
            <div class="group-header">INSERT SETTINGS</div>
            <div class="control">
              <label>INSERT LOCATION</label>
              <div class="segmented-control">
                <button 
                  type="button"
                  class="segment" 
                  :class="{ active: options.insertMode === 'At Playhead' }" 
                  @click="options.insertMode = 'At Playhead'"
                >
                  At Playhead
                </button>
                <button 
                  type="button"
                  class="segment" 
                  :class="{ active: options.insertMode === 'Specific location' }" 
                  @click="options.insertMode = 'Specific location'"
                >
                  Specific Time
                </button>
              </div>
            </div>

            <div class="row" :class="{ disabled: options.insertMode !== 'Specific location' }">
              <div class="control">
                <label>TRACK</label>
                <div class="dropdown-wrapper" ref="trackRef">
                  <button class="dropdown-btn" @click="toggleTrackMenu" :disabled="options.insertMode !== 'Specific location'">
                    <span class="dropdown-text">{{ selectedTrack ? selectedTrack.name : 'Select Track...' }}</span>
                  </button>
                  <ul v-if="isTrackMenuOpen" class="dropdown-menu">
                    <li 
                      v-for="t in tracks" 
                      :key="t.uid" 
                      @click="selectTrack(t)"
                      :class="{ active: selectedTrack?.uid === t.uid }"
                    >
                      {{ t.name }}
                    </li>
                    <li v-if="tracks.length === 0" class="disabled">No tracks found</li>
                  </ul>
                </div>
              </div>
              <div class="control">
                <label>TIME</label>
                <input 
                  type="text" 
                  v-model="options.startTime" 
                  class="standard-input" 
                  placeholder="00:00:00:00"
                  :class="{ invalid: options.insertMode === 'Specific location' && !isStartTimeValid }"
                  :disabled="options.insertMode !== 'Specific location'" 
                />
              </div>
            </div>
          </div>

          <!-- CONTENT DURATION -->
          <div class="group-box">
            <div class="group-header">CONTENT DURATION</div>
            
            <div class="control">
              <label>MOVIE DURATION</label>
              <div class="toggle-group">
                <label class="ios-toggle space-between">
                  <span class="label-text">Fit To Contents</span>
                  <div class="switch">
                    <input type="checkbox" v-model="options.fitToContent">
                    <span class="slider"></span>
                  </div>
                </label>
                
                <div class="input-with-unit width-half toggle-input-wrapper" :class="{ disabled: options.fitToContent }">
                  <input type="number" v-model.number="options.movieDuration" min="0" step="1" :disabled="options.fitToContent" />
                  <span class="unit">s</span>
                </div>
              </div>
            </div>

            <div class="control">
              <label>STILL IMG DURATION</label>
              <div class="input-with-unit width-half">
                <input type="number" v-model.number="options.stillDuration" min="0" step="1" />
                <span class="unit">s</span>
              </div>
            </div>
          </div>

          <!-- PLACEMENT & TIMING -->
          <div class="group-box">
            <div class="group-header">PLACEMENT & TIMING</div>
            <div class="control">
              <label>OVERLAP</label>
              <div class="input-with-unit width-half">
                <input type="number" v-model.number="options.overlap" min="0" step="0.5" />
                <span class="unit">s</span>
              </div>
            </div>
            
            <div class="toggle-list">
              <label class="ios-toggle space-between">
                <span class="label-text">Split Section</span>
                <div class="switch">
                  <input type="checkbox" v-model="options.splitSection">
                  <span class="slider"></span>
                </div>
              </label>
              
              <div class="toggle-group">
                <label class="ios-toggle space-between">
                  <span class="label-text">Add Cue Tag</span>
                  <div class="switch">
                    <input type="checkbox" v-model="options.addCueTag">
                    <span class="slider"></span>
                  </div>
                </label>
                
                <div class="toggle-input-wrapper" :class="{ disabled: !options.addCueTag }">
                  <input 
                    type="text" 
                    v-model="options.cueValue" 
                    class="standard-input" 
                    placeholder="e.g. 1.2.3" 
                    :disabled="!options.addCueTag"
                    :class="{ invalid: options.addCueTag && !isCueValid && options.cueValue !== '' }"
                  />
                </div>
              </div>

            </div>
          </div>
        </div>

        <div class="footer">
          <div class="selection-info">{{ selectedItems.size }} item(s) selected</div>
          <button 
            class="create-btn" 
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
import { getMediaList, getMappingList, getTrackList, createLayers } from '../services/disguiseService';
import MediaCard from './MediaCard.vue';

const props = defineProps({
  directorEndpoint: { type: String, required: true }
});

const loading = ref(true);
const isCreating = ref(false);
const error = ref(null);

const fullHierarchy = ref([]);
const mappings = ref([]);
const tracks = ref([]);

const selectedMapping = ref(null);
const selectedTrack = ref(null);

const isMappingMenuOpen = ref(false);
const isTrackMenuOpen = ref(false);

const selectedItems = reactive(new Set());
const searchQuery = ref('');

// Options state
const options = reactive({
  insertMode: 'At Playhead',
  startTime: '00:00:00:00',
  mode: 'Normal',
  atEndPoint: 'Loop',
  stillDuration: 5,
  fitToContent: true,
  movieDuration: 30,
  overlap: 0,
  splitSection: false,
  addCueTag: false,
  cueValue: '1'
});

// Navigation state
const navigationPath = ref([]);
const isAllSelected = ref(true);

// Drag Selection State
const gridRef = ref(null);
const mappingRef = ref(null);
const trackRef = ref(null);
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

const isStartTimeValid = computed(() => {
  if (options.insertMode !== 'Specific location') return true;
  return /^([0-9]{2}):([0-5][0-9]):([0-5][0-9]):([0-5][0-9])$/.test(options.startTime);
});

const isCreateLayersEnabled = computed(() => {
  const hasSelection = selectedItems.size > 0;
  const hasMapping = !!selectedMapping.value;
  const validCue = isCueValid.value && (options.addCueTag ? options.cueValue !== '' : true);
  const validLocation = options.insertMode === 'At Playhead' || (selectedTrack.value && isStartTimeValid.value);
  
  return hasSelection && hasMapping && validCue && validLocation;
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

// Dropdown Toggles
const toggleMappingMenu = () => {
  isMappingMenuOpen.value = !isMappingMenuOpen.value;
  isTrackMenuOpen.value = false;
};
const selectMapping = (m) => {
  selectedMapping.value = m;
  isMappingMenuOpen.value = false;
};

const toggleTrackMenu = () => {
  if (options.insertMode !== 'Specific location') return;
  isTrackMenuOpen.value = !isTrackMenuOpen.value;
  isMappingMenuOpen.value = false;
};
const selectTrack = (t) => {
  selectedTrack.value = t;
  isTrackMenuOpen.value = false;
};

const handleClickOutside = (e) => {
  if (mappingRef.value && !mappingRef.value.contains(e.target)) {
    isMappingMenuOpen.value = false;
  }
  if (trackRef.value && !trackRef.value.contains(e.target)) {
    isTrackMenuOpen.value = false;
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
    const [media, mps, trks] = await Promise.all([
      getMediaList(props.directorEndpoint),
      getMappingList(props.directorEndpoint),
      getTrackList(props.directorEndpoint)
    ]);
    if (Array.isArray(media)) fullHierarchy.value = media;
    if (Array.isArray(mps)) mappings.value = mps;
    if (Array.isArray(trks)) tracks.value = trks;
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
      mappingPath: selectedMapping.value.path,
      targetTrack: options.insertMode === 'Specific location' ? selectedTrack.value?.path : null
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
* {
  box-sizing: border-box;
}

.media-manager {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #121212;
  color: #e0e0e0;
  overflow: hidden;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
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
  min-width: 0;
}

.top-bar-container {
  display: flex;
  flex-direction: column;
  background-color: #181818;
  border-bottom: 1px solid #36373a;
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
  border-top: 1px solid #36373a;
  padding: 5px 20px;
  background-color: #1e1e1e;
}

.tabs-container {
  display: flex;
  align-items: center;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 5px;
  scrollbar-width: thin;
}

.tabs-container::-webkit-scrollbar { height: 4px; }
.tabs-container::-webkit-scrollbar-thumb { background: #444; border-radius: 2px; }

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
  border: 1px solid #36373a;
  color: #888;
  padding: 5px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-btn:hover { background-color: #2a2b2e; }
.tab-btn.active {
  border-color: #3b82f6;
  color: #3b82f6;
  background-color: rgba(59, 130, 246, 0.1);
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-shrink: 0;
}

.search-input {
  background-color: #1e1e1e;
  border: 1px solid #36373a;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.85rem;
  width: 220px;
}

.search-input:focus { border-color: #3b82f6; outline: none; }

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

.select-all-btn:hover { background-color: #2a2b2e; color: white; }

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

/* --- Settings Sidebar --- */
.sidebar {
  width: 320px;
  background: #1e1e1e;
  color: #dddddd;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #36373a;
  height: 100%;
  flex-shrink: 0;
  box-shadow: -5px 0 20px rgba(0,0,0,0.3);
}

.header-title {
  font-weight: 700;
  color: #888;
  font-size: 14px;
  letter-spacing: 0.5px;
  padding: 20px 20px 10px 20px;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Group cards */
.group-box {
  background: #2a2b2e;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #36373a;
}

.group-header {
  font-size: 11px;
  color: #3b82f6;
  font-weight: 700;
  margin-bottom: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.control { margin-bottom: 14px; }
.control:last-child { margin-bottom: 0; }
.row { display: flex; gap: 12px; transition: opacity 0.3s ease; }
.row .control { flex: 1; margin-bottom: 0; }

.disabled { opacity: 0.3; pointer-events: none; }

label {
  display: block;
  font-size: 10px;
  color: #a0a0a0;
  margin-bottom: 6px;
  font-weight: 600;
  text-transform: uppercase;
}

/* Horizontal Switcher (Segmented Control) */
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

.segment:hover { color: #ccc; }
.segment.active {
  background: #3a3a3a;
  color: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

/* Inputs and Selects */
select, .standard-input {
  width: 100%;
  background: #181818;
  border: 1px solid #3a3a3a;
  color: #eee;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  outline: none;
  transition: all 0.2s;
}

select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23888888%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 10px top 50%;
  background-size: 8px auto;
  padding-right: 24px;
}

select:focus, .standard-input:focus { 
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3);
}

.standard-input.invalid { border-color: #ef4444; }

.input-with-unit {
  position: relative;
  width: 80px;
  flex-shrink: 0;
  transition: opacity 0.3s ease;
}
.width-half { width: 50%; }

.input-with-unit input {
  width: 100%;
  background: #181818;
  border: 1px solid #3a3a3a;
  color: #eee;
  padding: 8px 24px 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  outline: none;
  transition: all 0.2s;
}

.input-with-unit input:focus { border-color: #3b82f6; }

.unit {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: #777;
  pointer-events: none;
}

/* Dropdowns */
.dropdown-wrapper { position: relative; }
.dropdown-btn {
  width: 100%;
  background: #181818;
  border: 1px solid #3a3a3a;
  color: #eee;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: border-color 0.2s;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23888888%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 10px top 50%;
  background-size: 8px auto;
  padding-right: 24px;
}
.dropdown-btn:focus { border-color: #3b82f6; }
.dropdown-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.dropdown-menu {
  position: absolute;
  top: 100%; left: 0; width: 100%;
  background-color: #252526;
  border: 1px solid #444;
  border-top: none;
  border-radius: 0 0 6px 6px;
  list-style: none;
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 0 4px 10px rgba(0,0,0,0.5);
  padding: 5px 0;
  margin: 0;
}
.dropdown-menu li { padding: 8px 12px; cursor: pointer; font-size: 12px; }
.dropdown-menu li:hover { background-color: #3b82f6; color: white; }
.dropdown-menu li.active { background-color: #37373d; color: #3b82f6; }

/* Toggles (iOS style) */
.toggle-list { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
.ios-toggle { display: flex; align-items: center; gap: 10px; cursor: pointer; margin: 0; text-transform: none; }
.ios-toggle.space-between { justify-content: space-between; }
.label-text { font-size: 12px; color: #ccc; font-weight: 500; text-transform: none; }

.switch { position: relative; display: inline-block; width: 36px; height: 20px; flex-shrink: 0; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #3a3a3a; transition: .3s; border-radius: 34px; }
.slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: #888; transition: .3s; border-radius: 50%; }
input:checked + .slider { background-color: #3b82f6; }
input:checked + .slider:before { transform: translateX(16px); background-color: white; }

.toggle-group { display: flex; flex-direction: column; gap: 8px; }
.toggle-input-wrapper { margin-left: 2px; transition: opacity 0.3s ease; }

/* Footer */
.footer { 
  padding: 20px;
  background: #1e1e1e;
  border-top: 1px solid #36373a;
}
.selection-info { 
  font-size: 11px; 
  color: #777; 
  text-align: left; 
  margin-bottom: 12px; 
}
.create-btn {
  width: 100%;
  padding: 12px;
  background: #3b82f6;
  border: none;
  color: #ffffff;
  font-weight: 700;
  font-size: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}
.create-btn:hover:not(:disabled) { background: #2563eb; }
.create-btn:disabled { background: #3a3a3a; color: #777; cursor: not-allowed; }

.loading, .error { flex: 1; display: flex; align-items: center; justify-content: center; color: #888; }
.empty-state { grid-column: 1 / -1; text-align: center; padding: 2rem; color: #555; }
.selection-frame { position: absolute; background-color: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.6); pointer-events: none; z-index: 100; }
</style>
