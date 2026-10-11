<template>
  <div v-if="toast" class="toast" :class="{ 'is-error': toast.kind === 'error', lifted }" role="status" @click="$emit('dismiss')">
    <span>{{ toast.text }}</span>
    <button v-if="toast.action" type="button" class="toast-action" @click.stop="runAction">{{ toast.action.label }}</button>
  </div>
</template>

<script setup>
const props = defineProps({
  // { text, kind: 'info'|'error', action?: { label, fn } }
  toast: { type: Object, default: null },
  // A floating bar sits at the bottom of the plan: show the toast above it
  lifted: { type: Boolean, default: false }
});
const emit = defineEmits(['dismiss']);

function runAction() {
  props.toast.action.fn();
  emit('dismiss');
}
</script>

<style scoped>
.toast {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  max-width: 560px;
  display: flex;
  align-items: center;
  gap: 14px;
  background: #242424;
  border: 1px solid #0a84ff;
  color: #dddddd;
  border-radius: 6px;
  padding: 10px 16px;
  font-size: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  cursor: pointer;
  transition: bottom 0.2s ease;
}
/* The plan bar: 16px from the pane bottom, 44px tall, plus a gap */
.toast.lifted { bottom: 72px; }
.toast.is-error {
  border-color: #ef4444;
}
.toast-action {
  background: transparent;
  border: none;
  color: #0a84ff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
}
.toast-action:hover { color: #ffffff; }
</style>
