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
      {{ isAdvanced ? 'Groups of files, each with its own settings.' : 'One mapping, layers one after another.' }}
    </div>

    <div class="settings-sidebar-content">

      <!-- MAPPINGS -->
      <SettingsSection id="mappings" title="Mappings" :summary="mappingsSummary">
        <template #icon>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 10h18M9 4v14"/></svg>
        </template>
        <!-- Advanced: per-layer mappings panel -->
        <slot v-if="isAdvanced" name="mappings"></slot>
        <div v-else class="kv">
          <span class="kv-lbl">Mapping</span>
          <div class="searchable-select" ref="mappingRef">
            <input
              type="text"
              v-model="mappingSearchQuery"
              @focus="toggleMappingMenu(true)"
              :placeholder="selectedMapping ? selectedMapping.name : 'Search Mapping...'"
              class="standard-input dropdown-input"
              aria-label="Mapping"
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
      </SettingsSection>

      <!-- WHERE (insert location) -->
      <SettingsSection id="where" title="Where" :summary="whereSummary" :error="whereError">
        <template #icon>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M5 8l-3 4 3 4M19 8l3 4-3 4"/></svg>
        </template>
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

        <div class="kv kv-gap" :class="{ disabled: !isSpecific }">
          <span class="kv-lbl">Track</span>
          <div class="searchable-select" ref="trackRef">
            <input
              type="text"
              v-model="trackSearchQuery"
              @focus="toggleTrackMenu(true)"
              :placeholder="selectedTrack ? selectedTrack.name : 'Search Track...'"
              class="standard-input dropdown-input"
              :class="{ invalid: isSpecific && !selectedTrack && !isTrackMenuOpen }"
              aria-label="Track"
              :disabled="!isSpecific"
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

          <div v-if="isCreatingTrack" class="create-track-panel kv-full" @click.stop>
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

          <span class="kv-lbl">Time</span>
          <input
            type="text"
            v-model="options.startTime"
            class="standard-input tc-input"
            placeholder="00:00:00:00"
            aria-label="Start time"
            :class="{ invalid: isSpecific && !isStartTimeValid }"
            :disabled="!isSpecific"
          />
        </div>
      </SettingsSection>

      <!-- LAYERS (what each layer gets) -->
      <SettingsSection id="layers" title="Layers" :summary="layersSummary">
        <template #icon>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></svg>
        </template>
        <div v-if="isAdvanced" class="adv-note">
          <span>Set in Plan defaults and group chips.</span>
          <button type="button" class="link-btn" @click="$emit('open-plan-defaults')">Open Plan defaults</button>
        </div>
        <div v-else class="kv">
          <span class="kv-lbl">Mode</span>
          <div class="searchable-select" ref="modeRef">
            <div class="dropdown-trigger" @click="toggleModeMenu">{{ options.mode }}</div>
            <span class="dropdown-arrow">▼</span>
            <ul v-if="isModeMenuOpen" class="dropdown-list">
              <li class="dropdown-item" :class="{ selected: options.mode === 'Normal' }" @click="selectMode('Normal')">Normal</li>
              <li class="dropdown-item" :class="{ selected: options.mode === 'Locked' }" @click="selectMode('Locked')">Locked</li>
            </ul>
          </div>

          <span class="kv-lbl">At end</span>
          <div class="searchable-select" ref="atEndPointRef">
            <div class="dropdown-trigger" @click="toggleAtEndPointMenu">{{ options.atEndPoint }}</div>
            <span class="dropdown-arrow">▼</span>
            <ul v-if="isAtEndPointMenuOpen" class="dropdown-list">
              <li class="dropdown-item" :class="{ selected: options.atEndPoint === 'Loop' }" @click="selectAtEndPoint('Loop')">Loop</li>
              <li class="dropdown-item" :class="{ selected: options.atEndPoint === 'Ping-Pong' }" @click="selectAtEndPoint('Ping-Pong')">Ping-Pong</li>
              <li class="dropdown-item" :class="{ selected: options.atEndPoint === 'Pause' }" @click="selectAtEndPoint('Pause')">Pause</li>
            </ul>
          </div>

          <span class="kv-lbl">Fade in <InfoTip text="Animate brightness from 0 to full at the layer start" /></span>
          <label class="switch kv-end">
            <input type="checkbox" v-model="options.animateBrightness" aria-label="Animate brightness">
            <span class="slider"></span>
          </label>
          <span class="kv-lbl sub" :class="{ disabled: !options.animateBrightness }">Duration</span>
          <NumStepper class="kv-end" :class="{ disabled: !options.animateBrightness }" :model-value="Number(options.brightnessDuration) || 0" label="Fade duration" :disabled="!options.animateBrightness" @update:model-value="v => options.brightnessDuration = v" />

          <span class="kv-lbl">Fit to contents <InfoTip text="Videos get their own length; off = every video gets the fixed duration" /></span>
          <label class="switch kv-end">
            <input type="checkbox" v-model="options.fitToContent" aria-label="Fit to contents">
            <span class="slider"></span>
          </label>
          <span class="kv-lbl sub" :class="{ disabled: options.fitToContent }">Movie</span>
          <NumStepper class="kv-end" :class="{ disabled: options.fitToContent }" :model-value="Number(options.movieDuration) || 0" label="Movie duration" :disabled="options.fitToContent" @update:model-value="v => options.movieDuration = v" />

          <span class="kv-lbl">Still images</span>
          <NumStepper class="kv-end" :model-value="Number(options.stillDuration) || 0" label="Still image duration" @update:model-value="v => options.stillDuration = v" />

          <span class="kv-lbl">Overlap <InfoTip text="Each layer starts this long before the previous one ends" /></span>
          <NumStepper class="kv-end" :model-value="Number(options.overlap) || 0" label="Overlap" @update:model-value="v => options.overlap = v" />
        </div>
      </SettingsSection>

      <!-- TIMELINE MARKERS (split + tags) -->
      <SettingsSection
        ref="markersSection"
        id="markers"
        title="Timeline markers"
        :summary="markersSummary"
        :pill="markersOn ? `${markersOn} on` : 'Off'"
        :pill-on="markersOn > 0"
        :error="markersError"
      >
        <template #icon>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4h11l-2 4 2 4H5"/></svg>
        </template>
        <div class="markers">
          <div class="mk-row">
            <span class="kv-lbl">Split section <InfoTip :text="isAdvanced ? 'Section splits; placement (each file or group start) is set per group' : 'A section split at every layer start and one after the last layer'" /></span>
            <label class="switch">
              <input type="checkbox" v-model="options.splitSection" aria-label="Split section">
              <span class="slider"></span>
            </label>
          </div>

          <!-- Sections and tags are different markers: the tag rows read as their own block -->
          <div class="mk-divider" role="separator"></div>

          <div class="mk-row">
            <span class="kv-lbl">Timecode tag <InfoTip :text="isAdvanced ? 'A TC tag at each placement; numbering continues across the plan' : 'A TC tag at every layer start: start time + increment per layer'" /></span>
            <label class="switch">
              <input type="checkbox" v-model="options.addTimecodeTag" aria-label="Add timecode tag">
              <span class="slider"></span>
            </label>
          </div>
          <div v-if="options.addTimecodeTag" class="timecode-grid">
            <div>
              <span class="label-text-secondary">Start</span>
              <input
                type="text"
                v-model="options.timecodeStart"
                class="standard-input tc-input"
                placeholder="00:00:00:00"
                aria-label="Timecode start"
                :class="{ invalid: !isTimecodeStartValid && options.timecodeStart !== '' }"
              />
            </div>
            <div>
              <span class="label-text-secondary">Increment</span>
              <input
                type="text"
                v-model="options.timecodeIncrement"
                class="standard-input tc-input"
                placeholder="00:00:00:00"
                aria-label="Timecode increment"
                :class="{ invalid: !isTimecodeIncrementValid && options.timecodeIncrement !== '' }"
              />
            </div>
          </div>

          <div class="mk-row">
            <span class="kv-lbl">Cue tag <InfoTip text="Cue number of the first tag; the last part goes up by one per tag" /></span>
            <label class="switch">
              <input type="checkbox" v-model="options.addCueTag" aria-label="Add cue tag">
              <span class="slider"></span>
            </label>
          </div>
          <input
            v-if="options.addCueTag"
            type="text"
            v-model="options.cueValue"
            class="standard-input"
            placeholder="e.g. 1.2.3"
            aria-label="Cue value"
            :class="{ invalid: !isCueValid && options.cueValue !== '' }"
            @input="handleCueTagInput"
            @blur="handleCueTagBlur"
          />

          <div class="mk-row">
            <span class="kv-lbl">MIDI tag <InfoTip text="MIDI note of the first tag; the last part goes up by one per tag" /></span>
            <label class="switch">
              <input type="checkbox" v-model="options.addMidiNote" aria-label="Add MIDI tag">
              <span class="slider"></span>
            </label>
          </div>
          <input
            v-if="options.addMidiNote"
            type="text"
            v-model="options.midiNoteValue"
            class="standard-input"
            placeholder="e.g. 9.1"
            aria-label="MIDI note value"
            :class="{ invalid: !isMidiNoteValid && options.midiNoteValue !== '' }"
            @input="handleMidiNoteInput"
          />

          <!-- Advanced: what the plan layout will place -->
          <div v-if="isAdvanced" class="mk-preview">
            <div class="mk-will">{{ markersPreview }}</div>
            <div class="mk-hint">
              Placement is set per group.
              <button type="button" class="link-btn" @click="$emit('open-plan-defaults')">Plan defaults</button>
            </div>
          </div>
        </div>
      </SettingsSection>
    </div>

    <div class="settings-footer">
      <div v-if="summary" class="footer-summary">{{ summary }}</div>
      <div v-if="confirmCreateAsk" class="confirm-strip" role="alert">
        <span v-if="missingCount">{{ missingCount }} {{ missingCount === 1 ? 'clip is' : 'clips are' }} missing from the project and will be skipped.</span>
        <span v-if="unmappedCount">{{ unmappedCount }} {{ unmappedCount === 1 ? 'layer has' : 'layers have' }} no mapping and will be created without one.</span>
        <div class="confirm-actions">
          <button type="button" class="create-track-cancel-btn" @click="confirmCreateAsk = false">Cancel</button>
          <button type="button" class="create-track-confirm-btn" @click="confirmCreate">Create anyway</button>
        </div>
      </div>
      <button v-if="!confirmCreateAsk"
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
import { describeMarkers } from '../../utils/planLayout';
import { maskCueValue, isCueValueValid, maskMidiValue, isMidiValueValid } from '../../utils/tagInputs';
import SettingsSection from './SettingsSection.vue';
import NumStepper from '../plan/NumStepper.vue';
import InfoTip from '../common/InfoTip.vue';

const props = defineProps({
  directorEndpoint: { type: String, required: true },
  mappings: { type: Array, required: true },
  tracks: { type: Array, required: true },
  // reactive object from useLayerOptions(); fields are edited in place
  options: { type: Object, required: true },
  // layers the Create button would make: selected files (Simple) or plan entries (Advanced)
  layerCount: { type: Number, default: 0 },
  summary: { type: String, default: '' },
  // Advanced: plan layers without a mapping (docs §11 Q1: warn, confirm, create with mapping cleared)
  unmappedCount: { type: Number, default: 0 },
  // Advanced: plan rows whose clip is gone from the project; Create skips them after a confirm (docs §6.3)
  missingCount: { type: Number, default: 0 },
  // Advanced: distinct mappings used in the plan
  mappingsUsed: { type: Number, default: 0 },
  // countMarkers() of what Create would place (Advanced preview)
  markers: { type: Object, default: null },
  isCreating: { type: Boolean, default: false },
  createProgress: { type: Object, default: null } // { created, total }
});
const emit = defineEmits(['create', 'track-created', 'open-plan-defaults', 'error']);
const creationMode = defineModel('creationMode', { type: String, default: 'simple' });
const options = props.options;
const isAdvanced = computed(() => creationMode.value === 'advanced');
const isSpecific = computed(() => options.insertMode === 'Specific location');


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
const markersSection = ref(null);

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
  // The name goes into a Python string literal in createTrack()
  if (/["\\]/.test(name)) return 'Name cannot contain " or \\';
  if (props.tracks.some(t => t.name.toLowerCase() === name.toLowerCase())) return 'Name already exists';
  return null;
});

const validCue = computed(() => isCueValid.value && (options.addCueTag ? options.cueValue !== '' : true));
const validMidi = computed(() => isMidiNoteValid.value && (options.addMidiNote ? options.midiNoteValue !== '' : true));
const validTimecode = computed(() => isTimecodeStartValid.value && isTimecodeIncrementValid.value);
const validLocation = computed(() => options.insertMode === 'At Playhead' || (!!selectedTrack.value && isStartTimeValid.value));

const isCreateLayersEnabled = computed(() => {
  const hasSelection = props.layerCount > 0;
  // Advanced assigns mappings per layer in the plan
  const hasMapping = isAdvanced.value || !!selectedMapping.value;
  return hasSelection && hasMapping && validCue.value && validMidi.value && validTimecode.value && validLocation.value;
});

const createLabel = computed(() => {
  if (!props.isCreating) return props.layerCount > 0 ? `CREATE ${props.layerCount} LAYERS` : 'CREATE LAYERS';
  const p = props.createProgress;
  return p && p.total > 0 ? `CREATING... ${p.created}/${p.total}` : 'CREATING...';
});

// --- Section summaries, pills and error dots (docs §2.5.1) ---

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const sec = v => `${Number(v) || 0}s`;

const mappingsSummary = computed(() => {
  if (!isAdvanced.value) return selectedMapping.value ? selectedMapping.value.name : 'None selected';
  const parts = [`${props.mappingsUsed} used`];
  if (props.unmappedCount) parts.push(`${plural(props.unmappedCount, 'layer', 'layers')} without mapping`);
  return parts.join(', ');
});

const whereSummary = computed(() => {
  if (!isSpecific.value) return 'At playhead';
  return `${selectedTrack.value ? selectedTrack.value.name : 'no track'}, ${options.startTime || 'no time'}`;
});
const whereError = computed(() => !validLocation.value);

const layersSummary = computed(() => {
  if (isAdvanced.value) return 'Per group';
  return [
    options.mode,
    options.atEndPoint,
    options.animateBrightness ? `fade ${sec(options.brightnessDuration)}` : null,
    options.fitToContent ? 'fit' : `movie ${sec(options.movieDuration)}`,
    `still ${sec(options.stillDuration)}`,
    Number(options.overlap) ? `overlap ${sec(options.overlap)}` : null
  ].filter(Boolean).join(', ');
});

const markersOn = computed(() => [options.splitSection, options.addTimecodeTag, options.addCueTag, options.addMidiNote].filter(Boolean).length);
const markersSummary = computed(() => {
  const tags = [
    options.addTimecodeTag ? `TC ${options.timecodeStart}` : null,
    options.addCueTag ? `Cue ${options.cueValue || '?'}` : null,
    options.addMidiNote ? `MIDI ${options.midiNoteValue || '?'}` : null
  ].filter(Boolean);
  const parts = [options.splitSection ? 'Split on' : null, tags.length ? tags.join(' + ') : null].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Off';
});
const markersError = computed(() => !validCue.value || !validMidi.value || !validTimecode.value);
const markersPreview = computed(() => {
  const parts = props.markers ? describeMarkers(props.markers) : [];
  if (!parts.length) return 'No markers will be placed';
  const last = parts.pop();
  return `Will place ${parts.length ? `${parts.join(', ')} and ${last}` : last}`;
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
    emit('error', `Failed to create track: ${err.message}`);
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

// Advanced: Create asks first when layers have no mapping or clips are missing
const confirmCreateAsk = ref(false);
watch([() => props.unmappedCount, () => props.missingCount, creationMode], () => { confirmCreateAsk.value = false; });

function handleCreate() {
  if (!isCreateLayersEnabled.value || props.isCreating) return;
  if (isAdvanced.value && (props.unmappedCount > 0 || props.missingCount > 0)) {
    confirmCreateAsk.value = true;
    return;
  }
  emitCreate();
}

function confirmCreate() {
  confirmCreateAsk.value = false;
  emitCreate();
}

function emitCreate() {
  emit('create', {
    ...options,
    mappingPath: creationMode.value === 'simple' ? selectedMapping.value?.path : null,
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

/** Opens and highlights a section (the Tags "Off" pill in a plan chip popover). */
function revealSection(id) {
  if (id === 'markers') markersSection.value?.reveal();
}

defineExpose({ revealSection });
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.settings-sidebar {
  width: 320px;
  min-width: 260px;
  background: #1e1e1e;
  color: #dddddd;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #36373a;
  height: 100%;
  flex-shrink: 1;
  box-shadow: -5px 0 20px rgba(0,0,0,0.3);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 16px 6px 16px;
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
  padding: 0 16px 12px 16px;
}

.segmented-control.compact { display: inline-flex; width: auto; }
.segmented-control.compact .segment { flex: none; padding: 5px 10px; }

.confirm-strip {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #ef4444;
  border-radius: 6px;
  background: #1a1a1a;
  font-size: 12px;
  color: #dddddd;
  line-height: 1.4;
}
.confirm-actions { display: flex; gap: 8px; }

.footer-summary {
  font-size: 11px;
  color: #888888;
  margin-bottom: 10px;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
}
/* Timecodes, durations and counts: equal-width digits, so values line up and don't jitter */
.tc-input { font-variant-numeric: tabular-nums; }

.settings-sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* One label / value grid per section: label on the left, control on the right */
.kv {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  column-gap: 12px;
  row-gap: 8px;
}
.kv-gap { margin-top: 10px; }
.kv-full { grid-column: 1 / -1; }
.kv-end { justify-self: end; }
.kv-lbl {
  font-size: 12px;
  color: #cccccc;
  font-weight: 600;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.kv-lbl.sub { font-weight: 500; color: #888888; padding-left: 10px; }

.disabled { opacity: 0.3; pointer-events: none; }
.kv-lbl.disabled, .kv-end.disabled { opacity: 0.4; }

label {
  display: block;
  font-size: 12px;
  color: #cccccc;
  margin-bottom: 6px;
  font-weight: 600;
}

.adv-note { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; font-size: 11px; color: #888888; }
.link-btn {
  border: 1px solid #3a3a3a; background: transparent; color: #cccccc;
  border-radius: 6px; padding: 5px 10px; font-size: 11px; font-weight: 600; cursor: pointer;
  transition: all 0.2s ease;
}
.link-btn:hover { border-color: #555555; background: #2a2a2a; color: #ffffff; }
.link-btn:focus-visible { outline: none; box-shadow: 0 0 0 2px #0a84ff; }

/* Timeline markers */
.markers { display: flex; flex-direction: column; gap: 8px; }
.mk-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 22px; }
.mk-divider { height: 1px; margin: 4px 0; background: #2e2e2e; }
.mk-preview { margin-top: 4px; padding-top: 10px; border-top: 1px solid #2e2e2e; display: flex; flex-direction: column; gap: 6px; }
.mk-will { font-size: 12px; color: #dddddd; }
.mk-hint { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 8px; font-size: 11px; color: #888888; }
.mk-hint .link-btn { padding: 3px 8px; }

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
  white-space: nowrap;
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

/* Custom Searchable Dropdown Styles */
.searchable-select {
  position: relative;
  width: 100%;
  min-width: 0;
}

.dropdown-input {
  padding-right: 24px; /* Room for the arrow */
  text-overflow: ellipsis;
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

.label-text-secondary { font-size: 11px; color: #777777; font-weight: 500; }

.switch { position: relative; display: inline-block; width: 36px; height: 20px; flex-shrink: 0; margin: 0; cursor: pointer; }
.switch input { opacity: 0; width: 0; height: 0; position: absolute; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #3a3a3a; transition: .3s; border-radius: 34px; }
.slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: #888; transition: .3s; border-radius: 50%; }
input:checked + .slider { background-color: #0a84ff; }
input:checked + .slider:before { transform: translateX(16px); background-color: white; }
.switch input:focus-visible + .slider { box-shadow: 0 0 0 2px rgba(10, 132, 255, 0.5); }

.timecode-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.timecode-grid .label-text-secondary { display: block; margin-bottom: 4px; }

/* Footer */
.settings-footer {
  padding: 16px;
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
  font-variant-numeric: tabular-nums;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}
.create-btn:hover:not(:disabled) { background: #0060d1; }
.create-btn:disabled { background: #3a3a3a; color: #777; cursor: not-allowed; }

/* Create New Track -dropdown entry */
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

/* Create New Track -full-width panel */
.create-track-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #1a1a1a;
  border: 1px solid #0a84ff44;
  border-radius: 6px;
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
