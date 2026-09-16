import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import rainfallHistoryHandler from './api/cwa/rainfall-history/[stationId].js'
import nzRainfallHandler from './api/nz/rainfall/[stationId].js'
import nzRainfallHistoryHandler from './api/nz/rainfall-history/[stationId].js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      {
        name: 'local-serverless-apis',
        configureServer(server: any) {
          const mount = (prefix: string, handler: any) => server.middlewares.use(prefix, async (req: any, res: any) => {
            const url = new URL(req.url ?? '', 'http://localhost')
            const stationId = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() ?? '')
            await handler({ query: { stationId, days: url.searchParams.get('days') } }, {
              status(code: number) { res.statusCode = code; return this },
              setHeader(name: string, value: string) { res.setHeader(name, value); return this },
              json(body: unknown) {
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify(body))
              },
            })
          })

          mount('/api/cwa/rainfall-history/', rainfallHistoryHandler)
          mount('/api/nz/rainfall/', nzRainfallHandler)
          mount('/api/nz/rainfall-history/', nzRainfallHistoryHandler)
        },
      },
    ],
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
        '/api/cwa/rainfall/': {
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
