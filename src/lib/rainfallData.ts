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
  updateTime: string
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

async function jsonResponse(res: Response, label: string) {
  if (!res.headers.get('content-type')?.includes('application/json'))
    throw new Error(`${label}服務未正確回傳資料`)
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `${label} API 錯誤 (${res.status})`)
  return json
}

export async function fetchRainfallData(stationId: string, source: 'cwa' | 'wcrc' = 'cwa'): Promise<RainfallData> {
  const res = await fetch(`/api/${source === 'wcrc' ? 'nz' : 'cwa'}/rainfall/${encodeURIComponent(stationId)}`)
  const json = await jsonResponse(res, '雨量')

  if (source === 'wcrc') return json

  const station = json.records?.Station?.[0]
  if (!station) throw new Error('查無雨量資料')

  const el = station.RainfallElement ?? {}
  const get = (key: string): number | null => {
    const v = parseFloat(el[key]?.Precipitation ?? '-1')
    return !Number.isFinite(v) || v < 0 ? null : Math.round(v * 10) / 10
  }

  const rawTime = station.ObsTime?.DateTime ?? ''
  const updateTime = rawTime
    ? new Date(rawTime).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
    : ''

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
    updateTime,
  }
}

export async function fetchRainfallHistory(stationId: string, days: 7 | 14, source: 'cwa' | 'wcrc' = 'cwa'): Promise<RainfallHistoryData> {
  const res = await fetch(`/api/${source === 'wcrc' ? 'nz' : 'cwa'}/rainfall-history/${encodeURIComponent(stationId)}?days=${days}`)
  if (res.status === 404) throw new Error('此站暫無歷史雨量資料')
  return jsonResponse(res, '歷史雨量')
}
