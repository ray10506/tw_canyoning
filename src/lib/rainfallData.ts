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

export type RainfallTone = 'danger' | 'warning' | 'watch' | 'normal' | 'muted'

/** The one rainfall judgment — route status strip and station card must never disagree. */
export function rainfallStatus(rainfall: RainfallData): { tone: RainfallTone; title: string; note: string } {
  // An old reading must not produce a "low rainfall" verdict; offline gauges keep their last totals.
  if (rainfall.observedAt && Date.now() - Date.parse(rainfall.observedAt) > 3 * 3600000) return {
    tone: 'muted',
    title: t('觀測已超過 3 小時', 'Reading is over 3 hours old'),
    note: t('測站可能延遲或離線，請至官方來源確認。', 'The gauge may be delayed or offline. Check the official source.'),
  }
  if (rainfall.source === 'wcrc') return {
    tone: 'muted',
    title: t('官方雨量觀測', 'Official rainfall observation'),
    note: t('資料來自 West Coast Regional Council，進入溪谷前仍需比對路線預報。', 'West Coast Regional Council data. Compare with the route forecast before entering.'),
  }
  if (rainfall.past24hr == null || rainfall.past3hr == null || rainfall.past1hr == null || rainfall.past3days == null) return {
    tone: 'muted',
    title: t('暫無法評估雨量', 'Rainfall assessment unavailable'),
    note: t('雨量資料不足，請查閱官方觀測與預報。', 'Insufficient rainfall data. Check official observations and forecasts.'),
  }
  if (rainfall.past24hr >= 200 || rainfall.past3hr >= 100) return {
    tone: 'danger',
    title: t('已達豪雨雨量標準', 'Extremely heavy rain threshold reached'),
    note: t('請避免進入溪流，並查看官方警特報。', 'Avoid entering streams and monitor official warnings.'),
  }
  if (rainfall.past24hr >= 80 || rainfall.past1hr >= 40) return {
    tone: 'warning',
    title: t('已達大雨雨量標準', 'Heavy rain threshold reached'),
    note: t('溪流水位可能快速上升。', 'Stream levels may rise rapidly.'),
  }
  if (rainfall.past3days >= 40) return {
    tone: 'watch',
    title: t('近三日有累積降雨', 'Recent accumulated rainfall'),
    note: t('請搭配上游雨量、水位與預報判斷。', 'Check upstream rainfall, water levels and forecasts.'),
  }
  return {
    tone: 'normal',
    title: t('近期累積雨量較低', 'Lower recent rainfall'),
    note: t('集水區各處狀況仍可能不同。', 'Conditions can still differ across the catchment.'),
  }
}
