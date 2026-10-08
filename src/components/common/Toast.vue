<template>
  <div v-if="toast" class="toast" :class="{ 'is-error': toast.kind === 'error' }" role="status" @click="$emit('dismiss')">
    {{ toast.text }}
  </div>
</template>

<script setup>
defineProps({
  toast: { type: Object, default: null }
});
defineEmits(['dismiss']);
</script>

<style scoped>
.toast {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  max-width: 560px;
  background: #242424;
  border: 1px solid #0a84ff;
  color: #dddddd;
  border-radius: 6px;
  padding: 10px 16px;
  font-size: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  cursor: pointer;
}
.toast.is-error {
  border-color: #ef4444;
}
</style>
