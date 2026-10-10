<template>
  <div ref="rowEl" class="chip-row" :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }">
    <SettingChip
      v-for="c in visible"
      :key="c.key"
      :ref="el => { chipEls[c.key] = el?.$el; }"
      :chip="c"
      :open="openKey === c.key"
      :scope="scope && !c.groupOnly"
      @click="emit('open', c.key, chipEls[c.key])"
    />
    <SettingChip
      v-if="hidden.length"
      ref="plusRef"
      :chip="plusChip"
      :open="listOpen || hidden.some(c => c.key === openKey)"
      :scope="scope && hidden.some(c => !c.groupOnly)"
      :aria-label="`${hidden.length} more settings`"
      @click="listOpen = !listOpen"
    />
  </div>

  <!-- Hidden settings of a narrow pane; a row opens that chip's popover at the "+N" chip -->
  <Teleport to="body">
    <div
      v-if="listOpen && hidden.length"
      ref="listEl"
      class="chip-overflow"
      :style="{ top: listPos.top + 'px', left: listPos.left + 'px' }"
      role="menu"
      aria-label="More settings"
    >
      <button v-for="c in hidden" :key="c.key" type="button" role="menuitem" class="ovf-row" :title="c.tip" @click="openHidden(c.key)">
        <span class="ovf-k">{{ c.label }}</span>
        <span class="ovf-v" :class="{ ov: c.ov, off: c.off }">{{ c.value }}</span>
        <span v-if="c.warn" class="warn-dot" aria-hidden="true"></span>
        <span v-if="c.count" class="ov-mark">◆ {{ c.count }}</span>
        <span v-else-if="c.ov" class="ov-mark">◆</span>
        <svg class="chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, reactive, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import SettingChip from './SettingChip.vue';

/**
 * Equal-width row of setting chips (docs §2.5.1): seven equal columns that never wrap.
 * Below ~80px a column, chips fold into a "+N" chip (priority+): chips with the inherited
 * value first, so overridden values stay visible.
 */
const props = defineProps({
  chips: { type: Array, required: true },
  openKey: { type: String, default: null },
  scope: { type: Boolean, default: false }   // selection scope: tints the chips that edit layers (not group-only ones)
});
const emit = defineEmits(['open']);

const MIN_CHIP = 80;
const GAP = 6;

const rowEl = ref(null);
const chipEls = {};
const plusRef = ref(null);
const width = ref(0);

const fits = computed(() => Math.max(2, Math.floor((width.value + GAP) / (MIN_CHIP + GAP))));

const marked = c => !!(c.ov || c.warn || c.count);
const foldState = computed(() => {
  const all = props.chips;
  const n = fits.value;
  if (!width.value || all.length <= n) return { visible: all, hidden: [] };
  // Fold order: inherited values from the end, then overridden ones from the end
  const order = [...all.filter(c => !marked(c)).reverse(), ...all.filter(marked).reverse()];
  const fold = new Set(order.slice(0, all.length - (n - 1)).map(c => c.key));
  return { visible: all.filter(c => !fold.has(c.key)), hidden: all.filter(c => fold.has(c.key)) };
});

// While a popover is open the folding is frozen: a value that becomes overridden must not
// swap chips and move the popover. It takes its visible place once the popover closes.
const frozen = ref(null);   // { visible: [key], hidden: [key] }
watch(() => props.openKey, key => {
  frozen.value = key ? { visible: foldState.value.visible.map(c => c.key), hidden: foldState.value.hidden.map(c => c.key) } : null;
});
const layoutState = computed(() => {
  if (!frozen.value) return foldState.value;
  const byKey = Object.fromEntries(props.chips.map(c => [c.key, c]));
  const pick = keys => keys.map(k => byKey[k]).filter(Boolean);
  return { visible: pick(frozen.value.visible), hidden: pick(frozen.value.hidden) };
});
const visible = computed(() => layoutState.value.visible);
const hidden = computed(() => layoutState.value.hidden);
const columns = computed(() => visible.value.length + (hidden.value.length ? 1 : 0));

const plusChip = computed(() => ({
  key: '+more',
  label: 'More',
  value: `+${hidden.value.length}`,
  tip: hidden.value.map(c => `${c.label}: ${c.value}`).join(', '),
  ov: hidden.value.some(c => c.ov || c.count),
  warn: hidden.value.some(c => c.warn)
}));

let ro = null;
onMounted(() => {
  ro = new ResizeObserver(entries => { width.value = entries[0].contentRect.width; });
  ro.observe(rowEl.value);
});
onBeforeUnmount(() => { ro?.disconnect(); listen(false); });

// --- Overflow list ---
const listOpen = ref(false);
const listEl = ref(null);
const listPos = reactive({ top: 0, left: 0 });

function placeList() {
  const plus = plusRef.value?.$el;
  const list = listEl.value;
  if (!plus || !list) return;
  const c = plus.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const left = Math.max(8, Math.min(c.right - list.offsetWidth, vw - list.offsetWidth - 8));
  const below = c.bottom + 6;
  const top = below + list.offsetHeight > vh - 8 ? Math.max(8, c.top - 6 - list.offsetHeight) : below;
  Object.assign(listPos, { top, left });
}
function onOutside(event) {
  if (listEl.value?.contains(event.target) || plusRef.value?.$el?.contains(event.target)) return;
  listOpen.value = false;
}
function onEsc(event) {
  if (event.key !== 'Escape') return;
  event.stopPropagation();
  listOpen.value = false;
  plusRef.value?.$el?.focus();
}
function listen(on) {
  const fn = on ? 'addEventListener' : 'removeEventListener';
  window[fn]('pointerdown', onOutside, true);
  window[fn]('keydown', onEsc, true);
  window[fn]('resize', placeList);
  window[fn]('scroll', placeList, true);
}
watch(listOpen, async open => {
  listen(open);
  if (!open) return;
  await nextTick();
  placeList();
  listEl.value?.querySelector('button')?.focus();
});
watch(() => hidden.value.length, n => { if (!n) listOpen.value = false; });

function openHidden(key) {
  listOpen.value = false;
  emit('open', key, plusRef.value?.$el);
}

/** Element of a chip (or of "+N" when it is folded), for anchoring its popover. */
function anchorOf(key) {
  return hidden.value.some(c => c.key === key) ? plusRef.value?.$el : chipEls[key];
}

defineExpose({ rowEl, anchorOf });
</script>

<style scoped>
* { box-sizing: border-box; }

.chip-row { flex: 1; min-width: 0; display: grid; gap: 6px; }

.chip-overflow {
  position: fixed; z-index: 1000;
  min-width: 200px; max-width: calc(100vw - 16px); padding: 4px 0;
  background: #1e1e1e; border: 1px solid #3a3a3a; border-radius: 6px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
  font-family: inherit;
}
.ovf-row {
  width: 100%; height: 32px; padding: 0 10px;
  display: flex; align-items: center; gap: 8px;
  border: none; background: transparent; cursor: pointer; text-align: left; font: inherit;
  transition: background 0.15s ease;
}
.ovf-row:hover, .ovf-row:focus-visible { background: #2a2a2a; outline: none; }
.ovf-k { width: 52px; flex-shrink: 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #aaaaaa; }
.ovf-v { flex: 1; min-width: 0; font-size: 12px; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ovf-v.ov { color: #ffd60a; }
.ovf-v.off { color: #666666; text-decoration: line-through; }
.ov-mark { color: #ffd60a; font-size: 9px; font-weight: 700; }
.warn-dot { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; flex-shrink: 0; }
.chev { color: #666666; flex-shrink: 0; }
</style>
