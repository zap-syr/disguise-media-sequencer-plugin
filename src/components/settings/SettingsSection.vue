<template>
  <section ref="rootEl" class="sec" :class="{ flash }">
    <button type="button" class="sec-head" :aria-expanded="open" :aria-controls="`sec-body-${id}`" @click="open = !open">
      <span class="sec-row">
        <span class="sec-icon" aria-hidden="true"><slot name="icon"></slot></span>
        <span class="sec-title">{{ title }}</span>
        <span v-if="error" class="err-dot" title="This section has an invalid field" aria-label="Has an invalid field"></span>
        <span class="sec-fill"></span>
        <span v-if="pill" class="pill" :class="{ on: pillOn }">{{ pill }}</span>
        <svg class="chev" :class="{ open }" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 1.5 L8 5 L3 8.5 Z" fill="currentColor"/></svg>
      </span>
      <!-- Summary on its own line: it wraps and stays readable while collapsed -->
      <span v-if="summary" class="sec-sum">{{ summary }}</span>
    </button>
    <div v-show="open" :id="`sec-body-${id}`" class="sec-body">
      <slot></slot>
    </div>
  </section>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { usePersistedRef } from '../../composables/usePersistedRef';

/** Collapsible settings section (docs §2.5.1); open/closed is persisted per section. */
const props = defineProps({
  id: { type: String, required: true },
  title: { type: String, required: true },
  summary: { type: String, default: '' },
  pill: { type: String, default: '' },        // status pill: "2 on" / "Off"
  pillOn: { type: Boolean, default: false },
  error: { type: Boolean, default: false }    // an invalid field inside (visible while collapsed)
});

const open = usePersistedRef(`mediaSequencer.section.${props.id}`, true, s => s === 'true');

const rootEl = ref(null);
const flash = ref(false);
let flashTimer = null;

/** Opens the section, scrolls it into view and highlights it (e.g. from a plan chip popover). */
async function reveal() {
  open.value = true;
  await nextTick();
  rootEl.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  flash.value = true;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { flash.value = false; }, 1400);
}

defineExpose({ reveal });
</script>

<style scoped>
* { box-sizing: border-box; }

.sec {
  background: #242424;
  border: 1px solid #333333;
  border-radius: 6px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
.sec.flash { border-color: #0a84ff; box-shadow: 0 0 0 1px #0a84ff; }

.sec-head {
  width: 100%;
  display: flex; flex-direction: column; align-items: stretch; gap: 3px;
  padding: 10px 12px;
  border: none; background: transparent; border-radius: 6px;
  text-align: left; cursor: pointer; font: inherit;
}
.sec-head:focus-visible { outline: none; box-shadow: inset 0 0 0 1px #0a84ff; }
.sec-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.sec-icon { display: flex; color: #0a84ff; flex-shrink: 0; }
.sec-title {
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #0a84ff;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
}
.sec-fill { flex: 1; }
.err-dot { width: 7px; height: 7px; border-radius: 50%; background: #ef4444; flex-shrink: 0; }
.pill {
  flex-shrink: 0; height: 18px; padding: 0 7px; border-radius: 9px;
  display: inline-flex; align-items: center;
  border: 1px solid #3a3a3a; color: #888888; font-size: 10px; font-weight: 700; white-space: nowrap;
}
.pill.on { border-color: transparent; background: rgba(10, 132, 255, 0.2); color: #0a84ff; }
.chev { color: #888888; flex-shrink: 0; transition: transform 0.18s ease; }
.chev.open { transform: rotate(90deg); }
.sec-head:hover .chev { color: #ffffff; }
.sec-sum { font-size: 11px; color: #888888; line-height: 1.4; padding-left: 22px; overflow-wrap: anywhere; }

.sec-body { padding: 12px; border-top: 1px solid #2e2e2e; }
</style>
