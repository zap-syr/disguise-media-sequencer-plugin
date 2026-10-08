<template>
  <div
    class="media-card"
    :class="{ 'is-card-selected': selected, 'is-list': viewMode === 'list', 'is-compact': compact }"
  >
    <div class="card-preview" :class="mediaType">
      <img v-if="thumbnailUrl && !thumbnailError" :src="thumbnailUrl" @error="thumbnailError = true" class="thumbnail-image" />
      <template v-else>
        <svg v-if="mediaType === 'image'" xmlns="http://www.w3.org/2000/svg" :width="viewMode === 'list' ? 16 : 40" :height="viewMode === 'list' ? 16 : 40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" :width="viewMode === 'list' ? 16 : 40" :height="viewMode === 'list' ? 16 : 40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect width="15" height="14" x="1" y="5" rx="2" ry="2"/></svg>
      </template>

      <div v-if="selected" class="selected-overlay"></div>
      <div v-if="showOrder && selected && viewMode !== 'list'" class="order-badge">{{ selectionOrder }}</div>
      <span v-if="viewMode !== 'list' && groupLabel" class="group-badge" :title="`In plan groups ${groupLabel}`">{{ groupLabel }}</span>
      <span v-if="viewMode !== 'list' && durationLabel" class="dur-chip" :class="{ 'is-live': kind === 'live' }">{{ durationLabel }}</span>
    </div>
    <div class="card-footer">
      <span v-if="showOrder && selected && viewMode === 'list'" class="order-pill">{{ selectionOrder }}</span>
      <span class="file-name" :title="item.subfolderPath ? `${item.name}  (in ${item.subfolderPath})` : item.name">
        {{ item.name }}
        <span v-if="item.subfolderPath" class="file-subfolder">· {{ item.subfolderPath }}</span>
      </span>
      <span v-if="viewMode === 'list' && groupLabel" class="group-pill" :title="`In plan groups ${groupLabel}`">{{ groupLabel }}</span>
      <span v-if="viewMode === 'list' && listMeta" class="list-meta">{{ listMeta }}</span>
      <span class="file-meta">
        <span v-if="compact && gridResolution" class="file-type file-res" :title="`${typeLabel} · ${gridResolution}`">{{ gridResolution }}</span>
        <span v-else class="file-type" :class="{ 'is-live': kind === 'live' }" :title="gridResolution ? `${typeLabel} · ${gridResolution}` : null">{{ typeLabel }}<span v-if="gridResolution" class="file-res"> · {{ gridResolution }}</span></span>
        <span v-if="details?.hasAlpha || details?.hasAudio" class="flags">
          <svg v-if="details.hasAlpha" class="flag" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" role="img" aria-label="Alpha channel"><title>Alpha channel</title><rect x="0.5" y="0.5" width="11" height="11" rx="1.5" fill="none" stroke="currentColor"/><rect x="1" y="1" width="5" height="5" fill="currentColor"/><rect x="6" y="6" width="5" height="5" fill="currentColor"/></svg>
          <svg v-if="details.hasAudio" class="flag" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Audio"><title>Audio</title><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>
        </span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { formatDuration } from '../../utils/format';

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
  },
  viewMode: {
    type: String,
    default: 'grid'
  },
  selectionOrder: {
    type: Number,
    default: undefined
  },
  showOrder: {
    type: Boolean,
    default: false
  },
  // "G1 · G3" when the clip is already in the Advanced plan
  groupLabel: {
    type: String,
    default: ''
  },
  // Small grid tiles: the duration chip already tells video/still/live, so the footer shows only the resolution
  compact: {
    type: Boolean,
    default: false
  },
  // Entry of getMediaDetails(): { kind, duration, res, hasAlpha, hasAudio, ... } — may be missing
  details: {
    type: Object,
    default: null
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

// 'video' | 'still' | 'live' from Designer; falls back to the file extension until details load.
const kind = computed(() => {
  if (props.details?.kind) return props.details.kind;
  const name = props.item.name.toLowerCase();
  if (name.endsWith('.mov') || name.endsWith('.mp4') || name.endsWith('.avi') || name.endsWith('.wmv')) {
    return 'video';
  }
  return 'still';
});

// Preview styling / placeholder icon
const mediaType = computed(() => (kind.value === 'still' ? 'image' : 'video'));

const TYPE_LABELS = { video: 'VIDEO', still: 'IMAGE', live: 'LIVE' };
const typeLabel = computed(() => TYPE_LABELS[kind.value]);

const durationLabel = computed(() => {
  if (!props.details) return '';
  if (kind.value === 'live') return 'LIVE';
  if (kind.value === 'still') return 'still';
  return formatDuration(props.details.duration);
});

// Grid tiles show the resolution next to the type; list rows show it in listMeta instead.
const gridResolution = computed(() => (props.viewMode !== 'list' && props.details?.res) || '');

const listMeta = computed(() => {
  if (!props.details) return '';
  const parts = [props.details.res];
  if (kind.value === 'video') parts.push(formatDuration(props.details.duration));
  return parts.filter(Boolean).join(' · ');
});
</script>

<style scoped>
.media-card {
  background: #242424;
  border: 1px solid #333333;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  display: flex;
  flex-direction: column;
  height: 100%; /* Sized by the grid's grid-auto-rows */
}
.media-card:hover { border-color: #555555; }
.media-card.no-transition { transition: none; }
.media-card.is-card-selected {
  border: 1px solid #0a84ff;
  box-shadow: 0 0 0 1px #0a84ff, 0 0 15px rgba(10, 132, 255, 0.5);
  background: #242424;
}

.media-card.is-list {
  flex-direction: row;
  align-items: center;
  height: 44px;
  flex-shrink: 0;
  border-style: solid;
  border-width: 0 0 0 3px;
  border-color: transparent;
  border-radius: 6px;
}
.media-card.is-list:hover { border-color: transparent; border-left-color: #555555; }
.media-card.is-list.is-card-selected {
  border-style: solid;
  border-width: 0 0 0 3px;
  border-color: #0a84ff;
  /* Same shadow shape as the grid-selected glow, just fully transparent —
     keeps the box-shadow layer count matched so it fades instead of
     popping when switching between grid and list view. */
  box-shadow: 0 0 0 1px rgba(10, 132, 255, 0), 0 0 15px rgba(10, 132, 255, 0);
  background: rgba(10, 132, 255, 0.10);
}

.card-preview { 
  flex: 1; /* Take up remaining space pushing footer down */
  display: flex; 
  align-items: center; 
  justify-content: center; 
  background: #151515; 
  color: #333333; 
  border-bottom: 1px solid #333333; 
  position: relative; 
  min-height: 0; /* Important for flex children to not overflow */
}
.card-preview.image { color: #555555; }
.card-preview.video { color: #444444; }

.media-card.is-list .card-preview {
  flex: none;
  width: 36px;
  height: 36px;
  margin: 4px;
  border-bottom: none;
  border-radius: 4px;
}

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
  background: rgba(10, 132, 255, 0.15); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
}

.card-footer { 
  padding: 8px 10px; 
  display: flex; 
  flex-direction: column; 
  gap: 2px; 
  background: #242424; /* Ensure footer has solid background */
  flex-shrink: 0; /* Prevent footer from shrinking */
}
.media-card.is-card-selected .card-footer {
  background: #242424;
}

.media-card.is-list .card-footer {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 10px 0 0;
  background: transparent;
  flex: 1;
  min-width: 0;
}
.media-card.is-list.is-card-selected .card-footer { background: transparent; }
.media-card.is-list .file-name { flex: 1; min-width: 0; }
.media-card.is-list .file-type { flex-shrink: 0; }

.file-name { 
  font-size: 12px; 
  font-weight: 500; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
  color: #888888; 
}
.media-card.is-card-selected .file-name { color: #ffffff; }

.file-subfolder {
  color: #666666;
  font-weight: 400;
}

.file-type {
  font-size: 10px;
  color: #666666;
}
.file-type.is-live { color: #0a84ff; font-weight: 600; }
.media-card:not(.is-list) .file-type {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.media-card.is-compact .card-footer { padding: 8px 7px; }
.media-card.is-compact .file-meta { gap: 3px; }
.file-res {
  color: #666666;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}

.file-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}
.media-card.is-list .file-meta {
  flex-shrink: 0;
  flex-direction: row-reverse;
  gap: 10px;
}

.flags {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #aaaaaa;
}
.flag { display: block; }

.list-meta {
  flex-shrink: 0;
  font-size: 11px;
  color: #666666;
  font-variant-numeric: tabular-nums;
}

.dur-chip {
  position: absolute;
  right: 6px;
  bottom: 6px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #dddddd;
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}
.dur-chip.is-live { color: #0a84ff; }

.group-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #dddddd;
  font-size: 10px;
  font-weight: 600;
  pointer-events: none;
}
.group-pill {
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 4px;
  background: #333333;
  color: #cccccc;
  font-size: 10px;
  font-weight: 600;
}

.order-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background: #ffffff;
  color: #0a84ff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

.order-pill {
  flex-shrink: 0;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: #ffffff;
  color: #0a84ff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
