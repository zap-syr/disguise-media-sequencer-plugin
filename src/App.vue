<template>
  <div class="app">
    <!-- Media Sequencer Component -->
    <MediaSequencer :directorEndpoint="directorEndpoint" />
  </div>
</template>

<script setup>
import MediaSequencer from './components/MediaSequencer.vue'

// Extract the director endpoint from the URL query parameters
const urlParams = new URLSearchParams(window.location.search)
const directorEndpoint = urlParams.get('director') || 'localhost:80' // Fallback for development
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