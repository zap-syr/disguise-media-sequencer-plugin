<template>
  <div class="text-layer-section">
    <h2>Text Layer Control</h2>
    <button @click="handleAddTextLayer">Add Hello World</button>
  </div>
</template>

<script setup>
import { hello_world } from '../hello_world.py'

// Extract the director endpoint from the URL query parameters
const urlParams = new URLSearchParams(window.location.search)
const directorEndpoint = urlParams.get('director') || 'localhost:80' // Fallback for development

// Initialize the Python bindings composable
const module = hello_world(directorEndpoint)

// Feedback about registration
module.registration.then((reg) => {
  console.log('Hello World module registered', reg)
}).catch((error) => {
  console.error('Error registering Hello World module:', error)
})

async function handleAddTextLayer() {
  try {
    await module.addTextLayer()
  } catch (error) {
    console.error('Error:', error)
  }
}
</script>

<style scoped>
.text-layer-section {
  margin: 1rem;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
}
</style>