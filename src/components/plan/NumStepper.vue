<template>
  <div class="stp" :class="{ focused, disabled }">
    <!-- mousedown.prevent keeps a typed draft in the field, so the step starts from it -->
    <button type="button" class="stp-btn" tabindex="-1" :aria-label="`Decrease ${label}`" :disabled="disabled" @mousedown.prevent @click="stepBy(-1)">−</button>
    <input
      ref="inputEl"
      class="stp-in"
      type="text"
      inputmode="decimal"
      :value="text"
      :placeholder="modelValue == null ? 'Mixed' : ''"
      :aria-label="`${label}, seconds`"
      :disabled="disabled"
      @focus="onFocus"
      @blur="onBlur"
      @input="draft = $event.target.value"
      @keydown="onKeydown"
    />
    <span class="stp-unit" aria-hidden="true">s</span>
    <button type="button" class="stp-btn" tabindex="-1" :aria-label="`Increase ${label}`" :disabled="disabled" @mousedown.prevent @click="stepBy(1)">+</button>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

/**
 * Compact seconds stepper (docs §2.5.1): − value s +. Focus selects the number, Enter or blur
 * applies, Esc cancels, a comma is accepted, ↑/↓ step. modelValue null = mixed selection.
 */
const props = defineProps({
  modelValue: { type: Number, default: null },
  label: { type: String, required: true },
  step: { type: Number, default: 0.5 },
  disabled: { type: Boolean, default: false }
});
const emit = defineEmits(['update:modelValue']);

const inputEl = ref(null);
const focused = ref(false);
const draft = ref(null);   // text being typed; null = show the model value

const text = computed(() => (draft.value != null ? draft.value : (props.modelValue == null ? '' : String(props.modelValue))));

function parse(s) {
  const n = Number(String(s).trim().replace(',', '.'));
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 1000) / 1000) : null;
}

function commit() {
  if (draft.value == null) return;
  const n = parse(draft.value);
  draft.value = null;
  if (n != null && n !== props.modelValue) emit('update:modelValue', n);
}

function stepBy(dir) {
  const base = draft.value != null ? parse(draft.value) : props.modelValue;
  draft.value = null;
  const next = Math.max(0, Math.round(((base ?? 0) + dir * props.step) * 1000) / 1000);
  if (next !== props.modelValue) emit('update:modelValue', next);
}

function onFocus(event) {
  focused.value = true;
  event.target.select();
}
function onBlur() {
  focused.value = false;
  commit();
}
function onKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    commit();
    inputEl.value?.select();
  } else if (event.key === 'Escape') {
    // The popover leaves Esc to a focused stepper: the first Esc cancels the edit
    draft.value = null;
    inputEl.value?.blur();
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    stepBy(event.key === 'ArrowUp' ? 1 : -1);
    requestAnimationFrame(() => inputEl.value?.select());
  }
}
</script>

<style scoped>
* { box-sizing: border-box; }

.stp {
  display: inline-flex; align-items: center;
  height: 26px; width: 104px; flex-shrink: 0;
  border: 1px solid #3a3a3a; border-radius: 6px; background: #181818;
  transition: border-color 0.2s ease;
}
.stp:hover:not(.disabled) { border-color: #555555; }
.stp.focused { border-color: #0a84ff; }
.stp.disabled { opacity: 0.4; }
.stp-btn {
  width: 24px; height: 100%; flex-shrink: 0;
  border: none; background: transparent; color: #aaaaaa;
  font-size: 13px; line-height: 1; cursor: pointer; padding: 0;
  transition: color 0.2s ease, background 0.2s ease;
}
.stp-btn:first-child { border-radius: 5px 0 0 5px; }
.stp-btn:last-child { border-radius: 0 5px 5px 0; }
.stp-btn:hover:not(:disabled) { color: #ffffff; background: #2a2a2a; }
.stp-btn:disabled { cursor: not-allowed; }
.stp-in {
  flex: 1; min-width: 0; height: 100%;
  border: none; background: transparent; outline: none;
  color: #eeeeee; font: inherit; font-size: 12px; text-align: right;
  font-variant-numeric: tabular-nums; padding: 0 2px 0 0;
}
.stp-in::placeholder { color: #777777; font-style: italic; }
.stp-in:disabled { cursor: not-allowed; }
.stp-unit { font-size: 11px; color: #777777; padding-right: 4px; }
</style>
