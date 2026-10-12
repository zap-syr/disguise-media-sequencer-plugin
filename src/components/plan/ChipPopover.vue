<template>
  <!-- Floats over the plan (teleported, fixed position), so nothing below moves -->
  <Teleport to="body">
    <div
      ref="popEl"
      class="chip-pop"
      :class="{ above: pos.above }"
      :style="{
        top: pos.top == null ? 'auto' : pos.top + 'px',
        bottom: pos.bottom == null ? 'auto' : pos.bottom + 'px',
        left: pos.left + 'px',
        '--arrow-x': pos.arrow + 'px'
      }"
      role="dialog"
      :aria-label="`${chip.title}, ${tag}`"
    >
      <div class="cp-head">
        <span class="cp-title">{{ chip.title }}</span>
        <span class="cp-tag">{{ tag }}</span>
        <span class="cp-fill"></span>
        <!-- Split: the global Split section switch sits where the placement is chosen -->
        <label v-if="chipKey === 'split'" class="cp-switch" :title="`Split section is ${globals.splitOn ? 'on' : 'off'} for the whole plan`">
          <span class="cp-state">{{ globals.splitOn ? 'On' : 'Off' }}</span>
          <span class="switch">
            <input type="checkbox" :checked="globals.splitOn" aria-label="Split section, whole plan" @change="markers?.setSplit($event.target.checked)" />
            <span class="slider"></span>
          </span>
        </label>
        <button v-else-if="chipKey === 'tags' && !globals.tagsOn" type="button" class="cp-off" title="All tags are off for the whole plan. Open Timeline markers in the settings panel." @click="openMarkers">Tags off</button>
        <button type="button" class="cp-x" aria-label="Close" title="Close (Esc)" @click="$emit('close')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="cp-body">
        <SettingEditor :chip-key="chipKey" :values="values" :mixed="mixed" :dim="dim" @patch="p => $emit('patch', p)" />
        <div v-if="layerNote" class="cp-note">
          <span>{{ layerNote }} {{ layerNote === 1 ? 'layer sets' : 'layers set' }} its own value</span>
          <button type="button" class="quiet" @click="$emit('reset-layers')">Reset</button>
        </div>
      </div>

      <div class="cp-foot">
        <button type="button" class="quiet" :disabled="!reset.enabled" :title="reset.tip" @click="$emit('reset')">Reset</button>
        <button type="button" class="secondary" :disabled="secondary.disabled" :title="secondary.tip" @click="$emit('secondary')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path v-if="secondary.icon === 'clear'" d="M20 20H9L4 15l10-10 7 7-6 6M9 10l6 6"/><path v-else d="M12 19V5M5 12l7-7 7 7"/></svg>
          {{ secondary.label }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, inject, ref, watch, nextTick } from 'vue';
import { CHIPS } from '../../utils/planSchema';
import { useAnchoredPopover } from '../../composables/useAnchoredPopover';
import SettingEditor from './SettingEditor.vue';

/**
 * One compact popover for every setting chip (docs §2.5.1): header (title, level tag, ×),
 * option list with nested steppers, footer with Reset and the "move up" action.
 * The owner decides what Reset / the secondary button do at its level.
 */
const props = defineProps({
  anchor: { type: Object, default: null },               // element the popover points at
  keepOpenOn: { type: Object, default: null },           // clicks inside it don't close (the chip row)
  chipKey: { type: String, required: true },
  values: { type: Object, required: true },
  mixed: { type: Set, default: () => new Set() },
  globals: { type: Object, default: () => ({ tagsOn: true, splitOn: true }) },
  tag: { type: String, required: true },                 // "G1" | "2 layers" | "All groups"
  reset: { type: Object, default: () => ({ enabled: false, tip: '' }) },
  secondary: { type: Object, required: true },           // { label, disabled, tip, icon: 'up' | 'clear' }
  layerNote: { type: Number, default: 0 }                // group level: layers that override this setting
});
const emit = defineEmits(['patch', 'reset', 'secondary', 'reset-layers', 'close']);

// MediaSequencer: { setSplit(on), openMarkers() } for the global marker switches
const markers = inject('markerControls', null);

const chip = computed(() => CHIPS.find(c => c.key === props.chipKey));
const dim = computed(() => (props.chipKey === 'split' && !props.globals.splitOn) || (props.chipKey === 'tags' && !props.globals.tagsOn));

function openMarkers() {
  emit('close');
  markers?.openMarkers();
}

// --- Placement: below the anchor, flipped above when there is no room, kept on screen ---
const popEl = ref(null);
const { pos, place, resetSide } = useAnchoredPopover({
  anchor: () => props.anchor,
  keepOpenOn: () => props.keepOpenOn,
  popEl,
  onClose: () => emit('close'),
  grow: 40,   // room for a nested number row, so picking an option never makes the popover flip
  ignoreOutside: '.chip-overflow',
  // A focused stepper takes the first Esc
  keepEsc: event => !!(event.target.closest?.('.stp') && popEl.value?.contains(event.target))
});

// Another chip or anchor: choose the side again
watch(() => [props.anchor, props.chipKey], resetSide);
// Content (option with a nested number, notes) changes the size, not the side
watch(() => [props.values, props.mixed, props.layerNote, props.globals], () => nextTick(place), { deep: true });
</script>

<style scoped>
* { box-sizing: border-box; }

.chip-pop {
  position: fixed; z-index: 1000;
  width: 268px; max-width: calc(100vw - 16px);
  display: flex; flex-direction: column; max-height: calc(100vh - 16px);
  border: 1px solid #3a3a3a; border-radius: 6px; background: #1e1e1e;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
  font-family: inherit; color: #d4d4d4;
}
/* Small notch pointing at the chip */
.chip-pop::before {
  content: ''; position: absolute; left: var(--arrow-x); top: -5px;
  width: 8px; height: 8px; background: #1e1e1e;
  border-left: 1px solid #3a3a3a; border-top: 1px solid #3a3a3a;
  transform: translateX(-50%) rotate(45deg);
}
.chip-pop.above::before { top: auto; bottom: -5px; background: #1a1a1a; transform: translateX(-50%) rotate(225deg); }

.cp-head { flex-shrink: 0; display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 6px 0 12px; border-bottom: 1px solid #2e2e2e; }
.cp-title { font-size: 12px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.cp-tag {
  flex-shrink: 0; height: 18px; padding: 0 6px; border-radius: 4px;
  display: inline-flex; align-items: center;
  background: rgba(10, 132, 255, 0.2); color: #0a84ff; font-size: 10px; font-weight: 700; white-space: nowrap;
}
.cp-fill { flex: 1; }
.cp-x {
  width: 24px; height: 24px; flex-shrink: 0; border: none; border-radius: 4px;
  background: transparent; color: #9c9c9c; cursor: pointer; padding: 0;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;
}
.cp-x:hover { background: #2c2c2c; color: #ffffff; }
.cp-x:focus-visible { outline: none; box-shadow: 0 0 0 2px #0a84ff; }

.cp-switch { display: flex; align-items: center; gap: 6px; margin: 0; cursor: pointer; }
.cp-state { font-size: 11px; color: #aeaeae; font-weight: 600; }
.switch { position: relative; display: inline-block; width: 28px; height: 16px; flex-shrink: 0; }
.switch input { opacity: 0; width: 0; height: 0; position: absolute; }
.slider { position: absolute; inset: 0; background: #3a3a3a; border-radius: 8px; transition: 0.2s; cursor: pointer; }
.slider::before { content: ''; position: absolute; width: 12px; height: 12px; left: 2px; top: 2px; border-radius: 50%; background: #888888; transition: 0.2s; }
.switch input:checked + .slider { background: #0a84ff; }
.switch input:checked + .slider::before { transform: translateX(12px); background: #ffffff; }
.switch input:focus-visible + .slider { box-shadow: 0 0 0 2px rgba(10, 132, 255, 0.5); }

.cp-off {
  height: 20px; padding: 0 8px; border-radius: 10px; flex-shrink: 0;
  border: 1px solid #3a3a3a; background: #242424; color: #aeaeae;
  font-size: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s ease;
}
.cp-off:hover { border-color: #6a6a6a; background: #2c2c2c; color: #ffffff; }

/* Only the body scrolls (a very short window), so the notch outside the box is never clipped */
.cp-body { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 10px; min-height: 0; overflow-y: auto; }
.cp-note { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; color: #9c9c9c; }

.cp-foot {
  flex-shrink: 0; border-radius: 0 0 6px 6px;
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 8px 12px; background: #1a1a1a; border-top: 1px solid #2e2e2e;
}
.quiet, .secondary {
  height: 26px; padding: 0 10px; border-radius: 6px;
  font: inherit; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap;
  display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s ease;
}
.quiet { border: 1px solid transparent; background: transparent; color: #aeaeae; }
.quiet:hover:not(:disabled) { border-color: #6a6a6a; background: #2c2c2c; color: #ffffff; }
.secondary { border: 1px solid #3a3a3a; background: #242424; color: #f2f2f2; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.secondary:hover:not(:disabled) { border-color: #6a6a6a; background: #2c2c2c; color: #ffffff; }
.quiet:disabled, .secondary:disabled { opacity: 0.4; cursor: not-allowed; }
.quiet:focus-visible, .secondary:focus-visible { outline: none; box-shadow: 0 0 0 2px #0a84ff; }
</style>
