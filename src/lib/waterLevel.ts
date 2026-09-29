import { pb } from './pb'
import { t } from './locale'
import rawNzStations from '../data/nz-water-stations.json'

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
  source?: 'wra' | 'wcrc'
  hasFlow?: boolean
}

export const nzWaterStations = rawNzStations as WaterStation[]
export type WaterMetric = 'level' | 'flow'

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
const FETCH_TIMEOUT_MS = 20000

async function fetchWraRecords(): Promise<any[]> {
  const res = await fetch(WRA_REALTIME_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!res.ok) throw new Error(t(`水利署服務暫時無法回應（${res.status}）`, `WRA service is not responding (${res.status})`))
  const records = await res.json()
  return Array.isArray(records) ? records : []
}

export function parseWraDateTime(value: string): Date {
  return new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}+08:00`)
}

/** Break an ISO timestamp into Asia/Taipei y/m/d/h/min parts for display formatting. */
export function taipeiParts(iso: string, timeZone = 'Asia/Taipei'): Record<string, string> {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
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
  const levels = new Map<string, number>()
  for (const record of await fetchWraRecords()) {
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

async function fetchNzWater(stationId: string, days: number, metric: WaterMetric): Promise<WaterLevelSeries> {
  const res = await fetch(`/api/nz/water-level/${encodeURIComponent(stationId)}?days=${days}&metric=${metric}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!res.ok) throw new Error(res.status === 404
    ? t('WCRC 未提供此測站的這項觀測。', 'WCRC does not publish this measurement for the station.')
    : t(`WCRC 水文服務暫時無法回應（${res.status}）`, `WCRC river data is not responding (${res.status})`))
  return res.json()
}

export async function fetchWaterLevel(stationId: string, metric: WaterMetric = 'level'): Promise<WaterLevelSeries> {
  if (stationId.startsWith('wcrc:')) return fetchNzWater(stationId, 1, metric)
  const record = (await fetchWraRecords()).find(r => r.stationid === stationId)
  if (!record) throw new Error(t('水利署即時資料中沒有此測站，測站可能暫停觀測。', 'This station is missing from the WRA live feed; it may be offline.'))

  const time = parseWraDateTime(String(record.datetime ?? ''))
  if (Number.isNaN(time.getTime())) throw new Error(t('水利署資料缺少觀測時間。', 'The WRA reading has no valid observation time.'))
  // Missing/sentinel readings stay null so the card says "no valid reading" instead of showing 0.
  return {
    title: '即時水位 (m)',
    points: [{ time: time.toISOString(), value: parseWaterLevel(record.waterlevel) }],
  }
}

export async function fetchWaterLevelHistory(stationId: string, days: WaterLevelDays, metric: WaterMetric = 'level'): Promise<WaterLevelSeries> {
  if (stationId.startsWith('wcrc:')) return fetchNzWater(stationId, days, metric)
  const from = new Date(Date.now() - days * 86400000).toISOString()
  const records = await pb.collection('water_level_observations').getFullList({
    sort: 'observed_at',
    filter: pb.filter('station_id = {:station} && observed_at >= {:from}', { station: stationId, from }),
    fields: 'observed_at,level_m',
  })
  return {
    title: days === 7 ? '近 7 天水位 (m)' : '近 14 天水位 (m)',
    points: records.map(record => ({ time: record.observed_at, value: parseWaterLevel(record.level_m) })),
  }
}
