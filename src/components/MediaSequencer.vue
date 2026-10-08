<template>
  <div class="media-app" :class="{ 'is-dragging': selection.isSelecting.value }" @click="selection.handleContainerClick">
    <div v-if="library.loading.value" class="loading">Loading...</div>
    <div v-else-if="library.error.value" class="error">{{ library.error.value }}</div>

    <div v-else class="main-layout">
      <!-- 1. Left Tree Sidebar -->
      <FolderTree
        v-if="showFiles"
        v-model:collapsed="treeCollapsed"
        :folders="sidebarFolders"
        :selected-folder-id="selectedFolderId"
        :expanded-folders="expandedFolders"
        @select="selectFolder"
        @toggle="toggleFolder"
      />

      <!-- 2. Center: files and/or layer plan -->
      <FilesPane
        v-if="showFiles"
        :class="{ 'files-side': showPlan }"
        v-model:search-query="searchQuery"
        v-model:view-mode="effectiveViewMode"
        v-model:grid-size="gridSize"
        v-model:include-subfolders="includeSubfolders"
        :items="filteredMediaList"
        :breadcrumb="breadcrumb"
        :selected-folder-id="selectedFolderId"
        :is-refreshing="library.isRefreshing.value"
        :director-endpoint="props.directorEndpoint"
        :media-details="library.mediaDetails.value"
        :group-labels="isAdvanced ? plan.groupLabelsByMedia.value : {}"
        :drag-enabled="showPlan"
        :selection="selection"
        @select-folder="selectFolder"
        @refresh="library.refresh"
      >
        <!-- Next to the plan the switch lives in the plan header; the side pane is narrow -->
        <template v-if="isAdvanced && !showPlan" #nav-extra>
          <WorkspaceSwitch v-model="workspace" />
        </template>
        <template v-if="isAdvanced" #selection-actions>
          <div class="plan-actions" @click.stop>
            <select
              class="add-sel"
              aria-label="Add selected files to a group"
              :disabled="!selection.selectedItems.size || !plan.state.groups.length"
              @change="onAddToGroup"
            >
              <option value="">Add to group…</option>
              <option v-for="(g, gi) in plan.state.groups" :key="g.id" :value="g.id">G{{ gi + 1 }}: {{ g.name }} ({{ g.items.length }})</option>
            </select>
            <button type="button" class="primary-sm" :disabled="!selection.selectedItems.size" @click="onNewGroup">+ New group</button>
          </div>
        </template>
      </FilesPane>

      <LayerPlan
        v-if="showPlan"
        ref="layerPlanRef"
        :plan-state="plan.state"
        :layout="planLayout"
        :details="library.mediaDetails.value"
        :files-by-path="filesByPath"
        :thumb-base="thumbBase"
        :show-splits="layerOptions.splitSection"
        :show-tags="tagsOn"
        :mappings-by-path="mappingsByPath"
        :armed="armedMapping"
        @assign="plan.assign"
        @clear-entries="plan.clearMappings"
        @assign-group="plan.assignGroup"
        @clear-group="plan.clearMappings"
        @clear-all-mappings="plan.clearMappings('all')"
        @disarm="armedMapping = null"
        :checked="planSelection.checked"
        :selected-ids="planSelection.selectedIds.value"
        @row-click="planSelection.click"
        @row-check="planSelection.toggle"
        @group-check="planSelection.toggleGroup"
        @drop-rows="onDropRows"
        @drop-files="onDropFiles"
        @remove-selected="onRemoveSelected"
        @deselect="planSelection.clear"
        @add-group="onAddEmptyGroup"
        @update-group="plan.updateGroup"
        @remove-group="onRemoveGroup"
        @remove-entry="plan.removeEntry"
        @set-all-open="plan.setAllOpen"
      >
        <template #header-extra>
          <WorkspaceSwitch v-model="workspace" />
        </template>
      </LayerPlan>

      <!-- 3. Settings Sidebar (Right) -->
      <SettingsPanel
        v-model:creation-mode="creationMode"
        :director-endpoint="props.directorEndpoint"
        :mappings="library.mappings.value"
        :tracks="library.tracks.value"
        :options="layerOptions"
        :layer-count="createCount"
        :summary="footerSummary"
        :unmapped-count="isAdvanced ? plan.unmappedCount.value : 0"
        :is-creating="isCreating"
        :create-progress="createProgress"
        @create="handleCreateLayers"
        @track-created="library.addTrack"
      >
        <template v-if="isAdvanced" #mappings>
          <MappingsPanel
            v-model:armed="armedMapping"
            :mappings="library.mappings.value"
            :usage="plan.mappingUsage.value"
          />
        </template>
      </SettingsPanel>
    </div>

    <Toast :toast="toast" @dismiss="dismissToast" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { createLayerPlan } from '../services/disguiseService';
import { buildSimplePlan, buildAdvancedPlan } from '../utils/planBuilder';
import { computePlanLayout } from '../utils/planLayout';
import { formatDuration } from '../utils/format';
import { setMappingPalette } from '../utils/mappingColors';
import { flattenFiles, folderFiles, visibleFolders, breadcrumbPath } from '../utils/mediaTree';
import { useMediaLibrary } from '../composables/useMediaLibrary';
import { useFileSelection } from '../composables/useFileSelection';
import { usePersistedRef } from '../composables/usePersistedRef';
import { useToast } from '../composables/useToast';
import { useLayerOptions } from '../composables/useLayerOptions';
import { useLayerPlan } from '../composables/useLayerPlan';
import { usePlanSelection } from '../composables/usePlanSelection';
import FolderTree from './tree/FolderTree.vue';
import FilesPane from './files/FilesPane.vue';
import SettingsPanel from './settings/SettingsPanel.vue';
import LayerPlan from './plan/LayerPlan.vue';
import WorkspaceSwitch from './common/WorkspaceSwitch.vue';
import MappingsPanel from './settings/MappingsPanel.vue';
import Toast from './common/Toast.vue';

const props = defineProps({
  directorEndpoint: { type: String, required: true }
});

const library = useMediaLibrary(props.directorEndpoint);
const { toast, show: showToast, dismiss: dismissToast } = useToast();

const layerOptions = useLayerOptions();
const isCreating = ref(false);
const createProgress = ref(null); // { created, total } while createLayerPlan runs
const searchQuery = ref('');

// Per-viewer view preferences
const viewMode = usePersistedRef('mediaSequencer.viewMode', 'grid', s => ['grid', 'list'].includes(s) ? s : undefined);
const gridSize = usePersistedRef('mediaSequencer.gridSize', 'medium', s => ['small', 'medium', 'large'].includes(s) ? s : undefined);
const includeSubfolders = usePersistedRef('mediaSequencer.includeSubfolders', false, s => s === 'true');

// Creation mode and workspace layout (Advanced only). Default Simple (docs §11 Q8).
const creationMode = usePersistedRef('mediaSequencer.creationMode', 'simple', s => ['simple', 'advanced'].includes(s) ? s : undefined);
const workspace = usePersistedRef('mediaSequencer.workspace', 'split', s => ['files', 'split', 'plan'].includes(s) ? s : undefined);
// Split defaults to the compact list; the Files layout keeps the user's own grid/list choice (docs §0.1)
const splitViewMode = usePersistedRef('mediaSequencer.splitViewMode', 'list', s => ['grid', 'list'].includes(s) ? s : undefined);

const isAdvanced = computed(() => creationMode.value === 'advanced');
const effectiveWorkspace = computed(() => (isAdvanced.value ? workspace.value : 'files'));
const showFiles = computed(() => effectiveWorkspace.value !== 'plan');
const showPlan = computed(() => effectiveWorkspace.value !== 'files');
const effectiveViewMode = computed({
  get: () => (effectiveWorkspace.value === 'split' ? splitViewMode.value : viewMode.value),
  set: v => {
    if (effectiveWorkspace.value === 'split') splitViewMode.value = v;
    else viewMode.value = v;
  }
});

// The tree is collapsed next to the plan and open in the Files layout (mockup behaviour)
const treeCollapsed = ref(false);
watch(effectiveWorkspace, ws => { treeCollapsed.value = ws !== 'files'; }, { immediate: true });

const plan = useLayerPlan();
const layerPlanRef = ref(null);

const planSelection = usePlanSelection(plan.state);

// Mapping armed for click-to-assign (keyboard alternative to drag & drop).
// Esc first disarms the mapping, then clears the plan row selection.
const armedMapping = ref(null);
watch(isAdvanced, adv => { if (!adv) armedMapping.value = null; });
function onKeydown(event) {
  if (event.key !== 'Escape') return;
  if (armedMapping.value) armedMapping.value = null;
  else planSelection.clear();
}
onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));

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

const mappingsByPath = computed(() => Object.fromEntries(library.mappings.value.map(m => [m.path, m])));
// Distinct colour per mapping, in list order (updates after Refresh)
watch(() => library.mappings.value, list => setMappingPalette(list), { immediate: true });

const filesByPath = computed(() => Object.fromEntries(
  flattenFiles(library.fullHierarchy.value, { tag: false }).map(f => [f.path, f])
));
const thumbBase = computed(() => {
  const ep = props.directorEndpoint;
  return `${ep.startsWith('http') ? ep : 'http://' + ep}/api/v1/thumbnail/`;
});

/** Clip paths of the selected files, in selection order. */
function selectedClipPaths() {
  const filesById = new Map(flattenFiles(library.fullHierarchy.value, { tag: false }).map(f => [f.id, f]));
  return Array.from(selection.selectedItems).map(id => filesById.get(id)?.path).filter(Boolean);
}

const tagsOn = computed(() => layerOptions.addTimecodeTag || layerOptions.addCueTag || layerOptions.addMidiNote);
const timingSettings = computed(() => ({
  fit: layerOptions.fitToContent,
  movieDur: layerOptions.movieDuration,
  stillDur: layerOptions.stillDuration,
  overlap: layerOptions.overlap
}));
const planLayout = computed(() => computePlanLayout(plan.state.groups, plan.state.entries, library.mediaDetails.value, timingSettings.value));

const createCount = computed(() => (isAdvanced.value ? plan.layerCount.value : selection.selectedItems.size));
const footerSummary = computed(() => {
  if (isAdvanced.value) {
    const g = plan.state.groups.length;
    if (!plan.layerCount.value) return 'Layer plan is empty';
    const maps = Object.keys(plan.mappingUsage.value).length;
    const unmapped = plan.unmappedCount.value;
    const parts = [
      `${g} ${g === 1 ? 'group' : 'groups'}`,
      `${plan.layerCount.value} layers`,
      `${maps} ${maps === 1 ? 'mapping' : 'mappings'}`,
      unmapped ? `${unmapped} without mapping` : null,
      `≈${formatDuration(planLayout.value.total) || '0s'}`
    ];
    return parts.filter(Boolean).join(', ');
  }
  const n = selection.selectedItems.size;
  if (!n) return 'No media selected';
  const paths = selectedClipPaths();
  const entries = Object.fromEntries(paths.map((p, i) => [i, { mediaId: p }]));
  const virtual = computePlanLayout([{ timing: 'seq', items: paths.map((p, i) => i) }], entries, library.mediaDetails.value, timingSettings.value);
  return `${n} layers, one after another, ≈${formatDuration(virtual.total) || '0s'}`;
});

// --- Plan actions ---

async function revealGroup(gid) {
  if (workspace.value === 'files') workspace.value = 'split';
  await nextTick();
  layerPlanRef.value?.jump(gid);
}

function onNewGroup() {
  const paths = selectedClipPaths();
  if (!paths.length) return;
  const gid = plan.newGroup(paths);
  selection.clear();
  revealGroup(gid);
}

function onAddToGroup(event) {
  const gid = event.target.value;
  event.target.value = '';
  const paths = selectedClipPaths();
  if (!gid || !paths.length) return;
  plan.addToGroup(gid, paths);
  selection.clear();
  const gi = plan.state.groups.findIndex(g => g.id === gid);
  showToast(`${paths.length} ${paths.length === 1 ? 'file' : 'files'} added to G${gi + 1}`);
  revealGroup(gid);
}

function onDropRows({ ids, gid, targetId, pos }) {
  plan.moveEntries(ids, gid, targetId, pos);
}

function onDropFiles({ paths, gid, targetId, pos }) {
  plan.insertFiles(paths, gid, targetId, pos);
  selection.clear();
  const gi = plan.state.groups.findIndex(g => g.id === gid);
  showToast(`${paths.length} ${paths.length === 1 ? 'file' : 'files'} added to G${gi + 1}`);
}

function onRemoveSelected() {
  const ids = [...planSelection.selectedIds.value];
  if (!ids.length) return;
  const restore = plan.removeEntries(ids);
  planSelection.clear();
  showToast(`${ids.length} ${ids.length === 1 ? 'layer' : 'layers'} removed from the plan`, 'info', { label: 'Undo', fn: restore });
}

function onAddEmptyGroup() {
  revealGroup(plan.addEmptyGroup());
}

function onRemoveGroup(gid) {
  const gi = plan.state.groups.findIndex(g => g.id === gid);
  const group = plan.state.groups[gi];
  const hadItems = !!group && group.items.length > 0;
  const restore = plan.removeGroup(gid);
  if (hadItems) showToast(`G${gi + 1} “${group.name}” deleted`, 'info', { label: 'Undo', fn: restore });
}

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
    const advanced = isAdvanced.value;
    const payload = advanced
      ? buildAdvancedPlan(requestOptions, plan.state)
      : buildSimplePlan(requestOptions, selectedClipPaths());
    const expected = payload.groups.reduce((n, g) => n + g.layers.length, 0);

    const result = await createLayerPlan(props.directorEndpoint, payload, (created, total) => {
      createProgress.value = { created, total };
    });

    // Simple consumes the selection; Advanced keeps the plan so it can be tweaked and re-created
    if (!advanced) selection.clear();
    if (result.errors.length) {
      showToast(`Created ${result.created} of ${expected} layers, ${result.errors.length} skipped: ${result.errors[0].message}`, 'error');
      console.warn('Layer creation issues:', result.errors);
    } else {
      showToast(advanced
        ? `Created ${result.created} layers in ${payload.groups.length} ${payload.groups.length === 1 ? 'group' : 'groups'}.`
        : `Successfully created ${result.created} layers.`);
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

/* Files pane next to the layer plan (Split layout) */
.files-side {
  flex: 0 0 420px;
  width: 420px;
  border-right: 1px solid #2a2a2a;
}
/* Compact the narrow side pane: tighter paddings, flexible search, wrapping toolbar */
.files-side :deep(.top-nav-bar) { padding: 0 12px; gap: 10px; }
.files-side :deep(.breadcrumb) { min-width: 0; overflow: hidden; white-space: nowrap; }
.files-side :deep(.top-nav-right) { flex: 1 1 auto; min-width: 0; justify-content: flex-end; }
.files-side :deep(.search-bar) { width: auto; flex: 1 1 150px; min-width: 0; max-width: 220px; }
.files-side :deep(.action-toolbar) { flex-wrap: wrap; height: auto; min-height: 40px; padding: 6px 12px; row-gap: 6px; }
.files-side :deep(.media-grid) { padding: 12px; }

.plan-actions { display: flex; align-items: center; gap: 8px; }
.add-sel {
  height: 28px;
  max-width: 180px;
  background: #181818;
  border: 1px solid #3a3a3a;
  color: #eeeeee;
  border-radius: 6px;
  font-size: 12px;
  padding: 0 8px;
  cursor: pointer;
  outline: none;
}
.add-sel:focus { border-color: #0a84ff; }
.add-sel:disabled { opacity: 0.4; cursor: not-allowed; }
.primary-sm {
  height: 28px;
  background: #0a84ff;
  border: none;
  color: #ffffff;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  padding: 0 10px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s ease;
}
.primary-sm:hover:not(:disabled) { background: #0060d1; }
.primary-sm:disabled { background: #3a3a3a; color: #777777; cursor: not-allowed; }

.loading, .error { flex: 1; display: flex; align-items: center; justify-content: center; color: #888; }
</style>
