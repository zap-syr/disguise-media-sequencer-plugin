<template>
  <div class="media-app" :class="{ 'is-dragging': selection.isSelecting.value }" @click="selection.handleContainerClick">
    <div v-if="library.loading.value" class="loading">Loading...</div>
    <div v-else-if="library.error.value" class="error">{{ library.error.value }}</div>

    <div v-else class="main-layout">
      <!-- 1. Left Tree Sidebar -->
      <FolderTree
        :folders="sidebarFolders"
        :selected-folder-id="selectedFolderId"
        :expanded-folders="expandedFolders"
        @select="selectFolder"
        @toggle="toggleFolder"
      />

      <!-- 2. Center Content Area -->
      <FilesPane
        v-model:search-query="searchQuery"
        v-model:view-mode="viewMode"
        v-model:grid-size="gridSize"
        v-model:include-subfolders="includeSubfolders"
        :items="filteredMediaList"
        :breadcrumb="breadcrumb"
        :selected-folder-id="selectedFolderId"
        :is-refreshing="library.isRefreshing.value"
        :director-endpoint="props.directorEndpoint"
        :media-details="library.mediaDetails.value"
        :selection="selection"
        @select-folder="selectFolder"
        @refresh="library.refresh"
      />

      <!-- 3. Settings Sidebar (Right) -->
      <SettingsPanel
        :director-endpoint="props.directorEndpoint"
        :mappings="library.mappings.value"
        :tracks="library.tracks.value"
        :selection-count="selection.selectedItems.size"
        :is-creating="isCreating"
        :create-progress="createProgress"
        @create="handleCreateLayers"
        @track-created="library.addTrack"
      />
    </div>

    <Toast :toast="toast" @dismiss="dismissToast" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { createLayerPlan } from '../services/disguiseService';
import { buildSimplePlan } from '../utils/planBuilder';
import { flattenFiles, folderFiles, visibleFolders, breadcrumbPath } from '../utils/mediaTree';
import { useMediaLibrary } from '../composables/useMediaLibrary';
import { useFileSelection } from '../composables/useFileSelection';
import { usePersistedRef } from '../composables/usePersistedRef';
import { useToast } from '../composables/useToast';
import FolderTree from './tree/FolderTree.vue';
import FilesPane from './files/FilesPane.vue';
import SettingsPanel from './settings/SettingsPanel.vue';
import Toast from './common/Toast.vue';

const props = defineProps({
  directorEndpoint: { type: String, required: true }
});

const library = useMediaLibrary(props.directorEndpoint);
const { toast, show: showToast, dismiss: dismissToast } = useToast();

const isCreating = ref(false);
const createProgress = ref(null); // { created, total } while createLayerPlan runs
const searchQuery = ref('');

// Per-viewer view preferences
const viewMode = usePersistedRef('mediaSequencer.viewMode', 'grid', s => ['grid', 'list'].includes(s) ? s : undefined);
const gridSize = usePersistedRef('mediaSequencer.gridSize', 'medium', s => ['small', 'medium', 'large'].includes(s) ? s : undefined);
const includeSubfolders = usePersistedRef('mediaSequencer.includeSubfolders', false, s => s === 'true');

// Navigation state
const selectedFolderId = ref('all');
const expandedFolders = ref(new Set(['Root']));

const sidebarFolders = computed(() => visibleFolders(library.fullHierarchy.value, expandedFolders.value));
const breadcrumb = computed(() => breadcrumbPath(library.fullHierarchy.value, selectedFolderId.value));
const filteredMediaList = computed(() => folderFiles(library.fullHierarchy.value, selectedFolderId.value, {
  includeSubfolders: includeSubfolders.value,
  search: searchQuery.value
}));

const selection = useFileSelection(filteredMediaList);

const toggleFolder = (id) => {
  if (id === 'all') return;
  const newExpanded = new Set(expandedFolders.value);
  if (newExpanded.has(id)) newExpanded.delete(id);
  else newExpanded.add(id);
  expandedFolders.value = newExpanded;
};

const selectFolder = (id) => {
  selectedFolderId.value = id;
  if (id !== 'all' && !expandedFolders.value.has(id)) {
    const newExpanded = new Set(expandedFolders.value);
    newExpanded.add(id);
    expandedFolders.value = newExpanded;
  }
  searchQuery.value = '';
};

watch([selectedFolderId, searchQuery, includeSubfolders], () => {
  selection.clear();
});

onMounted(() => {
  library.load();
});

async function handleCreateLayers(requestOptions) {
  if (isCreating.value) return;

  try {
    isCreating.value = true;
    const allFilesFlat = flattenFiles(library.fullHierarchy.value, { tag: false });

    const filesById = new Map(allFilesFlat.map(file => [file.id, file]));
    const selectedPaths = Array.from(selection.selectedItems)
      .map(id => filesById.get(id)?.path)
      .filter(Boolean);

    const plan = buildSimplePlan(requestOptions, selectedPaths);
    const result = await createLayerPlan(props.directorEndpoint, plan, (created, total) => {
      createProgress.value = { created, total };
    });

    selection.clear();
    if (result.errors.length) {
      showToast(`Created ${result.created} of ${selectedPaths.length} layers — ${result.errors.length} skipped: ${result.errors[0].message}`, 'error');
      console.warn('Layer creation issues:', result.errors);
    } else {
      showToast(`Successfully created ${result.created} layers.`);
    }
  } catch (err) {
    showToast(`Failed to create layers: ${err.message}`, 'error');
    console.error(err);
  } finally {
    isCreating.value = false;
    createProgress.value = null;
  }
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.media-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: transparent;
  color: #cccccc;
  font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  overflow: hidden;
}

.media-app.is-dragging {
  user-select: none;
}

.main-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.loading, .error { flex: 1; display: flex; align-items: center; justify-content: center; color: #888; }
</style>
