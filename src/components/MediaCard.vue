<template>
  <div 
    class="media-card" 
    :class="{ 'is-card-selected': selected }"
  >
    <div class="card-preview" :class="mediaType">
      <img v-if="thumbnailUrl && !thumbnailError" :src="thumbnailUrl" @error="thumbnailError = true" class="thumbnail-image" />
      <template v-else>
        <svg v-if="mediaType === 'image'" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect width="15" height="14" x="1" y="5" rx="2" ry="2"/></svg>
      </template>

      <div v-if="selected" class="selected-overlay">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    </div>
    <div class="card-footer">
      <span class="file-name" :title="item.name">{{ item.name }}</span>
      <span class="file-type">{{ mediaType.toUpperCase() }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  },
  directorEndpoint: {
    type: String,
    required: true
  }
});

const thumbnailError = ref(false);

const thumbnailUrl = computed(() => {
  if (props.item && props.item.uid && props.directorEndpoint) {
    let endpoint = props.directorEndpoint;
    if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
      endpoint = 'http://' + endpoint;
    }
    return `${endpoint}/api/v1/thumbnail/${props.item.uid}`;
  }
  return null;
});

const mediaType = computed(() => {
  const name = props.item.name.toLowerCase();
  if (name.endsWith('.mov') || name.endsWith('.mp4') || name.endsWith('.avi') || name.endsWith('.wmv')) {
    return 'video';
  }
  return 'image';
});
</script>

<style scoped>
.media-card { 
  background: #181818; 
  border: 1px solid #2a2a2a; 
  border-radius: 6px; 
  overflow: hidden; 
  cursor: pointer; 
  transition: border-color 0.1s; 
  display: flex;
  flex-direction: column;
  height: 140px; /* Force consistent height */
}
.media-card:hover { border-color: #555555; }
.media-card.is-card-selected { border-color: #ffffff; background: #252525; }

.card-preview { 
  flex: 1; /* Take up remaining space pushing footer down */
  display: flex; 
  align-items: center; 
  justify-content: center; 
  background: #111111; 
  color: #333333; 
  border-bottom: 1px solid #2a2a2a; 
  position: relative; 
  min-height: 0; /* Important for flex children to not overflow */
}
.card-preview.image { color: #555555; }
.card-preview.video { color: #444444; }

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.selected-overlay { 
  position: absolute; 
  top: 0; 
  left: 0; 
  right: 0; 
  bottom: 0; 
  background: rgba(0, 0, 0, 0.5); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
}

.card-footer { 
  padding: 8px 10px; 
  display: flex; 
  flex-direction: column; 
  gap: 2px; 
  background: #181818; /* Ensure footer has solid background */
  flex-shrink: 0; /* Prevent footer from shrinking */
}
.media-card.is-card-selected .card-footer {
  background: #252525;
}

.file-name { 
  font-size: 12px; 
  font-weight: 500; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
  color: #dddddd; 
}
.media-card.is-card-selected .file-name { color: #ffffff; }

.file-type { 
  font-size: 10px; 
  color: #666666; 
}
</style>
