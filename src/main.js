import { createApp } from 'vue'
// Inter ships with the plugin (show networks are often offline): latin and cyrillic only
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/inter/cyrillic-400.css'
import '@fontsource/inter/cyrillic-500.css'
import '@fontsource/inter/cyrillic-600.css'
import '@fontsource/inter/cyrillic-700.css'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')
