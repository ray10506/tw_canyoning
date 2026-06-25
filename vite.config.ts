import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue()],
    server: {
      host: '0.0.0.0',
      port: 5174,
      watch: {
        usePolling: true
      },
      proxy: {
        '/api/wra': {
          target: 'https://gweb.wra.gov.tw',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/wra/, '/HydroInfoMobile'),
        },
        '/api/cwa/rainfall': {
          target: 'https://opendata.cwa.gov.tw',
          changeOrigin: true,
          rewrite: (path) => {
            const stationId = path.replace(/^\/api\/cwa\/rainfall\//, '').split('?')[0]
            const key = env.CWA_API_KEY ?? ''
            return `/api/v1/rest/datastore/O-A0002-001?Authorization=${key}&limit=100&format=JSON&StationId=${stationId}&RainfallElement=Now,Past10Min,Past1hr,Past3hr,Past6hr,Past12hr,Past24hr,Past2days,Past3days&GeoInfo=CountyName,TownName,StationLatitude,StationLongitude`
          },
        }
      }
    }
  }
})
