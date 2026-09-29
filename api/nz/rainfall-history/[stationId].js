import { nzDate, readingValue } from '../water-level/[stationId].js'
import stations from '../../../src/data/nz-rainfall-stations.json' with { type: 'json' }

const STATIONS = new Set(stations.map(s => s.station_id))

export default async function handler(req, res) {
  const stationId = String(req.query.stationId ?? '')
  const days = Number(req.query.days)
  if (!STATIONS.has(stationId)) return res.status(404).json({ error: 'Unknown NZ rainfall station' })
  if (![7, 14].includes(days)) return res.status(400).json({ error: 'days must be 7 or 14' })

  const today = new Date(`${nzDate(new Date())}T00:00:00+12:00`)
  const dates = Array.from({ length: days }, (_, index) => {
    const date = new Date(today)
    date.setUTCDate(date.getUTCDate() - days + index)
    return nzDate(date)
  })
  const url = new URL('https://envirodata.wcrc.govt.nz/dashboards/rainfall/highstock.php')
  url.searchParams.set('site', stationId)
  url.searchParams.set('type', 'Daily')
  url.searchParams.set('stdate', dates[0])
  url.searchParams.set('endate', dates[dates.length - 1])

  try {
    const upstream = await fetch(url, { headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(15000) })
    if (!upstream.ok) return res.status(502).json({ error: 'WCRC rainfall history unavailable' })
    const html = await upstream.text()
    const raw = html.match(/var data = (\{"raindata":[\s\S]*?\});/)?.[1]
    if (!raw) return res.status(404).json({ error: 'No rainfall history for station' })
    const byDate = new Map(JSON.parse(raw).raindata.map(item => {
      const value = readingValue(item.y)
      return [nzDate(new Date(item.x)), Number.isFinite(value) && value >= 0 ? value : null]
    }))
    const daily = dates.map(date => ({ date, value: byDate.has(date) ? byDate.get(date) : null }))
    const available = daily.filter(item => item.value != null)
    if (!available.length) return res.status(404).json({ error: 'No rainfall history for station' })

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
    res.status(502).json({ error: 'WCRC rainfall history unavailable' })
  }
}
