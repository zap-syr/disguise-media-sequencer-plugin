import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { designerPythonLoader } from '@disguise-one/designer-pythonapi/vite-loader'

// The plugin version shown in the settings header comes from package.json (bumped per release)
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineConfig({
  plugins: [
    vue(),
    designerPythonLoader()
  ],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(version)
  }
})
