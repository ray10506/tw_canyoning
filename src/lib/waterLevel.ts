import { pb } from './pb'

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
  time: string
  value: number | null
}

export interface WaterLevelSeries {
  title: string
  points: WaterLevelPoint[]
}

export type WaterLevelDays = 7 | 14

const WRA_REALTIME_URL = 'https://opendata.wra.gov.tw/api/v2/73c4c3de-4045-4765-abeb-89f9f9cd5ff0?format=JSON'

export function parseWraDateTime(value: string): Date {
  return new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}+08:00`)
}

/** Break an ISO timestamp into Asia/Taipei y/m/d/h/min parts for display formatting. */
export function taipeiParts(iso: string): Record<string, string> {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(iso)).filter(p => p.type !== 'literal').map(p => [p.type, p.value]))
}

export type WaterTone = 'danger' | 'warning' | 'watch' | 'normal' | 'no-threshold' | 'muted'

/** Alert-level tone for a reading, shared by the detail card and the route-list dot. */
export function waterTone(station: Pick<WaterStation, 'alert1' | 'alert2' | 'alert3'>, value: number | null | undefined): WaterTone {
  if (value == null || !Number.isFinite(value) || value === -999999) return 'muted'
  if (station.alert1 == null && station.alert2 == null && station.alert3 == null) return 'no-threshold'
  if (station.alert1 != null && value >= station.alert1) return 'danger'
  if (station.alert2 != null && value >= station.alert2) return 'warning'
  if (station.alert3 != null && value >= station.alert3) return 'watch'
  return 'normal'
}

/** One WRA call already returns every station's current level — reuse it instead of fetching per station. */
export async function fetchAllWaterLevels(): Promise<Map<string, number>> {
  const res = await fetch(WRA_REALTIME_URL)
  if (!res.ok) throw new Error(`水利署 API 錯誤 (${res.status})`)
  const records = await res.json()
  const levels = new Map<string, number>()
  for (const record of Array.isArray(records) ? records : []) {
    const value = parseWaterLevel(record.waterlevel)
    if (value != null) levels.set(record.stationid, value)
  }
  return levels
}

function parseWaterLevel(raw: unknown): number | null {
  if (raw == null || (typeof raw === 'string' && !raw.trim())) return null
  const value = Number(raw)
  return Number.isFinite(value) && value !== -999999 ? value : null
}

export async function fetchWaterLevel(stationId: string): Promise<WaterLevelSeries> {
  const res = await fetch(WRA_REALTIME_URL)
  if (!res.ok) throw new Error(`水利署 API 錯誤 (${res.status})`)
  const records = await res.json()
  const record = Array.isArray(records) ? records.find(r => r.stationid === stationId) : null
  if (!record) throw new Error('查無水位資料')

  const value = parseWaterLevel(record.waterlevel)
  if (value == null) throw new Error('水位資料格式錯誤')

  return {
    title: '即時水位 (m)',
    points: [{ time: parseWraDateTime(record.datetime).toISOString(), value }],
  }
}

export async function fetchWaterLevelHistory(stationId: string, days: WaterLevelDays): Promise<WaterLevelSeries> {
  const from = new Date(Date.now() - days * 86400000).toISOString()
  const records = await pb.collection('water_level_observations').getFullList({
    sort: 'observed_at',
    filter: pb.filter('station_id = {:station} && observed_at >= {:from}', { station: stationId, from }),
    fields: 'observed_at,level_m',
  })
  return {
    title: days === 7 ? '近 7 天水位 (m)' : '近 14 天水位 (m)',
    points: records.map(record => ({ time: record.observed_at, value: Number(record.level_m) })),
  }
}
