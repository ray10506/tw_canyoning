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

const WRA_REALTIME_URL = 'https://opendata.wra.gov.tw/api/v2/73c4c3de-4045-4765-abeb-89f9f9cd5ff0?format=JSON'

export async function fetchWaterLevel(stationId: string): Promise<WaterLevelSeries> {
  const res = await fetch(WRA_REALTIME_URL)
  if (!res.ok) throw new Error(`水利署 API 錯誤 (${res.status})`)
  const records = await res.json()
  const record = Array.isArray(records) ? records.find(r => r.stationid === stationId) : null
  if (!record) throw new Error('查無水位資料')

  const value = Number(record.waterlevel)
  if (!Number.isFinite(value)) throw new Error('水位資料格式錯誤')

  return {
    title: '即時水位 (m)',
    points: [{ time: new Date(record.datetime).toISOString(), value }],
  }
}
