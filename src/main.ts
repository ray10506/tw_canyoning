import { createApp } from 'vue'
import './style.css'
import { installApiMetrics } from './lib/apiMetrics'
const admin = /^\/admin\/?$/.test(location.pathname)
if (!admin) try { installApiMetrics() } catch { /* Observability must never prevent app startup. */ }
// Keep preload dependencies separate for each page in the production build.
let entry
if (admin) entry = import('./admin/AdminApp.vue')
else entry = import('./App.vue')
entry.then(({ default: App }) => createApp(App).mount('#app'))
