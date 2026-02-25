<template>
  <div 
    class="media-card" 
    :class="{ selected: selected }"
    @click.stop="$emit('toggle-selection', $event)"
  >
    <div class="thumbnail-area">
      <img 
        v-if="item.thumbnail" 
        :src="item.thumbnail" 
        class="thumbnail-image" 
        @error="handleImageError"
        alt="thumbnail"
      />
      <!-- Placeholder shown if no thumbnail or error -->
      <span v-if="!imageLoaded" class="placeholder-text">IMG</span>
    </div>
    <div class="media-name" :title="item.name">{{ item.name }}</div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  }
});

defineEmits(['toggle-selection']);

const imageLoaded = ref(true);

// Reset image loaded state when item changes
watch(() => props.item.thumbnail, (newVal) => {
    imageLoaded.value = !!newVal;
}, { immediate: true });

function handleImageError(e) {
  imageLoaded.value = false;
  e.target.style.display = 'none'; // Hide broken image
}
</script>

<style scoped>
.media-card {
  display: flex;
  flex-direction: column;
  background-color: #252526;
  border: 1px solid #333;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
  overflow: hidden;
  height: 140px; /* Fixed height for uniformity */
}

.media-card:hover {
  background-color: #2a2d2e;
  border-color: #444;
}

.media-card.selected {
  background-color: #37373d;
  border-color: #007acc;
  box-shadow: 0 0 0 1px #007acc; /* Emulate focus ring */
}

.thumbnail-area {
  flex: 1;
  background-color: #1e1e1e;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 5px;
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: contain; /* or cover depending on preference */
}

.placeholder-text {
  color: #444;
  font-weight: bold;
  font-size: 1.2rem;
  position: absolute;
}

.media-name {
  font-size: 0.8rem;
  text-align: center;
  padding: 5px 8px 8px;
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected .media-name {
  color: white;
}
</style>
