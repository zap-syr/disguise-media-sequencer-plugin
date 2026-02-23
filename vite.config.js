import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { designerPythonLoader } from '@disguise-one/designer-pythonapi/vite-loader'

export default defineConfig({
  plugins: [
    vue(),
    designerPythonLoader()
  ],
  base: './',
})