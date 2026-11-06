<template>
  <div class="app">
    <!-- Media Sequencer Component -->
    <MediaSequencer :directorEndpoint="directorEndpoint" />
  </div>
</template>

<script setup>
import MediaSequencer from './components/MediaSequencer.vue'

// The director endpoint: ?director= from Designer; without it, the host that served the page
// (the plugin is served by the director). The Vite dev server falls back to a local Designer.
const urlParams = new URLSearchParams(window.location.search)
const directorEndpoint = urlParams.get('director')
  || (!import.meta.env.DEV && window.location.host)
  || 'localhost:80'
</script>

<style>
.app {
  height: 100%;
  display: flex;
  flex-direction: column;
}

h1 {
  padding-left: 1rem;
}
</style>