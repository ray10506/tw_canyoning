import { t } from './locale.ts'

export interface RainfallData {
  source?: 'cwa' | 'wcrc'
  stationName: string
  past10min: number | null
  past1hr: number | null
  past3hr: number | null
  past6hr: number | null
  past12hr: number | null
  past24hr: number | null
  past2days: number | null
  past3days: number | null
  past7days?: number | null
  updateTime?: string
  /** ISO instant of the observation, when the source gives a parseable time. */
  observedAt?: string | null
}

export interface RainfallHistoryData {
  days: 7 | 14
  total: number
  unit: string
  from: string
  to: string
  daysIncluded: number
  daily: Array<{ date: string; value: number | null }>
}

const FETCH_TIMEOUT_MS = 20000

async function jsonResponse(res: Response, label: string) {
  if (!res.headers.get('content-type')?.includes('application/json'))
    throw new Error(t(`${label}服務未正確回傳資料（${res.status}）`, `The rainfall service returned an unexpected response (${res.status})`))
  const json = await res.json()
  // Upstream error text is English/technical; show a localized sentence and keep the status for support.
  if (!res.ok) throw new Error(t(`${label}服務暫時無法提供資料（${res.status}）`, `Rainfall data is temporarily unavailable (${res.status})`))
  return json
}

export async function fetchRainfallData(stationId: string, source: 'cwa' | 'wcrc' = 'cwa'): Promise<RainfallData> {
  const res = await fetch(`/api/${source === 'wcrc' ? 'nz' : 'cwa'}/rainfall/${encodeURIComponent(stationId)}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  const json = await jsonResponse(res, '雨量')

  if (source === 'wcrc') return json

  const station = json.records?.Station?.[0]
  if (!station) throw new Error(t('氣象署目前沒有此測站的觀測，測站可能暫停。', 'CWA has no current reading for this station; it may be offline.'))

  const el = station.RainfallElement ?? {}
  const get = (key: string): number | null => {
    const v = parseFloat(el[key]?.Precipitation ?? '-1')
    return !Number.isFinite(v) || v < 0 ? null : Math.round(v * 10) / 10
  }

  const observed = new Date(station.ObsTime?.DateTime ?? '')
  const observedAt = Number.isNaN(observed.getTime()) ? null : observed.toISOString()

  return {
    stationName: station.StationName ?? stationId,
    past10min: get('Past10Min'),
    past1hr: get('Past1hr'),
    past3hr: get('Past3hr'),
    past6hr: get('Past6hr'),
    past12hr: get('Past12hr'),
    past24hr: get('Past24hr'),
    past2days: get('Past2days'),
    past3days: get('Past3days'),
    observedAt,
  }
}

export async function fetchRainfallHistory(stationId: string, days: 7 | 14, source: 'cwa' | 'wcrc' = 'cwa'): Promise<RainfallHistoryData> {
  const res = await fetch(`/api/${source === 'wcrc' ? 'nz' : 'cwa'}/rainfall-history/${encodeURIComponent(stationId)}?days=${days}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (res.status === 404) throw new Error(t(`此站最近 ${days} 日沒有可用的歷史雨量。`, `No rainfall history for this station in the last ${days} days.`))
  return jsonResponse(res, '歷史雨量')
}
