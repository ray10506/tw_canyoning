import { createApp } from 'vue'
import './style.css'
import { installApiMetrics } from './lib/apiMetrics'
const admin = /^\/admin\/?$/.test(location.pathname)
if (!admin) try { installApiMetrics() } catch { /* Observability must never prevent app startup. */ }
const entry = admin ? import('./admin/AdminApp.vue') : import('./App.vue')
entry.then(({ default: App }) => createApp(App).mount('#app'))
