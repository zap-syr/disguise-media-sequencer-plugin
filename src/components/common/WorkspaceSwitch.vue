<template>
  <div class="segmented-control" role="group" aria-label="Workspace layout">
    <button type="button" class="segment" :class="{ active: workspace === 'files' }" :aria-pressed="workspace === 'files'" title="Files only" @click.stop="workspace = 'files'">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
      Files
    </button>
    <button type="button" class="segment" :class="{ active: workspace === 'split' }" :aria-pressed="workspace === 'split'" title="Files and layer plan side by side" @click.stop="workspace = 'split'">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M10 3v18"/></svg>
      Split
    </button>
    <button type="button" class="segment" :class="{ active: workspace === 'plan' }" :aria-pressed="workspace === 'plan'" title="Layer plan only" @click.stop="workspace = 'plan'">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18"/></svg>
      Plan
    </button>
  </div>
</template>

<script setup>
const workspace = defineModel({ type: String, default: 'split' });
</script>

<style scoped>
.segmented-control {
  display: inline-flex;
  background: #181818;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  padding: 2px;
}
.segment {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: #888;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}
.segment:hover { color: #ccc; }
.segment:focus-visible { box-shadow: 0 0 0 2px #0a84ff; }
.segment.active {
  background: #3a3a3a;
  color: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
</style>
