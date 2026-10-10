import { ref } from 'vue';
import { getMediaList, getMediaDetails, getMappingList, getTrackList } from '../services/disguiseService';

/**
 * Media hierarchy, per-clip details, mappings and tracks loaded from Designer, with initial load and refresh.
 * onError(message): failures that do not block the plugin (Refresh, media details) are reported
 * through it, so they end in a toast instead of only the console.
 */
export function useMediaLibrary(directorEndpoint, onError = () => {}) {
  const fullHierarchy = ref([]);
  // { [clipPath]: { kind, duration, res, hasAlpha, hasAudio, ... } }. Optional enrichment:
  // a failure here must not block the plugin, cards fall back to extension-based types.
  const mediaDetails = ref({});
  const mappings = ref([]);
  const tracks = ref([]);
  const loading = ref(true);
  const error = ref(null);
  const isRefreshing = ref(false);

  async function fetchAll() {
    const [media, details, mps, trks] = await Promise.all([
      getMediaList(directorEndpoint),
      getMediaDetails(directorEndpoint).catch(err => {
        console.error('Media details unavailable:', err);
        onError(`Media details unavailable (durations, badges and missing files are not shown): ${err.message}`);
        return null;
      }),
      getMappingList(directorEndpoint),
      getTrackList(directorEndpoint)
    ]);
    if (Array.isArray(media)) fullHierarchy.value = media;
    if (details) mediaDetails.value = details;
    if (Array.isArray(mps)) mappings.value = mps;
    if (Array.isArray(trks)) tracks.value = trks;
  }

  async function load() {
    try {
      loading.value = true;
      await fetchAll();
    } catch (err) {
      error.value = `Failed to load data: ${err.message}`;
      console.error(err);
    } finally {
      loading.value = false;
    }
  }

  async function refresh() {
    if (isRefreshing.value) return;
    try {
      isRefreshing.value = true;
      await fetchAll();
    } catch (err) {
      console.error('Refresh failed:', err);
      onError(`Refresh failed: ${err.message}`);
    } finally {
      isRefreshing.value = false;
    }
  }

  function addTrack(track) {
    tracks.value.push(track);
    tracks.value.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }

  return { fullHierarchy, mediaDetails, mappings, tracks, loading, error, isRefreshing, load, refresh, addTrack };
}
