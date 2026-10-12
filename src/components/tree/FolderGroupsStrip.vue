<template>
  <div class="strip" @click.stop>
    <div class="strip-sum">
      <strong>{{ folderCount }} {{ folderCount === 1 ? 'folder' : 'folders' }}</strong>, {{ result.files }} {{ result.files === 1 ? 'file' : 'files' }}
    </div>
    <div v-if="notes" class="strip-note">{{ notes }}</div>

    <!-- Labels when there is room; icons with tooltips and a caption in a narrow tree -->
    <div class="seg" role="radiogroup" aria-label="Folder content">
      <button
        v-for="m in MODES"
        :key="m.value"
        type="button"
        role="radio"
        :class="{ on: content === m.value }"
        :aria-checked="content === m.value"
        :aria-label="m.label"
        :title="`${m.label}: ${m.tip}`"
        @click="content = m.value"
      >
        <svg class="seg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <template v-if="m.value === 'direct'">
            <path d="M4 19h16a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-7l-2-3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z"/>
          </template>
          <template v-else-if="m.value === 'deep'">
            <path d="M3 7v11a1 1 0 0 0 1 1h13"/>
            <path d="M8 15h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-5l-2-2H8a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1Z"/>
          </template>
          <template v-else>
            <path d="M5 4v14"/>
            <path d="M5 7h4"/>
            <path d="M5 17h4"/>
            <rect x="11" y="4" width="9" height="6" rx="1.5"/>
            <rect x="11" y="14" width="9" height="6" rx="1.5"/>
          </template>
        </svg>
        <span class="seg-label">{{ m.label }}</span>
      </button>
    </div>
    <div class="seg-caption">{{ currentMode.label }}</div>

    <MenuSelect v-model="insertAfter" :items="insertItems" placeholder="At the end" aria-label="Where to insert the new groups" title="Where to insert the new groups" />

    <div class="strip-actions">
      <button type="button" class="btn-secondary" title="Clear the folder selection (Esc)" aria-label="Clear the folder selection" @click="$emit('clear')">
        <svg class="clear-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        <span class="clear-label">Clear</span>
      </button>
      <button type="button" class="btn-primary" :disabled="!result.groups.length" :title="createLabel" :aria-label="createLabel" @click="$emit('create')">
        <span class="create-long">{{ createLabel }}</span>
        <span class="create-short">Create {{ result.groups.length }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import MenuSelect from '../common/MenuSelect.vue';

const props = defineProps({
  folderCount: { type: Number, required: true },
  result: { type: Object, required: true }, // folderGroups() result
  groups: { type: Array, default: () => [] } // plan groups for "Insert after"
});
defineEmits(['create', 'clear']);

const content = defineModel('content', { type: String, default: 'direct' });
const insertAfter = defineModel('insertAfter', { type: String, default: '' });

const MODES = [
  { value: 'direct', label: 'Folder only', tip: "each folder's own files" },
  { value: 'deep', label: 'With subfolders', tip: 'each folder with all its subfolders, as one group' },
  { value: 'split', label: 'Split subfolders', tip: 'one group per folder and per subfolder with files' }
];
const insertItems = computed(() => [
  { value: '', label: 'At the end' },
  ...props.groups.map((g, gi) => ({ value: g.id, label: `After G${gi + 1}: ${g.name}` }))
]);

const currentMode = computed(() => MODES.find(m => m.value === content.value) || MODES[0]);

const createLabel = computed(() => {
  const n = props.result.groups.length;
  return `Create ${n} ${n === 1 ? 'group' : 'groups'}`;
});

const notes = computed(() => {
  const parts = [];
  const { skippedNested, skippedEmpty, skippedMissing } = props.result;
  if (skippedNested) parts.push(`${skippedNested} nested ${skippedNested === 1 ? 'folder' : 'folders'} skipped`);
  if (skippedEmpty) parts.push(`${skippedEmpty} empty ${skippedEmpty === 1 ? 'folder' : 'folders'} skipped`);
  if (skippedMissing) parts.push(`${skippedMissing} missing ${skippedMissing === 1 ? 'file' : 'files'} skipped`);
  return parts.join(', ');
});
</script>

<style scoped>
* { box-sizing: border-box; }

.strip {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px 12px;
  border-top: 1px solid #2a2a2a;
  background: #1e1e1e;
  container-type: inline-size;
}
.strip-sum { font-size: 12px; color: #d4d4d4; }
.strip-sum strong { color: #ffffff; }
.strip-note { font-size: 11px; color: #9c9c9c; }

.seg { display: flex; background: #181818; border: 1px solid #3a3a3a; border-radius: 6px; padding: 2px; }
.seg button {
  flex: 1; min-width: 0; border: none; background: transparent; color: #9c9c9c;
  padding: 5px 4px; border-radius: 4px; font-size: 10px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 4px;
  white-space: nowrap; transition: all 0.2s ease;
}
.seg button:hover { color: #f2f2f2; }
.seg button.on { background: #3a3a3a; color: #ffffff; }
.seg button:focus-visible { outline: none; box-shadow: 0 0 0 2px #0a84ff; }
.seg-icon { display: none; flex-shrink: 0; }
.seg-label { overflow: hidden; text-overflow: ellipsis; }
.seg-caption { display: none; font-size: 11px; color: #9c9c9c; margin-top: -2px; }

.strip-actions { display: flex; gap: 8px; }
.btn-primary, .btn-secondary {
  height: 30px; border: none; border-radius: 6px; padding: 0 10px;
  font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: background 0.2s ease;
}
/* Create keeps one line: it takes the free width and ends with an ellipsis if it must */
.btn-primary { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; background: #0a84ff; color: #ffffff; }
.btn-primary:hover:not(:disabled) { background: #0060d1; }
.btn-primary:disabled { background: #3a3a3a; color: #777777; cursor: not-allowed; }
.btn-secondary {
  flex-shrink: 0; display: flex; align-items: center; justify-content: center; gap: 6px;
  background: #2a2a2a; color: #aeaeae; font-weight: 600;
}
.btn-secondary:hover { background: #333333; color: #ffffff; }
.btn-primary:focus-visible, .btn-secondary:focus-visible { outline: none; box-shadow: 0 0 0 2px #0a84ff; }
.clear-icon { display: none; }
.create-short { display: none; }

/* Narrow tree: icon radio buttons with a caption naming the selected mode, Clear as an icon */
@container (max-width: 265px) {
  .seg button { padding: 5px 4px; }
  .seg-icon { display: block; }
  .seg-label { display: none; }
  .seg-caption { display: block; }
  .clear-icon { display: block; }
  .clear-label { display: none; }
  .btn-secondary { width: 30px; padding: 0; }
}
/* Narrowest tree (150px): the count stays, the noun goes */
@container (max-width: 180px) {
  .create-long { display: none; }
  .create-short { display: inline; }
}
</style>
