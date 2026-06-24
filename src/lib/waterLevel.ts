// Fetch hourly river water-level history from WRA HydroInfoMobile.
// In dev, requests go through the /api/wra Vite proxy (see vite.config.ts) to avoid
// browser CORS restrictions. Production builds can set VITE_WRA_API_BASE to their
// own proxy; otherwise requests fall back to the direct WRA endpoint.

export interface WaterStation {
  id: string
  name: string
  river: string
  address: string
  lat: number
  lon: number
  alert1: number | null
  alert2: number | null
  alert3: number | null
}

export interface WaterLevelPoint {
  time: string        // ISO datetime string
  value: number | null
}

export interface WaterLevelSeries {
  title: string
  points: WaterLevelPoint[]
}

const WRA_API_BASE = '/api/wra'

function getWraApiBase() {
  const configuredBase = import.meta.env.VITE_WRA_API_BASE?.trim()
  if (configuredBase) return configuredBase.replace(/\/+$/, '')
  return WRA_API_BASE
}

export async function fetchWaterLevel(stationId: string, days = 7): Promise<WaterLevelSeries> {
  const edate = new Date()
  const sdate = new Date(edate.getTime() - days * 24 * 60 * 60 * 1000)

  const params = new URLSearchParams({
    containerID: 'rtle_main_0',
    category: 'rtLE',
    stno: stationId,
    sYear: String(sdate.getFullYear()),
    sMonth: String(sdate.getMonth() + 1),
    sDay: String(sdate.getDate()),
    eYear: String(edate.getFullYear()),
    eMonth: String(edate.getMonth() + 1),
    eDay: String(edate.getDate()),
    timeframe: 'YYMMDD',
    timeType: 'hh',
    mode: '0',
    flow_cnt: '',
    searchType: '',
  })

  const res = await fetch(`${getWraApiBase()}/Chart?${params}`)
  if (!res.ok) throw new Error(`水利署 API 錯誤 (${res.status})`)
  const html = await res.text()

  const m = html.match(/<input id="chart-data"[^>]*value='([^']*)'/)
  if (!m || !m[1] || m[1] === 'null') throw new Error('查無水位資料')

  const data = JSON.parse(m[1].replace(/&amp;/g, '&'))
  const series = data.series?.[0]
  const values: (number | null)[] = series?.data ?? []
  if (!values.length) throw new Error('查無水位資料')

  const start = new Date(data.sYear, (data.sMonth ?? 1) - 1, data.sDay ?? 1, data.sHour ?? 0)
  const stepMs = data.dateFormat === 'HH' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000

  const points = values.map((value, i) => ({
    time: new Date(start.getTime() + i * stepMs).toISOString(),
    value,
  }))

  return { title: series?.title ?? '水位 (m)', points }
}
