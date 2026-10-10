<template>
  <!-- Small info icon: the full explanation lives in the tooltip, so hints under controls stay short -->
  <span class="info" tabindex="0" role="img" :title="text" :aria-label="text">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v6"/><path d="M12 7.5v.01"/></svg>
  </span>
</template>

<script setup>
defineProps({ text: { type: String, required: true } });
</script>

<style scoped>
.info { display: inline-flex; vertical-align: -2px; color: #666666; cursor: help; border-radius: 50%; outline: none; transition: color 0.2s ease; }
.info:hover, .info:focus-visible { color: #cccccc; }
</style>
