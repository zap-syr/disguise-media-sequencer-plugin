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
        :select-enabled="isAdvanced"
        :checked-folders="folderSelection.checked"
        @select="selectFolder"
        @toggle="toggleFolder"
        @folder-click="folderSelection.click"
        @folder-check="folderSelection.toggle"
        @clear-checked="folderSelection.clear"
        @create-groups="createFolderGroups"
      >
        <template v-if="isAdvanced && folderSelection.checked.size" #footer>
          <FolderGroupsStrip
            v-model:content="folderContent"
            v-model:insert-after="folderInsertAfter"
            :folder-count="folderSelection.checked.size"
            :result="folderResult"
            :groups="plan.state.groups"
            @create="createFolderGroups"
            @clear="folderSelection.clear"
          />
        </template>
      </FolderTree>

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
          <!-- "New group" lives in the select: the keyboard / Files-layout way next to dropping files on the plan -->
          <div class="plan-actions" @click.stop>
            <select
              class="add-sel"
              aria-label="Add selected files to a new or existing group"
              title="Add the selected files to a new or existing group, or drag them onto the plan"
              :disabled="!selection.selectedItems.size"
              @change="onAddToGroup"
            >
              <option value="">Add to group…</option>
              <option :value="NEW_GROUP">New group</option>
              <optgroup v-if="plan.state.groups.length" label="Existing groups">
                <option v-for="(g, gi) in plan.state.groups" :key="g.id" :value="g.id">G{{ gi + 1 }}: {{ g.name }} ({{ g.items.length }})</option>
              </optgroup>
            </select>
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
        @row-click="onRowClick"
        @row-check="onRowCheck"
        :override-stats="plan.overrideStats.value"
        :override-counts="plan.overrideCounts.value"
        :globals="planGlobals"
        :mappings="library.mappings.value"
        @auto-assign="plan.applyAutoAssign"
        @set-plan="plan.setPlan"
        @reset-plan-keys="plan.resetPlanKeys"
        @clear-overrides="plan.clearOverrides"
        @reset-all-overrides="plan.resetAllOverrides"
        @set-group-ov="plan.setGroupOv"
        @set-layer-ov="plan.setLayerOv"
        @reset-group="plan.resetGroup"
        @apply-to-all="plan.applyGroupValueToAll"
        @apply-to-group="plan.applyLayerValueToGroup"
        @group-check="planSelection.toggleGroup"
        @drop-rows="onDropRows"
        @drop-files="onDropFiles"
        @remove-selected="onRemoveSelected"
        @drop-folders="onDropFolders"
        @drop-folder-groups="onDropFolderGroups"
        @drop-file-group="onDropFileGroup"
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
        ref="settingsRef"
        v-model:creation-mode="creationMode"
        :director-endpoint="props.directorEndpoint"
        :mappings="library.mappings.value"
        :tracks="library.tracks.value"
        :options="layerOptions"
        :layer-count="createCount"
        :summary="footerSummary"
        :unmapped-count="isAdvanced ? plan.unmappedCount.value : 0"
        :missing-count="isAdvanced ? plan.missingCount.value : 0"
        :mappings-used="Object.keys(plan.mappingUsage.value).length"
        :markers="markerCounts"
        :is-creating="isCreating"
        :create-progress="createProgress"
        @create="handleCreateLayers"
        @track-created="library.addTrack"
        @open-plan-defaults="openPlanDefaults"
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
import { ref, computed, watch, onMounted, onUnmounted, nextTick, provide } from 'vue';
import { createLayerPlan } from '../services/disguiseService';
import { buildSimplePlan, buildAdvancedPlan } from '../utils/planBuilder';
import { computePlanLayout, countMarkers, describeMarkers } from '../utils/planLayout';
import { formatDuration } from '../utils/format';
import { setMappingPalette } from '../utils/mappingColors';
import { flattenFiles, folderFiles, visibleFolders, breadcrumbPath, folderOrder, folderGroups } from '../utils/mediaTree';
import { useFolderSelection } from '../composables/useFolderSelection';
import FolderGroupsStrip from './tree/FolderGroupsStrip.vue';
import { useMediaLibrary } from '../composables/useMediaLibrary';
import { useFileSelection } from '../composables/useFileSelection';
import { usePersistedRef } from '../composables/usePersistedRef';
import { useToast } from '../composables/useToast';
import { useLayerOptions } from '../composables/useLayerOptions';
import { useLayerPlan } from '../composables/useLayerPlan';
import { usePlanStorage } from '../composables/usePlanStorage';
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

const filesByPath = computed(() => Object.fromEntries(
  flattenFiles(library.fullHierarchy.value, { tag: false }).map(f => [f.path, f])
));
// A plan row whose clip is gone (after Refresh or a restored plan, docs §6.3): removed from the
// project, or still listed but its media was deleted (Designer flags the clip "in error")
const isMissingClip = path => !library.loading.value && !library.error.value &&
  (!filesByPath.value[path] || !!library.mediaDetails.value[path]?.missing);

const plan = useLayerPlan(isMissingClip);
// The plan survives a panel reload, one per director (docs §6.4)
const planWasReset = usePlanStorage(plan, `mediaSequencer.plan.${props.directorEndpoint}`);
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

// Files whose media went missing cannot be selected, so they never reach Create or the plan
const selection = useFileSelection(filteredMediaList, item => isMissingClip(item.path));
watch(() => library.mediaDetails.value, () => selection.dropLocked());

// --- Groups from folders (docs §2.3.2) ---
const allFolderIds = computed(() => folderOrder(library.fullHierarchy.value));
const folderSelection = useFolderSelection(sidebarFolders, allFolderIds);
watch(isAdvanced, adv => { if (!adv) folderSelection.clear(); });

// Content mode: persisted once chosen, otherwise follows "Include subfolders" (Q12)
const storedFolderContent = usePersistedRef('mediaSequencer.folderContent', '', s => ['direct', 'deep', 'split'].includes(s) ? s : undefined);
const folderContent = computed({
  get: () => storedFolderContent.value || (includeSubfolders.value ? 'deep' : 'direct'),
  set: v => { storedFolderContent.value = v; }
});
const folderInsertAfter = ref('');
// Folder files whose media went missing are left out of the new groups
const groupsFromFolders = folderIds => folderGroups(library.fullHierarchy.value, folderIds, folderContent.value, isMissingClip);
const folderResult = computed(() => groupsFromFolders(folderSelection.checked));

function folderGroupDefs(result) {
  return result.groups.map(g => ({ name: g.name, paths: g.paths, sourceFolder: { id: g.folderId, content: folderContent.value } }));
}

function skippedNote(result) {
  const parts = [];
  if (result.skippedNested) parts.push(`${result.skippedNested} nested skipped`);
  if (result.skippedEmpty) parts.push(`${result.skippedEmpty} empty skipped`);
  if (result.skippedMissing) parts.push(`${result.skippedMissing} missing ${result.skippedMissing === 1 ? 'file' : 'files'} skipped`);
  return parts.length ? ` (${parts.join(', ')})` : '';
}

/** Adds groups for folder results at a plan index and reveals the first one. */
function addFolderGroups(result, index) {
  if (!result.groups.length) {
    showToast('The selected folders have no files for this content mode.', 'error');
    return;
  }
  const ids = plan.insertGroups(folderGroupDefs(result), index);
  const n = ids.length;
  showToast(`${n} ${n === 1 ? 'group' : 'groups'} created, ${result.files} files${skippedNote(result)}`);
  revealGroup(ids[0]);
}

function createFolderGroups() {
  const result = folderResult.value;
  const after = plan.state.groups.findIndex(g => g.id === folderInsertAfter.value);
  addFolderGroups(result, after >= 0 ? after + 1 : null);
  if (result.groups.length) {
    folderSelection.clear();
    folderInsertAfter.value = '';
  }
}

function onDropFolderGroups({ folderIds, index }) {
  addFolderGroups(groupsFromFolders(folderIds), index);
  folderSelection.clear();
}

/** Folders dropped onto a group add their files to it (tree order, content mode applies). */
function onDropFolders({ folderIds, gid, targetId, pos }) {
  const result = groupsFromFolders(folderIds);
  const paths = result.groups.flatMap(g => g.paths);
  if (!paths.length) {
    showToast('The dropped folders have no files for this content mode.', 'error');
    return;
  }
  plan.insertFiles(paths, gid, targetId, pos);
  folderSelection.clear();
  const gi = plan.state.groups.findIndex(g => g.id === gid);
  showToast(`${paths.length} files added to G${gi + 1}${skippedNote(result)}`);
}

const mappingsByPath = computed(() => Object.fromEntries(library.mappings.value.map(m => [m.path, m])));
// Distinct colour per mapping, in list order (updates after Refresh)
watch(() => library.mappings.value, list => setMappingPalette(list), { immediate: true });

// Each load / Refresh: mappings gone from the project are cleared from the plan (docs §6.3)
watch(() => library.mappings.value, list => {
  const known = new Set(list.map(m => m.path));
  const { mappings, layers } = plan.clearUnknownMappings(path => known.has(path));
  if (mappings) {
    showToast(`${mappings} ${mappings === 1 ? 'mapping no longer exists' : 'mappings no longer exist'}, cleared from ${layers} ${layers === 1 ? 'layer' : 'layers'}`);
  }
});
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
const planGlobals = computed(() => ({ tagsOn: !!tagsOn.value, splitOn: !!layerOptions.splitSection }));

// Plan chip popovers switch the global markers: Split section in the Split popover header,
// the Tags "Off" pill opens the Timeline markers section (docs §2.5.1)
const settingsRef = ref(null);
provide('markerControls', {
  setSplit: on => { layerOptions.splitSection = !!on; },
  openMarkers: () => settingsRef.value?.revealSection('markers')
});

async function openPlanDefaults() {
  if (workspace.value === 'files') workspace.value = 'split';
  await nextTick();
  layerPlanRef.value?.openDefaults();
}

// Simple settings shaped like Plan defaults, for the Simple footer estimate (tags and splits at every file)
const simpleValues = computed(() => ({
  timing: 'seq',
  overlap: layerOptions.overlap,
  tag: 'file',
  split: 'file',
  fit: layerOptions.fitToContent,
  movieDur: layerOptions.movieDuration,
  stillDur: layerOptions.stillDuration
}));
const planLayout = computed(() => computePlanLayout(plan.state.groups, plan.state.entries, library.mediaDetails.value, plan.state.plan, isMissingClip));
// Simple = a virtual one-group plan of the selected files
const simpleLayout = computed(() => {
  const paths = selectedClipPaths();
  const entries = Object.fromEntries(paths.map((p, i) => [i, { mediaId: p }]));
  return computePlanLayout([{ items: paths.map((p, i) => i) }], entries, library.mediaDetails.value, simpleValues.value);
});
const markerCounts = computed(() => countMarkers(isAdvanced.value ? planLayout.value : simpleLayout.value, {
  split: layerOptions.splitSection,
  tc: layerOptions.addTimecodeTag,
  cue: layerOptions.addCueTag,
  midi: layerOptions.addMidiNote
}));
const markersText = computed(() => describeMarkers(markerCounts.value).join(', ') || 'no markers');

/** A row click or check edits that row again, so its group leaves "Edit group instead". */
function onRowClick(id, event) {
  planSelection.click(id, event);
  resetScope(id);
}
function onRowCheck(id) {
  planSelection.toggle(id);
  resetScope(id);
}
function resetScope(id) {
  const group = plan.groupOf(id);
  if (group && group.scope !== 'auto') plan.updateGroup(group.id, { scope: 'auto' });
}

// Advanced: rows with a missing clip are skipped by Create
const createCount = computed(() => (isAdvanced.value ? plan.layerCount.value - plan.missingCount.value : selection.selectedItems.size));
const footerSummary = computed(() => {
  if (isAdvanced.value) {
    const g = plan.state.groups.length;
    if (!plan.layerCount.value) return 'Layer plan is empty';
    const maps = Object.keys(plan.mappingUsage.value).length;
    const unmapped = plan.unmappedCount.value;
    const missing = plan.missingCount.value;
    const parts = [
      `${g} ${g === 1 ? 'group' : 'groups'}`,
      `${createCount.value} layers`,
      missing ? `${missing} missing ${missing === 1 ? 'clip' : 'clips'}` : null,
      `${maps} ${maps === 1 ? 'mapping' : 'mappings'}`,
      unmapped ? `${unmapped} without mapping` : null,
      `≈${formatDuration(planLayout.value.total) || '0s'}`,
      markersText.value
    ];
    return parts.filter(Boolean).join(', ');
  }
  const n = selection.selectedItems.size;
  if (!n) return 'No media selected';
  return `${n} layers, one after another, ≈${formatDuration(simpleLayout.value.total) || '0s'}, ${markersText.value}`;
});

// --- Plan actions ---

async function revealGroup(gid) {
  if (workspace.value === 'files') workspace.value = 'split';
  await nextTick();
  layerPlanRef.value?.jump(gid);
}

const NEW_GROUP = '__new';

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
  if (gid === NEW_GROUP) {
    onNewGroup();
    return;
  }
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

/** Files dropped on empty plan space or between groups: a new group there, in drag order (docs §2.3.0). */
function onDropFileGroup({ paths, index }) {
  if (!paths.length) return;
  const [gid] = plan.insertGroups([{ name: `Group ${plan.state.groups.length + 1}`, paths }], index);
  selection.clear();
  const gi = plan.state.groups.findIndex(g => g.id === gid);
  showToast(`G${gi + 1} created, ${paths.length} ${paths.length === 1 ? 'file' : 'files'}`);
  revealGroup(gid);
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
  if (planWasReset) showToast('Saved plan was reset');
});

async function handleCreateLayers(requestOptions) {
  if (isCreating.value) return;

  try {
    isCreating.value = true;
    const advanced = isAdvanced.value;
    const payload = advanced
      ? buildAdvancedPlan(requestOptions, plan.state, isMissingClip)
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
  /* Gives up width first in a narrow window, so the plan keeps its minimum */
  flex: 0 1 420px;
  width: auto;
  min-width: 220px;
  border-right: 1px solid #2a2a2a;
}
/* The top bar and toolbar adapt to the pane width themselves (FilesPane container queries) */
.files-side :deep(.media-grid) { padding: 12px; }

/* Shrinks before the toolbar would wrap; the label ends with an ellipsis */
.plan-actions { display: flex; align-items: center; gap: 8px; flex: 0 1 180px; min-width: 110px; }
/* Narrowest files pane (FilesPane is the container) */
@container (max-width: 340px) {
  .plan-actions { min-width: 92px; }
}
.add-sel {
  height: 28px;
  width: 100%;
  min-width: 0;
  text-overflow: ellipsis;
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

.loading, .error { flex: 1; display: flex; align-items: center; justify-content: center; color: #888; }
</style>
