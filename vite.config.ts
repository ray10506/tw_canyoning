import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    watch: {
      usePolling: true
    },
    proxy: {
      // 代理水利署 HydroInfoMobile，避免瀏覽器端 CORS 限制
      '/api/wra': {
        target: 'https://gweb.wra.gov.tw',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/wra/, '/HydroInfoMobile'),
      }
    }
  }
})
