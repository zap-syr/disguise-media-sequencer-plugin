<template>
  <div class="editor">
    <div class="seg" role="group" :aria-label="chip.title">
      <button
        v-for="opt in spec.options"
        :key="String(opt.value)"
        type="button"
        :class="{ on: isOn(spec.key, opt.value) }"
        :aria-pressed="isOn(spec.key, opt.value)"
        @click="emitPatch(spec.key, opt.value)"
      >{{ opt.label }}</button>
    </div>
    <label v-for="num in spec.numbers" :key="num.key" class="num" :class="{ disabled: num.disabled() }">
      <span class="num-lbl">{{ num.label }}</span>
      <span class="num-in">
        <input
          type="number"
          min="0"
          step="0.5"
          :value="mixed.has(num.key) ? '' : values[num.key]"
          :placeholder="mixed.has(num.key) ? 'Mixed' : ''"
          :disabled="num.disabled()"
          :aria-label="num.label"
          @change="emitPatch(num.key, $event.target.value)"
        />
        <span class="unit">s</span>
      </span>
    </label>
    <div v-if="note" class="note">{{ note }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { CHIPS, sameValue } from '../../utils/planSchema';

const props = defineProps({
  chipKey: { type: String, required: true },
  values: { type: Object, required: true },               // effective values (any of the keys may be mixed)
  mixed: { type: Set, default: () => new Set() },         // keys whose value differs across the selection
  globals: { type: Object, default: () => ({ tagsOn: true, splitOn: true }) }
});
const emit = defineEmits(['patch']);

const chip = computed(() => CHIPS.find(c => c.key === props.chipKey));
const known = key => !props.mixed.has(key);
const isOn = (key, value) => known(key) && sameValue(key, props.values[key], value);

const SPECS = {
  start: {
    key: 'timing',
    options: [{ value: 'seq', label: 'One after another' }, { value: 'same', label: 'All at once' }],
    numbers: [{ key: 'overlap', label: 'Overlap', disabled: () => known('timing') && props.values.timing === 'same' }]
  },
  tags: { key: 'tag', options: [{ value: 'file', label: 'Each file' }, { value: 'group', label: 'Group start' }], numbers: [] },
  split: { key: 'split', options: [{ value: 'file', label: 'Each file' }, { value: 'group', label: 'Group start' }], numbers: [] },
  mode: { key: 'mode', options: [{ value: 'Normal', label: 'Normal' }, { value: 'Locked', label: 'Locked' }], numbers: [] },
  end: { key: 'end', options: [{ value: 'Loop', label: 'Loop' }, { value: 'Ping-Pong', label: 'Ping-Pong' }, { value: 'Pause', label: 'Pause' }], numbers: [] },
  fade: {
    key: 'bright',
    options: [{ value: false, label: 'Off' }, { value: true, label: 'Fade in' }],
    numbers: [{ key: 'brightT', label: 'Fade time', disabled: () => known('bright') && !props.values.bright }]
  },
  length: {
    key: 'fit',
    options: [{ value: true, label: 'Fit to contents' }, { value: false, label: 'Fixed length' }],
    numbers: [
      { key: 'movieDur', label: 'Movie', disabled: () => known('fit') && !!props.values.fit },
      { key: 'stillDur', label: 'Still image', disabled: () => false }
    ]
  }
};

const spec = computed(() => SPECS[props.chipKey]);

const note = computed(() => {
  if (props.chipKey === 'tags' && !props.globals.tagsOn) return 'Tags are off in the Tags settings on the right. This placement is used once they are on.';
  if (props.chipKey === 'split' && !props.globals.splitOn) return 'Split section is off in Insert settings. This placement is used once it is on.';
  return '';
});

function emitPatch(key, value) {
  emit('patch', { [key]: value });
}
</script>

<style scoped>
* { box-sizing: border-box; }

.editor { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 14px; }

.seg { display: inline-flex; background: #181818; border: 1px solid #3a3a3a; border-radius: 6px; padding: 2px; }
.seg button {
  border: none; background: transparent; color: #888888;
  padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer;
  white-space: nowrap; transition: all 0.2s ease;
}
.seg button:hover { color: #cccccc; }
.seg button.on { background: #3a3a3a; color: #ffffff; }
.seg button:focus-visible { outline: none; box-shadow: 0 0 0 2px #0a84ff; }

.num { display: inline-flex; align-items: center; gap: 6px; margin: 0; transition: opacity 0.2s ease; }
.num.disabled { opacity: 0.4; }
.num-lbl { font-size: 11px; color: #888888; font-weight: 500; }
.num-in { position: relative; width: 70px; }
.num-in input {
  width: 100%; background: #181818; border: 1px solid #3a3a3a; color: #eeeeee;
  padding: 5px 20px 5px 8px; border-radius: 6px; font-size: 12px; outline: none; transition: border-color 0.2s ease;
}
.num-in input:focus { border-color: #0a84ff; }
.num-in input::placeholder { color: #777777; font-style: italic; }
.num-in input:disabled { cursor: not-allowed; }
.unit { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 10px; color: #777777; pointer-events: none; }

.note { flex-basis: 100%; font-size: 11px; color: #888888; }
</style>
