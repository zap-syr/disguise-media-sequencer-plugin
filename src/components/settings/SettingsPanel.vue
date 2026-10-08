<template>
  <div class="settings-sidebar" @click.stop>
    <div class="settings-header">
      <span class="settings-header-title">SETTINGS</span>
      <div class="segmented-control compact" role="group" aria-label="Creation mode">
        <button type="button" class="segment" :class="{ active: creationMode === 'simple' }" @click="creationMode = 'simple'">Simple</button>
        <button type="button" class="segment" :class="{ active: creationMode === 'advanced' }" @click="creationMode = 'advanced'">Advanced</button>
      </div>
    </div>
    <div class="mode-hint">
      {{ creationMode === 'advanced'
        ? 'Advanced — groups of files with their own timing. Build the plan in the Layer plan pane.'
        : 'Simple — one mapping for all layers, created one after another.' }}
    </div>

    <div class="settings-sidebar-content">

      <!-- LAYER PROPERTIES -->
      <div class="group-box">
        <div class="group-header">LAYER PROPERTIES</div>
        <div class="control">
          <label>Mapping</label>
          <div class="searchable-select" ref="mappingRef">
            <input
              type="text"
              v-model="mappingSearchQuery"
              @focus="toggleMappingMenu(true)"
              :placeholder="selectedMapping ? selectedMapping.name : 'Search Mapping...'"
              class="standard-input dropdown-input"
            />
            <span class="dropdown-arrow">▼</span>

            <ul v-if="isMappingMenuOpen" class="dropdown-list">
              <li
                v-for="m in filteredMappings"
                :key="m.uid"
                class="dropdown-item"
                :class="{ selected: selectedMapping?.uid === m.uid }"
                @click="selectMapping(m)"
              >
                {{ m.name }}
              </li>
              <li v-if="filteredMappings.length === 0" class="dropdown-empty">
                No results found
              </li>
            </ul>
          </div>
        </div>
        <div class="row">
          <div class="control">
            <label>Mode</label>
            <div class="searchable-select" ref="modeRef">
              <div class="dropdown-trigger" @click="toggleModeMenu">{{ options.mode }}</div>
              <span class="dropdown-arrow">▼</span>
              <ul v-if="isModeMenuOpen" class="dropdown-list">
                <li class="dropdown-item" :class="{ selected: options.mode === 'Normal' }" @click="selectMode('Normal')">Normal</li>
                <li class="dropdown-item" :class="{ selected: options.mode === 'Locked' }" @click="selectMode('Locked')">Locked</li>
              </ul>
            </div>
          </div>
          <div class="control">
            <label>At End Point</label>
            <div class="searchable-select" ref="atEndPointRef">
              <div class="dropdown-trigger" @click="toggleAtEndPointMenu">{{ options.atEndPoint }}</div>
              <span class="dropdown-arrow">▼</span>
              <ul v-if="isAtEndPointMenuOpen" class="dropdown-list">
                <li class="dropdown-item" :class="{ selected: options.atEndPoint === 'Loop' }" @click="selectAtEndPoint('Loop')">Loop</li>
                <li class="dropdown-item" :class="{ selected: options.atEndPoint === 'Ping-Pong' }" @click="selectAtEndPoint('Ping-Pong')">Ping-Pong</li>
                <li class="dropdown-item" :class="{ selected: options.atEndPoint === 'Pause' }" @click="selectAtEndPoint('Pause')">Pause</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="toggle-list">
          <div class="toggle-group">
            <label class="ios-toggle space-between">
              <span class="label-text">Animate Brightness</span>
              <div class="switch">
                <input type="checkbox" v-model="options.animateBrightness">
                <span class="slider"></span>
              </div>
            </label>

            <div class="inline-row toggle-input-wrapper" :class="{ disabled: !options.animateBrightness }">
              <span class="label-text-secondary">Time</span>
              <div class="input-with-unit">
                <input type="number" v-model.number="options.brightnessDuration" min="0" step="0.5" :disabled="!options.animateBrightness" />
                <span class="unit">s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CONTENT DURATION -->
      <div class="group-box">
        <div class="group-header">LAYER DURATION</div>

        <div class="control">
          <label>Movie Duration</label>
          <div class="toggle-group">
            <label class="ios-toggle space-between">
              <span class="label-text">Fit To Contents</span>
              <div class="switch">
                <input type="checkbox" v-model="options.fitToContent">
                <span class="slider"></span>
              </div>
            </label>

            <div class="inline-row toggle-input-wrapper" :class="{ disabled: options.fitToContent }">
              <span class="label-text-secondary">Time</span>
              <div class="input-with-unit">
                <input type="number" v-model.number="options.movieDuration" min="0" step="1" :disabled="options.fitToContent" />
                <span class="unit">s</span>
              </div>
            </div>
          </div>
        </div>

        <div class="control">
          <label>Still Image Duration</label>
          <div class="inline-row">
            <span class="label-text-secondary">Time</span>
            <div class="input-with-unit">
              <input type="number" v-model.number="options.stillDuration" min="0" step="1" />
              <span class="unit">s</span>
            </div>
          </div>
        </div>
      </div>

      <!-- INSERT SETTINGS -->
      <div class="group-box">
        <div class="group-header">INSERT SETTINGS</div>
        <div class="control">
          <label>Insert Location</label>
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

        <div class="stacked-controls" :class="{ disabled: options.insertMode !== 'Specific location' }">
          <div class="control">
            <label>Track</label>
            <div class="searchable-select" ref="trackRef">
              <input
                type="text"
                v-model="trackSearchQuery"
                @focus="toggleTrackMenu(true)"
                :placeholder="selectedTrack ? selectedTrack.name : 'Search Track...'"
                class="standard-input dropdown-input"
                :disabled="options.insertMode !== 'Specific location'"
              />
              <span class="dropdown-arrow">▼</span>

              <div v-if="isTrackMenuOpen" class="dropdown-list">
                <ul class="dropdown-list-scroll">
                  <li
                    v-for="t in filteredTracks"
                    :key="t.uid"
                    class="dropdown-item"
                    :class="{ selected: selectedTrack?.uid === t.uid }"
                    @click="selectTrack(t)"
                  >
                    {{ t.name }}
                  </li>
                  <li v-if="filteredTracks.length === 0" class="dropdown-empty">
                    No results found
                  </li>
                </ul>
                <div class="dropdown-create-item" @click.stop="startCreateTrack">
                  + Create New Track
                </div>
              </div>
            </div>
          </div>

          <div v-if="isCreatingTrack" class="create-track-panel" @click.stop>
            <label>New Track Name</label>
            <input
              ref="newTrackNameInput"
              type="text"
              v-model="newTrackName"
              class="standard-input"
              placeholder="Enter a unique track name..."
              @input="newTrackName = $event.target.value.toLowerCase()"
              @keyup.enter="confirmCreateTrack"
              @keyup.escape="cancelCreateTrack"
            />
            <div v-if="newTrackNameError && newTrackName !== ''" class="create-track-error">
              {{ newTrackNameError }}
            </div>
            <div class="create-track-actions">
              <button class="create-track-cancel-btn" @click.stop="cancelCreateTrack">Cancel</button>
              <button
                class="create-track-confirm-btn"
                :disabled="!!newTrackNameError || isCreatingTrackLoading"
                @click.stop="confirmCreateTrack"
              >
                {{ isCreatingTrackLoading ? 'Creating...' : 'Create' }}
              </button>
            </div>
          </div>

          <div class="control">
            <label>Time</label>
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

        <div class="control">
          <label>Overlap Layers</label>
          <div class="inline-row">
            <span class="label-text-secondary">Time</span>
            <div class="input-with-unit">
              <input type="number" v-model.number="options.overlap" min="0" step="0.5" />
              <span class="unit">s</span>
            </div>
          </div>
        </div>

        <div class="toggle-list">
          <label class="ios-toggle space-between">
            <label>Split Section</label>
            <div class="switch">
              <input type="checkbox" v-model="options.splitSection">
              <span class="slider"></span>
            </div>
          </label>
        </div>
      </div>

      <!-- TAGS -->
      <div class="group-box">
        <div class="group-header">TAGS</div>
        <div class="toggle-list">
          <div class="toggle-group">
            <label class="ios-toggle space-between">
              <span class="label-text">Add Timecode Tag</span>
              <div class="switch">
                <input type="checkbox" v-model="options.addTimecodeTag">
                <span class="slider"></span>
              </div>
            </label>

            <div class="toggle-input-wrapper timecode-grid" :class="{ disabled: !options.addTimecodeTag }">
              <div>
                <span class="label-text-secondary">Start Time</span>
                <input
                  type="text"
                  v-model="options.timecodeStart"
                  class="standard-input"
                  placeholder="00:00:00:00"
                  :disabled="!options.addTimecodeTag"
                  :class="{ invalid: options.addTimecodeTag && !isTimecodeStartValid && options.timecodeStart !== '' }"
                />
              </div>
              <div>
                <span class="label-text-secondary">Increment Time</span>
                <input
                  type="text"
                  v-model="options.timecodeIncrement"
                  class="standard-input"
                  placeholder="00:00:00:00"
                  :disabled="!options.addTimecodeTag"
                  :class="{ invalid: options.addTimecodeTag && !isTimecodeIncrementValid && options.timecodeIncrement !== '' }"
                />
              </div>
            </div>
          </div>

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
                @input="handleCueTagInput"
                @blur="handleCueTagBlur"
              />
            </div>
          </div>

          <div class="toggle-group">
            <label class="ios-toggle space-between">
              <span class="label-text">Add MIDI Tag</span>
              <div class="switch">
                <input type="checkbox" v-model="options.addMidiNote">
                <span class="slider"></span>
              </div>
            </label>

            <div class="toggle-input-wrapper" :class="{ disabled: !options.addMidiNote }">
              <input
                type="text"
                v-model="options.midiNoteValue"
                class="standard-input"
                placeholder="e.g. 9.1"
                :disabled="!options.addMidiNote"
                :class="{ invalid: options.addMidiNote && !isMidiNoteValid && options.midiNoteValue !== '' }"
                @input="handleMidiNoteInput"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-footer">
      <div v-if="summary" class="footer-summary">{{ summary }}</div>
      <button
        class="create-btn"
        :disabled="!isCreateLayersEnabled || isCreating"
        @click="handleCreate"
      >
        {{ createLabel }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { createTrack } from '../../services/disguiseService';
import { TIMECODE_RE } from '../../utils/timecode';
import { maskCueValue, isCueValueValid, maskMidiValue, isMidiValueValid } from '../../utils/tagInputs';

const props = defineProps({
  directorEndpoint: { type: String, required: true },
  mappings: { type: Array, required: true },
  tracks: { type: Array, required: true },
  // reactive object from useLayerOptions(); fields are edited in place
  options: { type: Object, required: true },
  // layers the Create button would make: selected files (Simple) or plan entries (Advanced)
  layerCount: { type: Number, default: 0 },
  summary: { type: String, default: '' },
  isCreating: { type: Boolean, default: false },
  createProgress: { type: Object, default: null } // { created, total }
});
const emit = defineEmits(['create', 'track-created']);
const creationMode = defineModel('creationMode', { type: String, default: 'simple' });
const options = props.options;


const selectedMapping = ref(null);
const selectedTrack = ref(null);

const isMappingMenuOpen = ref(false);
const isTrackMenuOpen = ref(false);
const isModeMenuOpen = ref(false);
const isAtEndPointMenuOpen = ref(false);

const mappingSearchQuery = ref('');
const trackSearchQuery = ref('');

const mappingRef = ref(null);
const trackRef = ref(null);
const modeRef = ref(null);
const atEndPointRef = ref(null);
const newTrackNameInput = ref(null);

// Create Track state
const isCreatingTrack = ref(false);
const newTrackName = ref('');
const isCreatingTrackLoading = ref(false);

// --- Computed Properties ---

const filteredMappings = computed(() => {
  if (!mappingSearchQuery.value) return props.mappings;
  const query = mappingSearchQuery.value.toLowerCase();
  return props.mappings.filter(m => m.name.toLowerCase().includes(query));
});

const filteredTracks = computed(() => {
  if (!trackSearchQuery.value) return props.tracks;
  const query = trackSearchQuery.value.toLowerCase();
  return props.tracks.filter(t => t.name.toLowerCase().includes(query));
});

const isMidiNoteValid = computed(() => !options.addMidiNote || isMidiValueValid(options.midiNoteValue));
const isCueValid = computed(() => !options.addCueTag || isCueValueValid(options.cueValue));

const isStartTimeValid = computed(() => {
  if (options.insertMode !== 'Specific location') return true;
  return TIMECODE_RE.test(options.startTime);
});

const isTimecodeStartValid = computed(() => !options.addTimecodeTag || TIMECODE_RE.test(options.timecodeStart));
const isTimecodeIncrementValid = computed(() => !options.addTimecodeTag || TIMECODE_RE.test(options.timecodeIncrement));

const newTrackNameError = computed(() => {
  const name = newTrackName.value.trim();
  if (!name) return 'Name is required';
  if (props.tracks.some(t => t.name.toLowerCase() === name.toLowerCase())) return 'Name already exists';
  return null;
});

const isCreateLayersEnabled = computed(() => {
  const hasSelection = props.layerCount > 0;
  const hasMapping = !!selectedMapping.value;
  const validCue = isCueValid.value && (options.addCueTag ? options.cueValue !== '' : true);
  const validMidi = isMidiNoteValid.value && (options.addMidiNote ? options.midiNoteValue !== '' : true);
  const validTimecode = isTimecodeStartValid.value && isTimecodeIncrementValid.value;
  const validLocation = options.insertMode === 'At Playhead' || (selectedTrack.value && isStartTimeValid.value);

  return hasSelection && hasMapping && validCue && validMidi && validTimecode && validLocation;
});

const createLabel = computed(() => {
  if (!props.isCreating) return props.layerCount > 0 ? `CREATE ${props.layerCount} LAYERS` : 'CREATE LAYERS';
  const p = props.createProgress;
  return p && p.total > 0 ? `CREATING... ${p.created}/${p.total}` : 'CREATING...';
});

// --- Input masks ---

function handleCueTagInput(event) {
  const result = maskCueValue(event.target.value);
  options.cueValue = result;
  event.target.value = result;
}

function handleCueTagBlur() {
  options.cueValue = options.cueValue.replace(/\.$/, '');
}

function handleMidiNoteInput(event) {
  const result = maskMidiValue(event.target.value);
  options.midiNoteValue = result;
  event.target.value = result;
}

// --- Dropdowns ---

const toggleMappingMenu = (forceOpen = false) => {
  if (forceOpen) {
    isMappingMenuOpen.value = true;
    mappingSearchQuery.value = '';
  } else {
    isMappingMenuOpen.value = !isMappingMenuOpen.value;
    if (!isMappingMenuOpen.value) mappingSearchQuery.value = selectedMapping.value ? selectedMapping.value.name : '';
  }
  isTrackMenuOpen.value = false;
};
const selectMapping = (m) => {
  selectedMapping.value = m;
  isMappingMenuOpen.value = false;
  mappingSearchQuery.value = m.name;
};

const toggleTrackMenu = (forceOpen = false) => {
  if (options.insertMode !== 'Specific location') return;
  if (forceOpen) {
    isTrackMenuOpen.value = true;
    trackSearchQuery.value = '';
    isCreatingTrack.value = false;
    newTrackName.value = '';
  } else {
    isTrackMenuOpen.value = !isTrackMenuOpen.value;
    if (!isTrackMenuOpen.value) {
      trackSearchQuery.value = selectedTrack.value ? selectedTrack.value.name : '';
      isCreatingTrack.value = false;
      newTrackName.value = '';
    }
  }
  isMappingMenuOpen.value = false;
};
const selectTrack = (t) => {
  selectedTrack.value = t;
  isTrackMenuOpen.value = false;
  trackSearchQuery.value = t.name;
  isCreatingTrack.value = false;
  newTrackName.value = '';
};

const toggleModeMenu = () => {
  isModeMenuOpen.value = !isModeMenuOpen.value;
  isAtEndPointMenuOpen.value = false;
  isMappingMenuOpen.value = false;
  isTrackMenuOpen.value = false;
};
const selectMode = (val) => {
  options.mode = val;
  isModeMenuOpen.value = false;
};
const toggleAtEndPointMenu = () => {
  isAtEndPointMenuOpen.value = !isAtEndPointMenuOpen.value;
  isModeMenuOpen.value = false;
  isMappingMenuOpen.value = false;
  isTrackMenuOpen.value = false;
};
const selectAtEndPoint = (val) => {
  options.atEndPoint = val;
  isAtEndPointMenuOpen.value = false;
};

function startCreateTrack() {
  isTrackMenuOpen.value = false;
  trackSearchQuery.value = selectedTrack.value ? selectedTrack.value.name : '';
  isCreatingTrack.value = true;
  newTrackName.value = '';
}

async function confirmCreateTrack() {
  if (newTrackNameError.value || isCreatingTrackLoading.value) return;
  isCreatingTrackLoading.value = true;
  try {
    const newTrack = await createTrack(props.directorEndpoint, newTrackName.value.trim());
    emit('track-created', newTrack);
    selectTrack(newTrack);
  } catch (err) {
    console.error('Failed to create track:', err);
  } finally {
    isCreatingTrackLoading.value = false;
  }
}

function cancelCreateTrack() {
  isCreatingTrack.value = false;
  newTrackName.value = '';
}

const handleClickOutside = (e) => {
  if (mappingRef.value && !mappingRef.value.contains(e.target)) {
    isMappingMenuOpen.value = false;
    mappingSearchQuery.value = selectedMapping.value ? selectedMapping.value.name : '';
  }
  if (trackRef.value && !trackRef.value.contains(e.target)) {
    isTrackMenuOpen.value = false;
    trackSearchQuery.value = selectedTrack.value ? selectedTrack.value.name : '';
  }
  if (modeRef.value && !modeRef.value.contains(e.target)) {
    isModeMenuOpen.value = false;
  }
  if (atEndPointRef.value && !atEndPointRef.value.contains(e.target)) {
    isAtEndPointMenuOpen.value = false;
  }
};

// --- Create ---

function handleCreate() {
  if (!isCreateLayersEnabled.value || props.isCreating) return;
  emit('create', {
    ...options,
    mappingPath: selectedMapping.value.path,
    targetTrack: options.insertMode === 'Specific location' ? selectedTrack.value?.path : null
  });
}

// --- Watchers & Lifecycle ---

watch(isCreatingTrack, async (val) => {
  if (val) {
    await nextTick();
    newTrackNameInput.value?.focus();
  }
});

onMounted(() => window.addEventListener('mousedown', handleClickOutside));
onUnmounted(() => window.removeEventListener('mousedown', handleClickOutside));
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.settings-sidebar {
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

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px 6px 20px;
}

.settings-header-title {
  font-weight: 700;
  color: #888;
  font-size: 14px;
  letter-spacing: 0.5px;
}

.mode-hint {
  font-size: 11px;
  color: #777777;
  line-height: 1.4;
  padding: 0 20px 12px 20px;
}

.segmented-control.compact { display: inline-flex; width: auto; }
.segmented-control.compact .segment { flex: none; padding: 5px 10px; }

.footer-summary {
  font-size: 11px;
  color: #888888;
  margin-bottom: 10px;
  line-height: 1.4;
}

.settings-sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Group cards */
.group-box {
  background: #242424;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #333333;
}

.group-header {
  font-size: 11px;
  color: #0a84ff;
  font-weight: 700;
  margin-bottom: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.control { margin-bottom: 14px; }
.control:last-child { margin-bottom: 0; }
.row { display: flex; gap: 12px; transition: opacity 0.3s ease; margin-bottom: 14px; }
.row:last-child { margin-bottom: 0; }
.row .control { flex: 1; margin-bottom: 0; }
.stacked-controls { transition: opacity 0.3s ease; margin-bottom: 14px; }
.stacked-controls .control { margin-bottom: 14px; }
.stacked-controls .control:last-child { margin-bottom: 0; }
.inline-row { display: flex; align-items: center; justify-content: space-between; }

.disabled { opacity: 0.3; pointer-events: none; }

label {
  display: block;
  font-size: 12px;
  color: #cccccc;
  margin-bottom: 6px;
  font-weight: 600;
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

.segment:hover:not(:disabled) { color: #ccc; }
.segment.active {
  background: #3a3a3a;
  color: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
.segment:disabled { opacity: 0.3; cursor: not-allowed; }

/* Inputs */
.standard-input {
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

.standard-input:focus {
  border-color: #0a84ff;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3);
}

.standard-input.invalid { border-color: #ef4444; }

.input-with-unit {
  position: relative;
  width: 80px;
  flex-shrink: 0;
  transition: opacity 0.3s ease;
}

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

.input-with-unit input:focus { border-color: #0a84ff; }

.unit {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: #777;
  pointer-events: none;
}

/* Custom Searchable Dropdown Styles */
.searchable-select {
  position: relative;
  width: 100%;
}

.dropdown-input {
  padding-right: 24px; /* Room for the arrow */
}

.dropdown-arrow {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 8px;
  color: #888;
  pointer-events: none;
}

.dropdown-trigger {
  width: 100%;
  background: #181818;
  border: 1px solid #3a3a3a;
  color: #eee;
  padding: 8px 24px 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  box-sizing: border-box;
  user-select: none;
}
.dropdown-trigger:hover { border-color: #555; }

.dropdown-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 100%;
  background: #1e1e1e;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  z-index: 100;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow: hidden;
}

/* Plain list dropdowns (e.g. mapping) scroll the whole list */
ul.dropdown-list {
  max-height: 150px;
  overflow-y: auto;
  padding: 4px 0;
}

/* Scrollable section inside structured dropdowns (e.g. track) */
.dropdown-list-scroll {
  max-height: 150px;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 4px 0 0;
}

.dropdown-list::-webkit-scrollbar,
.dropdown-list-scroll::-webkit-scrollbar { width: 6px; }
.dropdown-list::-webkit-scrollbar-track,
.dropdown-list-scroll::-webkit-scrollbar-track { background: #1e1e1e; }
.dropdown-list::-webkit-scrollbar-thumb,
.dropdown-list-scroll::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }

.dropdown-item {
  padding: 8px 12px;
  font-size: 12px;
  color: #eee;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover { background: #3a3a3a; }
.dropdown-item.selected {
  background: rgba(59, 130, 246, 0.2);
  color: #0a84ff;
  font-weight: 600;
}

.dropdown-empty {
  padding: 8px 12px;
  font-size: 12px;
  color: #777;
  text-align: center;
}

/* Toggles (iOS style) */
.toggle-list { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
.ios-toggle { display: flex; align-items: center; gap: 10px; cursor: pointer; margin: 0; text-transform: none; }
.ios-toggle.space-between { justify-content: space-between; }
.label-text { font-size: 12px; color: #aaaaaa; font-weight: 500; text-transform: none; }
.label-text-secondary { font-size: 11px; color: #777777; font-weight: 500; }

.switch { position: relative; display: inline-block; width: 36px; height: 20px; flex-shrink: 0; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #3a3a3a; transition: .3s; border-radius: 34px; }
.slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: #888; transition: .3s; border-radius: 50%; }
input:checked + .slider { background-color: #0a84ff; }
input:checked + .slider:before { transform: translateX(16px); background-color: white; }

.toggle-group { display: flex; flex-direction: column; gap: 8px; }
.toggle-input-wrapper { margin-left: 2px; transition: opacity 0.3s ease; }

.timecode-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}
.timecode-grid .label-text-secondary { display: block; margin-bottom: 4px; }

/* Footer */
.settings-footer {
  padding: 20px;
  background: #1e1e1e;
  border-top: 1px solid #36373a;
}
.create-btn {
  width: 100%;
  padding: 12px;
  background: #0a84ff;
  border: none;
  color: #ffffff;
  font-weight: 700;
  font-size: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}
.create-btn:hover:not(:disabled) { background: #0060d1; }
.create-btn:disabled { background: #3a3a3a; color: #777; cursor: not-allowed; }

/* Create New Track — dropdown entry */
.dropdown-create-item {
  padding: 8px 12px;
  font-size: 12px;
  color: #0a84ff;
  cursor: pointer;
  border-top: 1px solid #2e2e2e;
  background: #1e1e1e;
  transition: background 0.2s;
}
.dropdown-create-item:hover { background: rgba(10, 132, 255, 0.15); }

/* Create New Track — full-width panel */
.create-track-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #1a1a1a;
  border: 1px solid #0a84ff44;
  border-radius: 6px;
  margin-top: 4px;
  margin-bottom: 14px;
}

.create-track-error {
  font-size: 11px;
  color: #ef4444;
  padding: 0 2px;
}

.create-track-actions {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.create-track-cancel-btn,
.create-track-confirm-btn {
  flex: 1;
  border: none;
  border-radius: 6px;
  padding: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.create-track-cancel-btn {
  background: #2a2a2a;
  color: #aaa;
}
.create-track-cancel-btn:hover { background: #333; color: #fff; }

.create-track-confirm-btn {
  background: #0a84ff;
  color: #fff;
}
.create-track-confirm-btn:hover:not(:disabled) { background: #0060d1; }
.create-track-confirm-btn:disabled { background: #2e2e2e; color: #555; cursor: not-allowed; }
</style>
