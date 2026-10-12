<template>
  <div class="editor" :class="{ dim }">
    <div class="opts" role="radiogroup" :aria-label="chip.title" @keydown="onArrows">
      <div v-for="(opt, i) in spec.options" :key="String(opt.value)" class="opt-wrap">
        <button
          :ref="el => { optEls[i] = el; }"
          type="button"
          role="radio"
          class="opt"
          :class="{ on: isOn(opt.value) }"
          :aria-checked="isOn(opt.value)"
          :tabindex="i === focusIndex ? 0 : -1"
          @click="emitPatch(spec.key, opt.value)"
        >
          <span class="radio" aria-hidden="true"></span>
          <span class="opt-label">{{ opt.label }}</span>
          <span v-if="opt.hint" class="opt-hint">{{ opt.hint }}</span>
        </button>
        <!-- A number belongs to its option: shown inside the selected option only -->
        <div v-if="opt.number && isOn(opt.value)" class="nested">
          <span class="nested-lbl">{{ opt.number.label }}</span>
          <NumStepper
            :model-value="numValue(opt.number.key)"
            :label="opt.number.label"
            @update:model-value="v => emitPatch(opt.number.key, v)"
          />
        </div>
      </div>
    </div>
    <!-- A value that always applies gets its own subsection -->
    <div v-for="sub in spec.always || []" :key="sub.key" class="sub">
      <div class="sub-title">{{ sub.title }}</div>
      <div class="sub-row">
        <span class="nested-lbl">{{ sub.label }}</span>
        <NumStepper :model-value="numValue(sub.key)" :label="`${sub.title} ${sub.label}`" @update:model-value="v => emitPatch(sub.key, v)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { CHIPS, sameValue } from '../../utils/planSchema';
import NumStepper from './NumStepper.vue';

const props = defineProps({
  chipKey: { type: String, required: true },
  values: { type: Object, required: true },               // effective values (any of the keys may be mixed)
  mixed: { type: Set, default: () => new Set() },         // keys whose value differs across the selection
  dim: { type: Boolean, default: false }                  // the global switch for this setting is off
});
const emit = defineEmits(['patch']);

const chip = computed(() => CHIPS.find(c => c.key === props.chipKey));

const SPECS = {
  start: {
    key: 'timing',
    options: [
      { value: 'seq', label: 'In order', number: { key: 'overlap', label: 'Overlap' } },
      { value: 'same', label: 'All at once' }
    ]
  },
  tags: { key: 'tag', options: [{ value: 'file', label: 'Each file' }, { value: 'group', label: 'Group start' }] },
  split: { key: 'split', options: [{ value: 'file', label: 'Each file', hint: '+ end' }, { value: 'group', label: 'Group start' }] },
  mode: { key: 'mode', options: [{ value: 'Normal', label: 'Normal' }, { value: 'Locked', label: 'Locked' }] },
  end: { key: 'end', options: [{ value: 'Loop', label: 'Loop' }, { value: 'Ping-Pong', label: 'Ping-Pong' }, { value: 'Pause', label: 'Pause' }] },
  fade: {
    key: 'bright',
    options: [{ value: false, label: 'Off' }, { value: true, label: 'Fade in', number: { key: 'brightT', label: 'Duration' } }]
  },
  length: {
    key: 'fit',
    options: [
      { value: true, label: 'Fit to contents' },
      { value: false, label: 'Fixed length', number: { key: 'movieDur', label: 'Duration' } }
    ],
    always: [{ key: 'stillDur', title: 'Still images', label: 'Duration' }]
  }
};

const spec = computed(() => SPECS[props.chipKey]);
const isOn = value => !props.mixed.has(spec.value.key) && sameValue(spec.value.key, props.values[spec.value.key], value);
const numValue = key => (props.mixed.has(key) ? null : Number(props.values[key]) || 0);

// Roving tabindex: Tab enters the group on the selected option, arrows move and select
const optEls = [];
const focusIndex = computed(() => Math.max(0, spec.value.options.findIndex(o => isOn(o.value))));

function onArrows(event) {
  const dir = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
  if (!dir || !event.target.matches('.opt')) return;
  event.preventDefault();
  const opts = spec.value.options;
  const at = optEls.indexOf(event.target);
  const next = (at + dir + opts.length) % opts.length;
  emitPatch(spec.value.key, opts[next].value);
  optEls[next]?.focus();
}

function emitPatch(key, value) {
  emit('patch', { [key]: value });
}
</script>

<style scoped>
* { box-sizing: border-box; }

.editor { display: flex; flex-direction: column; gap: 10px; transition: opacity 0.2s ease; }
.editor.dim .opts, .editor.dim .sub { opacity: 0.45; }

.opts { border: 1px solid #333333; border-radius: 6px; background: #181818; overflow: hidden; }
.opt-wrap + .opt-wrap { border-top: 1px solid #262626; }
.opt-wrap:has(.opt.on) { background: rgba(10, 132, 255, 0.08); }

.opt {
  width: 100%; height: 36px; padding: 0 10px;
  display: flex; align-items: center; gap: 10px;
  border: none; background: transparent; cursor: pointer; text-align: left;
  font: inherit; font-size: 12px; color: #d4d4d4;
  transition: background 0.15s ease, color 0.15s ease;
}
.opt:hover { background: #2c2c2c; color: #ffffff; }
.opt-wrap:has(.opt.on) .opt:hover { background: transparent; }
.opt:focus-visible { outline: none; box-shadow: inset 0 0 0 1px #0a84ff; }
.opt.on { color: #ffffff; font-weight: 600; }
.radio {
  width: 14px; height: 14px; flex-shrink: 0; border-radius: 50%;
  border: 1.5px solid #888888; background: transparent; transition: all 0.15s ease;
}
.opt:hover .radio { border-color: #cccccc; }
.opt.on .radio { border-color: #0a84ff; background: #0a84ff; box-shadow: inset 0 0 0 3px #181818; }
.opt-label { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.opt-hint { font-size: 11px; font-weight: 400; color: #9c9c9c; }

/* Number inside the selected option: indented to the option text, set off by a thin divider */
.nested {
  height: 36px; margin-left: 34px; padding-right: 10px;
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  border-top: 1px solid #262626;
}
.nested-lbl { font-size: 12px; color: #d4d4d4; }

.sub { display: flex; flex-direction: column; gap: 6px; }
.sub-title { font-size: 12px; font-weight: 600; color: #ffffff; }
.sub-row {
  height: 36px; padding: 0 10px;
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  border: 1px solid #333333; border-radius: 6px; background: #181818;
}
</style>
