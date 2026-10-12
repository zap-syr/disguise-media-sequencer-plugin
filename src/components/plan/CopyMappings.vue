<template>
  <!-- Floats over the plan (teleported, fixed position), so nothing below moves -->
  <Teleport to="body">
    <div
      ref="popEl"
      class="copy-pop"
      :class="{ above: pos.above }"
      :style="{
        top: pos.top == null ? 'auto' : pos.top + 'px',
        bottom: pos.bottom == null ? 'auto' : pos.bottom + 'px',
        left: pos.left + 'px',
        '--arrow-x': pos.arrow + 'px'
      }"
      role="dialog"
      :aria-label="`Copy mappings, ${tag}`"
    >
      <div class="cm-head">
        <span class="cm-title">Copy mappings</span>
        <span class="cm-tag">{{ tag }}</span>
        <span class="cm-fill"></span>
        <button type="button" class="cm-x" aria-label="Close" title="Close (Esc)" @click="$emit('close')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="cm-body">
        <div>
          <div class="cm-cap">Pattern</div>
          <div class="dots" :title="patternTip">
            <span v-for="(d, i) in patternDots.shown" :key="i" class="dot" :class="{ none: !d }" :style="d ? { background: d } : null"></span>
            <span v-if="patternDots.more" class="more">+{{ patternDots.more }}</span>
          </div>
        </div>

        <div>
          <div class="cm-cap">Copy to</div>
          <div class="olist">
            <button
              type="button"
              class="trow all"
              role="checkbox"
              :aria-checked="allState === 'all' ? 'true' : allState === 'part' ? 'mixed' : 'false'"
              :disabled="!usable.length"
              @click="toggleAll"
            >
              <span class="cb" :class="{ on: allState === 'all', part: allState === 'part' }" aria-hidden="true">
                <svg v-if="allState === 'all'" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>
                <svg v-else-if="allState === 'part'" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"><path d="M6 12h12"/></svg>
              </span>
              <span class="t-name">All other groups</span>
            </button>
            <button
              v-for="t in targets"
              :key="t.id"
              type="button"
              class="trow"
              :class="{ on: t.on }"
              role="checkbox"
              :aria-checked="t.on"
              :disabled="!t.count"
              :title="t.count ? t.tip : 'Empty group'"
              @click="toggle(t.id)"
            >
              <span class="cb" :class="{ on: t.on }" aria-hidden="true">
                <svg v-if="t.on" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>
              </span>
              <span class="g-tag">{{ t.label }}</span>
              <span class="t-text">
                <span class="t-line">
                  <span class="t-name">{{ t.name }}</span>
                  <span class="t-meta">{{ t.meta }}</span>
                </span>
                <!-- Result preview on its own line, so a long group never runs into the text -->
                <span class="dots small" aria-hidden="true">
                  <span v-for="(d, i) in t.dots.shown" :key="i" class="dot" :class="{ none: !d }" :style="d ? { background: d } : null"></span>
                  <span v-if="t.dots.more" class="more">+{{ t.dots.more }}</span>
                </span>
              </span>
            </button>
          </div>
        </div>

        <div>
          <div class="cm-cap">Longer group</div>
          <div class="seg-row">
            <div class="seg" role="group" aria-label="Longer group">
              <button type="button" :class="{ on: !repeat }" :aria-pressed="!repeat" @click="repeat = false">Stop</button>
              <button type="button" :class="{ on: repeat }" :aria-pressed="repeat" @click="repeat = true">Repeat</button>
            </div>
            <span class="seg-hint">{{ repeat ? `The pattern starts again after layer ${pattern.length}` : `Layers after ${pattern.length} keep their mapping` }}</span>
          </div>
        </div>
      </div>

      <div class="cm-foot">
        <span class="sum">{{ changeText }}</span>
        <button type="button" class="primary" :disabled="!picked.length" @click="copy">{{ buttonText }}</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { mappingColor } from '../../utils/mappingColors';
import { copyResult, copyChanges } from '../../utils/copyMappings';
import { usePersistedRef } from '../../composables/usePersistedRef';
import { useAnchoredPopover } from '../../composables/useAnchoredPopover';

/**
 * Copies the mappings of one group (or of its checked rows) by position into other groups
 * (docs Phase 13). Shows the result of each target as colour dots before anything changes.
 */
const props = defineProps({
  anchor: { type: Object, default: null },               // the header button
  sourceGid: { type: String, required: true },
  sourceIds: { type: Array, required: true },            // whole group or its checked rows, plan order
  selected: { type: Boolean, default: false },           // the source is the checked rows
  groups: { type: Array, required: true },               // useLayerPlan().state.groups
  entries: { type: Object, required: true }
});
const emit = defineEmits(['copy', 'close']);

// One line of dots in the pattern and in each target row; the rest shows as "+N"
const MAX_DOTS = 18;

const repeat = usePersistedRef('mediaSequencer.copyMappingsRepeat', false, s => s === 'true');

const sourceIndex = computed(() => props.groups.findIndex(g => g.id === props.sourceGid));
const sourceLabel = computed(() => `G${sourceIndex.value + 1}`);
const tag = computed(() => {
  const n = props.sourceIds.length;
  return props.selected ? `${sourceLabel.value}, ${n} selected` : `${sourceLabel.value}, ${n} ${n === 1 ? 'layer' : 'layers'}`;
});

const pattern = computed(() => props.sourceIds.map(id => props.entries[id]?.mappingPath || null));
const colorOf = path => (path ? mappingColor(path) : null);
function dotsOf(paths) {
  return { shown: paths.slice(0, MAX_DOTS).map(colorOf), more: Math.max(0, paths.length - MAX_DOTS) };
}
const patternDots = computed(() => dotsOf(pattern.value));
const patternTip = computed(() => {
  const set = pattern.value.filter(Boolean).length;
  return `${set} of ${pattern.value.length} source layers have a mapping; layers without one leave the target unchanged`;
});

// Targets: every other group; with a single other group it is checked from the start
const others = computed(() => props.groups.map((g, i) => ({ g, i })).filter(({ g }) => g.id !== props.sourceGid));
const usable = computed(() => others.value.filter(({ g }) => g.items.length));
const picked = ref(usable.value.length === 1 ? [usable.value[0].g.id] : []);
// Groups that were removed or emptied leave the selection
watch(usable, list => { picked.value = picked.value.filter(id => list.some(({ g }) => g.id === id)); });

const targets = computed(() => others.value.map(({ g, i }) => {
  const changes = copyChanges(pattern.value, g.items, props.entries, repeat.value).length;
  const n = g.items.length;
  return {
    id: g.id,
    label: `G${i + 1}`,
    name: g.name,
    count: n,
    on: picked.value.includes(g.id),
    changes,
    meta: `${n} ${n === 1 ? 'layer' : 'layers'}, ${changes ? `${changes} to update` : 'up to date'}`,
    tip: `G${i + 1} after the copy: ${changes} of ${n} layers get a new mapping`,
    dots: dotsOf(copyResult(pattern.value, n, repeat.value))
  };
}));

const allState = computed(() => {
  const n = picked.value.length;
  if (!n) return 'none';
  return n === usable.value.length ? 'all' : 'part';
});
function toggleAll() {
  picked.value = allState.value === 'all' ? [] : usable.value.map(({ g }) => g.id);
}
function toggle(id) {
  picked.value = picked.value.includes(id) ? picked.value.filter(x => x !== id) : [...picked.value, id];
}

const changeTotal = computed(() => targets.value.filter(t => t.on).reduce((n, t) => n + t.changes, 0));
const changeText = computed(() => {
  if (!picked.value.length) return 'Choose the groups to copy to';
  const n = changeTotal.value;
  return n ? `${n} ${n === 1 ? 'layer changes' : 'layers change'}` : 'The layers already have these mappings';
});
const buttonText = computed(() => {
  const n = picked.value.length;
  return n ? `Copy to ${n} ${n === 1 ? 'group' : 'groups'}` : 'Copy';
});

function copy() {
  // Plan order, whatever order the boxes were checked in
  const ids = others.value.map(({ g }) => g.id).filter(id => picked.value.includes(id));
  emit('copy', { targetGids: ids, repeat: repeat.value });
}

// --- Placement: under the header button, flipped above when there is no room ---
const popEl = ref(null);
const { pos, resetSide } = useAnchoredPopover({
  anchor: () => props.anchor,
  keepOpenOn: () => props.anchor,
  popEl,
  onClose: () => emit('close')
});
watch(() => props.anchor, resetSide);
</script>

<style scoped>
* { box-sizing: border-box; }

/* Chip popover shell (ChipPopover.vue), a little wider for the target rows */
.copy-pop {
  position: fixed; z-index: 1000;
  width: 340px; max-width: calc(100vw - 16px);
  display: flex; flex-direction: column; max-height: calc(100vh - 16px);
  border: 1px solid #3a3a3a; border-radius: 6px; background: #1e1e1e;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
  font-family: inherit; color: #d4d4d4;
}
/* Small notch pointing at the button */
.copy-pop::before {
  content: ''; position: absolute; left: var(--arrow-x); top: -5px;
  width: 8px; height: 8px; background: #1e1e1e;
  border-left: 1px solid #3a3a3a; border-top: 1px solid #3a3a3a;
  transform: translateX(-50%) rotate(45deg);
}
.copy-pop.above::before { top: auto; bottom: -5px; background: #1a1a1a; transform: translateX(-50%) rotate(225deg); }

.cm-head { flex-shrink: 0; display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 6px 0 12px; border-bottom: 1px solid #2e2e2e; }
.cm-title { font-size: 12px; font-weight: 700; color: #ffffff; white-space: nowrap; }
.cm-tag {
  flex-shrink: 0; height: 18px; padding: 0 6px; border-radius: 4px;
  display: inline-flex; align-items: center;
  background: rgba(10, 132, 255, 0.2); color: #0a84ff; font-size: 10px; font-weight: 700; white-space: nowrap;
}
.cm-fill { flex: 1; }
.cm-x {
  width: 24px; height: 24px; flex-shrink: 0; border: none; border-radius: 4px;
  background: transparent; color: #9c9c9c; cursor: pointer; padding: 0;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;
}
.cm-x:hover { background: #2c2c2c; color: #ffffff; }
.cm-x:focus-visible { outline: none; box-shadow: 0 0 0 2px #0a84ff; }

/* Only the body scrolls (a very short window), so the notch outside the box is never clipped */
.cm-body { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 12px; min-height: 0; overflow-y: auto; }
.cm-cap { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #aeaeae; margin-bottom: 6px; }

/* Mapping colour dots: 9px squares like the mapping slots; hollow = this layer does not change */
.dots { display: flex; flex-wrap: nowrap; align-items: center; gap: 4px; min-width: 0; }
.dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
.dot.none { border: 1.5px solid #555555; }
.dots.small { gap: 3px; margin-top: 4px; }
.dots.small .dot { width: 8px; height: 8px; border-radius: 2px; }
.more { font-size: 10px; color: #9c9c9c; font-variant-numeric: tabular-nums; }

/* Option list in the chip popover style (SettingEditor .opts) */
.olist { border: 1px solid #333333; border-radius: 6px; background: #181818; overflow: hidden; max-height: 220px; overflow-y: auto; }
.trow {
  width: 100%; min-height: 40px; padding: 6px 10px;
  display: flex; align-items: center; gap: 8px;
  border: none; background: transparent; text-align: left; font: inherit; cursor: pointer;
  transition: background 0.15s ease;
}
.trow + .trow { border-top: 1px solid #262626; }
.trow.all { min-height: 34px; }
.trow:hover:not(:disabled) { background: #2c2c2c; }
.trow:focus-visible { outline: none; box-shadow: inset 0 0 0 2px #0a84ff; }
.trow.on { background: rgba(10, 132, 255, 0.08); }
.trow:disabled { opacity: 0.4; cursor: not-allowed; }
.cb {
  width: 16px; height: 16px; flex-shrink: 0;
  border: 1.5px solid #777777; border-radius: 4px; background: #181818; color: transparent;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;
}
.trow:hover:not(:disabled) .cb { border-color: #cccccc; }
.cb.on, .cb.part, .trow:hover .cb.on, .trow:hover .cb.part { background: #0a84ff; border-color: #0a84ff; color: #ffffff; }
.g-tag {
  flex-shrink: 0; height: 18px; min-width: 26px; padding: 0 5px; border-radius: 4px;
  display: inline-flex; align-items: center; justify-content: center;
  background: #0a84ff; color: #ffffff; font-size: 10px; font-weight: 700;
}
.t-text { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.3; }
/* Name and counts on one line: the name gives way first */
.t-line { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.t-name { min-width: 0; font-size: 12px; font-weight: 600; color: #f2f2f2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.t-meta { flex-shrink: 0; margin-left: auto; font-size: 11px; color: #9c9c9c; white-space: nowrap; font-variant-numeric: tabular-nums; }

.seg-row { display: flex; align-items: center; gap: 10px; }
.seg { display: inline-flex; flex-shrink: 0; height: 28px; padding: 2px; border: 1px solid #3a3a3a; border-radius: 6px; background: #181818; }
.seg button {
  border: none; background: transparent; color: #9c9c9c;
  padding: 0 10px; border-radius: 4px; font: inherit; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
}
.seg button:hover { color: #f2f2f2; }
.seg button.on { background: #3a3a3a; color: #ffffff; }
.seg button:focus-visible { outline: none; box-shadow: 0 0 0 2px #0a84ff; }
.seg-hint { min-width: 0; font-size: 11px; color: #9c9c9c; line-height: 1.35; }

.cm-foot {
  flex-shrink: 0; border-radius: 0 0 6px 6px;
  display: flex; align-items: center; gap: 8px;
  padding: 8px 8px 8px 12px; background: #1a1a1a; border-top: 1px solid #2e2e2e;
}
.sum { flex: 1; min-width: 0; font-size: 11px; color: #9c9c9c; font-variant-numeric: tabular-nums; }
.primary {
  flex-shrink: 0; height: 28px; padding: 0 14px; border: none; border-radius: 6px;
  background: #0a84ff; color: #ffffff; font: inherit; font-size: 12px; font-weight: 700;
  cursor: pointer; white-space: nowrap; transition: background 0.2s ease;
}
.primary:hover:not(:disabled) { background: #0060d1; }
.primary:disabled { opacity: 0.4; cursor: not-allowed; }
.primary:focus-visible { outline: none; box-shadow: 0 0 0 2px #ffffff; }
</style>
