<template>
  <div class="menu-select" :class="{ open, disabled }">
    <button
      ref="triggerEl"
      type="button"
      class="ms-trigger"
      :disabled="disabled"
      :title="title"
      :aria-label="ariaLabel"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="toggle"
      @keydown="onTriggerKey"
    >
      <span class="ms-text">{{ triggerText }}</span>
      <span class="ms-arrow" aria-hidden="true">▼</span>
    </button>

    <!-- Floats over the layout (teleported, fixed position), so a narrow pane never clips it -->
    <Teleport to="body">
      <div
        v-if="open"
        ref="listEl"
        class="ms-list"
        :style="{
          top: pos.top == null ? 'auto' : pos.top + 'px',
          bottom: pos.bottom == null ? 'auto' : pos.bottom + 'px',
          left: pos.left + 'px',
          minWidth: pos.width + 'px',
          maxHeight: pos.maxHeight + 'px'
        }"
      >
        <!-- Only the choices scroll; the create action stays pinned under them (the Track menu look) -->
        <ul class="ms-scroll" role="listbox" :aria-label="ariaLabel">
          <template v-for="(item, i) in items" :key="item.heading ? `h${i}` : item.value">
            <li v-if="item.heading" class="ms-heading" role="presentation">{{ item.heading }}</li>
            <li
              v-else
              class="ms-item"
              :class="{ selected: item.value === modelValue, active: choices[active] === item }"
              role="option"
              :aria-selected="item.value === modelValue"
              @mouseenter="active = choices.indexOf(item)"
              @click="pick(item)"
            >{{ item.label }}</li>
          </template>
          <li v-if="!choices.length && empty" class="ms-empty" role="presentation">{{ empty }}</li>
        </ul>
        <div
          v-if="create"
          class="ms-create"
          :class="{ active: active === choices.length }"
          role="button"
          @mouseenter="active = choices.length"
          @click="pick(create)"
        >+ {{ create.label }}</div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue';

/**
 * The project dropdown (the settings panel look) for a short list of choices:
 * items are { value, label } or { heading } section titles; `create` ({ value, label }) is an
 * action pinned under the list, like "+ Create New Track".
 * With modelValue it works as a select; without it as an action menu that emits `select`
 * and keeps showing the placeholder.
 */
const props = defineProps({
  items: { type: Array, required: true },
  create: { type: Object, default: null },
  empty: { type: String, default: '' },          // shown when there are no items
  modelValue: { type: [String, Number], default: undefined },
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  title: { type: String, default: '' },
  ariaLabel: { type: String, default: '' }
});
const emit = defineEmits(['update:modelValue', 'select']);

const triggerEl = ref(null);
const listEl = ref(null);
const open = ref(false);
const active = ref(-1);

const choices = computed(() => props.items.filter(i => !i.heading));
const triggerText = computed(() => {
  if (props.modelValue === undefined) return props.placeholder;
  return choices.value.find(i => i.value === props.modelValue)?.label ?? props.placeholder;
});

// --- Placement: below the trigger, flipped above when there is no room, kept on screen ---
const pos = reactive({ top: null, bottom: null, left: 0, width: 0, maxHeight: 240 });
const GAP = 4;
const EDGE = 8;
const MAX_H = 240;

function place() {
  const t = triggerEl.value;
  const list = listEl.value;
  if (!t || !list) return;
  const c = t.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const roomBelow = vh - c.bottom - GAP - EDGE;
  const roomAbove = c.top - GAP - EDGE;
  // Full content height: the scrolling choices plus the pinned create action
  const scroll = list.querySelector('.ms-scroll');
  const h = Math.min((scroll?.scrollHeight || 0) + (list.querySelector('.ms-create')?.offsetHeight || 0) + 2, MAX_H);
  const above = h > roomBelow && roomAbove > roomBelow;
  const width = c.width;
  const left = Math.max(EDGE, Math.min(c.left, vw - Math.max(width, list.offsetWidth) - EDGE));
  if (above) Object.assign(pos, { top: null, bottom: vh - c.top + GAP, left, width, maxHeight: Math.min(MAX_H, roomAbove) });
  else Object.assign(pos, { top: c.bottom + GAP, bottom: null, left, width, maxHeight: Math.min(MAX_H, roomBelow) });
}

function onOutside(event) {
  if (listEl.value?.contains(event.target) || triggerEl.value?.contains(event.target)) return;
  close(false);
}
/** Scrolling the page under the menu would detach it; scrolling the list itself is fine. */
function onScroll(event) {
  if (listEl.value?.contains(event.target)) return;
  close(false);
}
function onResize() { close(false); }

const listeners = [['pointerdown', onOutside, true], ['scroll', onScroll, true], ['resize', onResize, false]];

function show() {
  if (open.value || props.disabled) return;
  open.value = true;
  const at = choices.value.findIndex(i => i.value === props.modelValue);
  active.value = at >= 0 ? at : 0;
  listeners.forEach(([e, fn, cap]) => window.addEventListener(e, fn, cap));
  nextTick(() => { place(); scrollActive(); });
}
function close(refocus = true) {
  if (!open.value) return;
  open.value = false;
  listeners.forEach(([e, fn, cap]) => window.removeEventListener(e, fn, cap));
  if (refocus) triggerEl.value?.focus();
}
function toggle() { open.value ? close() : show(); }

function pick(item) {
  close();
  if (props.modelValue !== undefined) emit('update:modelValue', item.value);
  emit('select', item.value);
}

function scrollActive() {
  listEl.value?.querySelectorAll('.ms-item')[active.value]?.scrollIntoView({ block: 'nearest' });
}
/** The create action is the last keyboard stop, after the choices. */
function move(step) {
  const n = choices.value.length + (props.create ? 1 : 0);
  if (!n) return;
  active.value = (active.value + step + n) % n;
  nextTick(scrollActive);
}

function onTriggerKey(event) {
  if (!open.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) { event.preventDefault(); show(); }
    return;
  }
  onListKey(event);
}
function onListKey(event) {
  if (event.key === 'ArrowDown') { event.preventDefault(); move(1); }
  else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
  else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    const item = active.value === choices.value.length ? props.create : choices.value[active.value];
    if (item) pick(item);
  } else if (event.key === 'Escape') {
    // The menu takes Esc before the file selection or the plan
    event.preventDefault();
    event.stopPropagation();
    close();
  } else if (event.key === 'Tab') close(false);
}

onBeforeUnmount(() => listeners.forEach(([e, fn, cap]) => window.removeEventListener(e, fn, cap)));
</script>

<style scoped>
.menu-select { position: relative; width: 100%; min-width: 0; }

.ms-trigger {
  width: 100%; height: 28px; min-width: 0;
  display: flex; align-items: center; gap: 6px;
  background: #181818; border: 1px solid #3a3a3a; border-radius: 6px;
  color: #eeeeee; font: inherit; font-size: 12px; text-align: left;
  padding: 0 10px; cursor: pointer; outline: none;
  transition: all 0.2s ease;
}
.ms-trigger:hover:not(:disabled) { border-color: #555555; }
.ms-trigger:focus-visible, .open .ms-trigger { border-color: #0a84ff; }
.ms-trigger:focus-visible { box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3); }
.ms-trigger:disabled { opacity: 0.4; cursor: not-allowed; }
.ms-text { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ms-arrow { flex-shrink: 0; font-size: 8px; color: #9c9c9c; transition: transform 0.2s ease; }
.open .ms-arrow { transform: rotate(180deg); }

.ms-list {
  position: fixed; z-index: 1000;
  max-width: calc(100vw - 16px);
  display: flex; flex-direction: column;
  overflow: hidden;
  background: #1e1e1e; border: 1px solid #3a3a3a; border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  font-family: inherit;
}
.ms-scroll {
  flex: 1 1 auto; min-height: 0; overflow-y: auto;
  margin: 0; padding: 4px 0; list-style: none;
}
.ms-scroll::-webkit-scrollbar { width: 6px; }
.ms-scroll::-webkit-scrollbar-track { background: transparent; }
.ms-scroll::-webkit-scrollbar-thumb { background: #333333; border-radius: 3px; }
.ms-scroll::-webkit-scrollbar-thumb:hover { background: #555555; }

.ms-empty { padding: 8px 12px; font-size: 12px; color: #888888; text-align: center; }

/* Same as the Track menu's "+ Create New Track" */
.ms-create {
  flex-shrink: 0;
  padding: 8px 12px;
  font-size: 12px; color: #0a84ff;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  cursor: pointer; user-select: none;
  border-top: 1px solid #2e2e2e;
  background: #1e1e1e;
  transition: background 0.2s;
}
.ms-create.active { background: rgba(10, 132, 255, 0.15); }

.ms-heading {
  padding: 8px 12px 4px; margin-top: 4px;
  border-top: 1px solid #2e2e2e;
  font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
  color: #9c9c9c; cursor: default; user-select: none;
}
.ms-heading:first-child { margin-top: 0; border-top: none; }

.ms-item {
  padding: 8px 12px;
  font-size: 12px; color: #eeeeee;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  cursor: pointer; user-select: none;
  transition: background 0.2s;
  font-variant-numeric: tabular-nums;
}
.ms-item.active { background: #3a3a3a; }
.ms-item.selected { background: rgba(59, 130, 246, 0.2); color: #0a84ff; font-weight: 600; }
</style>
