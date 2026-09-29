import stations from '../../../src/data/nz-water-stations.json' with { type: 'json' }

export const nzDate = date => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date)

/** Upstream y values mix numbers, blank strings and junk; blanks must stay NaN, never 0. */
export const readingValue = y => typeof y === 'number' || (typeof y === 'string' && y.trim()) ? Number(y) : NaN

export function nzTimestamp(value) {
  const match = value?.match(/^(\d{2})-(\d{2})-(\d{4}) (\d{1,2}):(\d{2})(am|pm)$/)
  if (!match) return null
  const [, day, month, year, hour, minute, period] = match
  if (+month < 1 || +month > 12 || +day < 1 || +day > 31 || +hour < 1 || +hour > 12 || +minute > 59) return null
  const wall = Date.UTC(+year, +month - 1, +day, +hour % 12 + (period === 'pm' ? 12 : 0), +minute)
  let instant = wall
  // Resolve Auckland's actual UTC offset, including daylight saving, at this observation.
  for (let i = 0; i < 2; i++) {
    const offset = new Intl.DateTimeFormat('en', { timeZone: 'Pacific/Auckland', timeZoneName: 'longOffset' })
      .formatToParts(new Date(instant)).find(part => part.type === 'timeZoneName').value
      .match(/GMT\+(\d{2}):(\d{2})/)
    instant = wall - (+offset[1] * 60 + +offset[2]) * 60000
  }
  return new Date(instant).toISOString()
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const station = stations.find(item => item.id === req.query.stationId)
  const days = req.query.days == null ? 1 : Number(req.query.days)
  const metric = req.query.metric ?? 'level'
  if (!station) return res.status(404).json({ error: 'Unknown WCRC station' })
  if (![1, 7, 14].includes(days) || !['level', 'flow'].includes(metric))
    return res.status(400).json({ error: 'Invalid days or metric' })
  if (metric === 'flow' && !station.hasFlow)
    return res.status(404).json({ error: 'No flow data for this station' })

  const now = Date.now()
  const from = now - days * 86400000
  const url = new URL('https://envirodata.wcrc.govt.nz/dashboards/riverlevels/highcharts_data.php')
  url.searchParams.set('site', station.id.slice(5))
  url.searchParams.set('type', metric === 'flow' ? 'Flow' : 'Level')
  url.searchParams.set('stdate', nzDate(new Date(from)))
  // The upstream end date is midnight; request tomorrow to include today's observations.
  url.searchParams.set('endate', nzDate(new Date(now + 86400000)))
  try {
    if (days === 1) {
      const upstream = await fetch('https://envirodata.wcrc.govt.nz/dashboards/overview/map_river_level.php', { signal: AbortSignal.timeout(15000) })
      if (!upstream.ok) throw new Error(`WCRC upstream ${upstream.status}`)
      const html = await upstream.text()
      const block = [...html.matchAll(/html: "(<h3>[^\n]+)"/g)].map(match => match[1])
        .find(item => decodeURIComponent(item.match(/[?&]site=([^&']+)/)?.[1] ?? '') === station.id.slice(5))
      if (!block) throw new Error('Missing WCRC station')
      const section = metric === 'flow' ? block.split('<th>River Flow</th>')[1] : block.split('<th>River Flow</th>')[0]
      const reading = section?.match(/<strong>(?:Level|Flow Rate): <\/strong><\/td><td>([^<]*)<\/td>/)?.[1]
      const numeric = reading?.match(metric === 'flow' ? /^(-?\d+(?:\.\d+)?)\s*m3\/s(?:ec)?$/ : /^(-?\d+(?:\.\d+)?)\s*m$/)
      const value = numeric ? Number(numeric[1]) : null
      const time = nzTimestamp(section?.match(/<strong>Last Sample: <\/strong><\/td><td>([^<]*)<\/td>/)?.[1])
      res.setHeader('Cache-Control', 's-maxage=300')
      return res.status(200).json({
        title: metric === 'flow' ? 'River Flow' : 'River Level',
        points: time ? [{ time, value: value != null && Number.isFinite(value) && (metric === 'level' || value >= 0) ? value : null }] : [],
      })
    }
    const upstream = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!upstream.ok) throw new Error(`WCRC upstream ${upstream.status}`)
    const data = await upstream.json()
    if (!Array.isArray(data.riversdata)) throw new Error('Invalid WCRC response')
    const expectedName = metric === 'flow' ? 'River Flow' : 'River Level'
    if (data.riversdata.some(item => item.name !== expectedName))
      throw new Error('Unexpected WCRC measurement type')
    const points = data.riversdata
      .filter(item => Number.isFinite(item.x) && item.x >= from && item.x <= now)
      .map(item => {
        const value = readingValue(item.y)
        return {
          time: new Date(item.x).toISOString(),
          value: Number.isFinite(value) && (metric === 'level' || value >= 0) ? value : null,
        }
      })
      .sort((a, b) => a.time.localeCompare(b.time))
    res.setHeader('Cache-Control', 's-maxage=300')
    return res.status(200).json({
      title: expectedName,
      points,
    })
  } catch {
    return res.status(502).json({ error: 'WCRC river data unavailable' })
  }
}
