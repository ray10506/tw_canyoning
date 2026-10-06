let stationTypes = new Map()
let stationTypesExpires = 0

async function stationType(stationId) {
  if (Date.now() >= stationTypesExpires) {
    const response = await fetch('https://codis.cwa.gov.tw/api/station_list', { signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new Error('Station list unavailable')
    const json = await response.json()
    if (json.code !== 200 || !Array.isArray(json.data)) throw new Error('Invalid station list')
    const types = new Map()
    for (const group of json.data) {
      for (const station of group.item) {
        const type = group.stationAttribute === 'auto'
          ? (station.stationID.startsWith('C1') ? 'auto_C1' : 'auto_C0')
          : group.stationAttribute
        types.set(station.stationID, type)
      }
    }
    stationTypes = types
    stationTypesExpires = Date.now() + 86400000
  }
  return stationTypes.get(stationId)
}

function taipeiIso(date) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date).replace(' ', 'T')
}

function parseRain(value) {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return null
  if (value === -9.8) return 0
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export default async function handler(req, res) {
  const stationId = String(req.query.stationId ?? '').toUpperCase()
  const days = Number(req.query.days)
  if (!/^[A-Z0-9]{4,8}$/.test(stationId)) return res.status(400).json({ error: 'Invalid station id' })
  if (![7, 14].includes(days)) return res.status(400).json({ error: 'days must be 7 or 14' })

  const now = new Date()
  const today = taipeiIso(now).slice(0, 10)
  const todayStart = new Date(`${today}T00:00:00+08:00`)
  const dates = Array.from({ length: days }, (_, index) =>
    taipeiIso(new Date(todayStart.getTime() - (days - index) * 86400000)).slice(0, 10),
  )
  const start = new Date(`${dates[0]}T00:00:00+08:00`)

  const body = new URLSearchParams({
    stn_ID: stationId,
    type: 'one_month',
    date: taipeiIso(now),
    start: taipeiIso(start),
    end: `${dates[dates.length - 1]}T23:59:59`,
    item: 'Precipitation',
  })

  try {
    // CODiS categories cannot be inferred from IDs (C2UC30 is agr; CA spans categories).
    const stnType = await stationType(stationId)
    if (!stnType) return res.status(404).json({ error: 'Station not available in CODiS' })
    body.set('stn_type', stnType)
    const upstream = await fetch('https://codis.cwa.gov.tw/api/station?', {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Referer: 'https://codis.cwa.gov.tw/StationData',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body,
      signal: AbortSignal.timeout(15000),
    })
    if (!upstream.ok || !upstream.headers.get('content-type')?.includes('json'))
      return res.status(502).json({ error: 'CWA rainfall history unavailable' })
    const json = await upstream.json()
    if (json.day?.code !== 200 || !Array.isArray(json.day.data))
      return res.status(502).json({ error: 'CWA rainfall history query failed' })

    const entries = json.day.data[0]?.dts ?? []
    const values = entries
      .map(item => ({
        date: String(item.DataDate ?? '').slice(0, 10),
        value: parseRain(item.Precipitation?.Accumulation),
      }))
      .filter(item => item.date)

    const byDate = new Map(values.map(item => [item.date, item.value]))
    const daily = dates.map(date => ({ date, value: byDate.get(date) ?? null }))
    const available = daily.filter(item => item.value != null)
    if (!available.length) return res.status(404).json({ error: json.day?.message || 'No rainfall history for station' })

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600')
    res.status(200).json({
      stationId,
      days,
      total: Math.round(available.reduce((sum, item) => sum + item.value, 0) * 10) / 10,
      unit: 'mm',
      from: dates[0],
      to: dates[dates.length - 1],
      daysIncluded: available.length,
      daily,
    })
  } catch {
    res.status(502).json({ error: 'CWA rainfall history unavailable' })
  }
}
