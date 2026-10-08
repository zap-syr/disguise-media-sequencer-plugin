<template>
  <div class="strip" @click.stop>
    <div class="strip-sum">
      <strong>{{ folderCount }} {{ folderCount === 1 ? 'folder' : 'folders' }}</strong>, {{ result.files }} {{ result.files === 1 ? 'file' : 'files' }}
    </div>
    <div v-if="notes" class="strip-note">{{ notes }}</div>

    <div class="seg" role="group" aria-label="Folder content">
      <button type="button" :class="{ on: content === 'direct' }" title="Each folder's own files" @click="content = 'direct'">Folder only</button>
      <button type="button" :class="{ on: content === 'deep' }" title="Each folder with all its subfolders, as one group" @click="content = 'deep'">With subfolders</button>
      <button type="button" :class="{ on: content === 'split' }" title="One group per folder and per subfolder with files" @click="content = 'split'">Split subfolders</button>
    </div>

    <select v-model="insertAfter" class="sel" aria-label="Where to insert the new groups">
      <option value="">At the end of the plan</option>
      <option v-for="(g, gi) in groups" :key="g.id" :value="g.id">After G{{ gi + 1 }}: {{ g.name }}</option>
    </select>

    <div class="strip-actions">
      <button type="button" class="btn-secondary" @click="$emit('clear')">Clear</button>
      <button type="button" class="btn-primary" :disabled="!result.groups.length" @click="$emit('create')">
        Create {{ result.groups.length }} {{ result.groups.length === 1 ? 'group' : 'groups' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  folderCount: { type: Number, required: true },
  result: { type: Object, required: true }, // folderGroups() result
  groups: { type: Array, default: () => [] } // plan groups for "Insert after"
});
defineEmits(['create', 'clear']);

const content = defineModel('content', { type: String, default: 'direct' });
const insertAfter = defineModel('insertAfter', { type: String, default: '' });

const notes = computed(() => {
  const parts = [];
  const { skippedNested, skippedEmpty } = props.result;
  if (skippedNested) parts.push(`${skippedNested} nested ${skippedNested === 1 ? 'folder' : 'folders'} skipped`);
  if (skippedEmpty) parts.push(`${skippedEmpty} empty ${skippedEmpty === 1 ? 'folder' : 'folders'} skipped`);
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
}
.strip-sum { font-size: 12px; color: #cccccc; }
.strip-sum strong { color: #ffffff; }
.strip-note { font-size: 11px; color: #888888; }

.seg { display: flex; background: #181818; border: 1px solid #3a3a3a; border-radius: 6px; padding: 2px; }
.seg button {
  flex: 1; border: none; background: transparent; color: #888888;
  padding: 5px 4px; border-radius: 4px; font-size: 10px; font-weight: 600; cursor: pointer;
  white-space: nowrap; transition: all 0.2s ease;
}
.seg button:hover { color: #cccccc; }
.seg button.on { background: #3a3a3a; color: #ffffff; }

.sel {
  width: 100%; height: 28px;
  background: #181818; border: 1px solid #3a3a3a; border-radius: 6px;
  color: #eeeeee; font-size: 12px; padding: 0 8px; outline: none; cursor: pointer;
}
.sel:focus { border-color: #0a84ff; }

.strip-actions { display: flex; gap: 8px; }
.btn-primary, .btn-secondary {
  flex: 1; border: none; border-radius: 6px; padding: 7px 8px;
  font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.2s ease;
}
.btn-primary { background: #0a84ff; color: #ffffff; }
.btn-primary:hover:not(:disabled) { background: #0060d1; }
.btn-primary:disabled { background: #3a3a3a; color: #777777; cursor: not-allowed; }
.btn-secondary { background: #2a2a2a; color: #aaaaaa; font-weight: 600; }
.btn-secondary:hover { background: #333333; color: #ffffff; }
</style>
