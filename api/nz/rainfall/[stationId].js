const STATIONS = new Set([
  'Arthurs Pass EWS',
  'Cropp Rv @ Waterfall',
  'Haast Rv @ Moa Ck',
  'Haast Rv @ Roaring Billy',
  'Ivory Rv @ Ripplerock',
  'Tuke Rv @ Tuke Hut',
  'Waiho Rv @ Douglas Hut',
])

const SOURCE = 'https://envirodata.wcrc.govt.nz/dashboards/overview/map_rainfall.php'

function value(block, label) {
  const match = block.match(new RegExp(`<strong>${label}: <\\/strong><\\/td><td>([\\d.]+)mm`, 'i'))
  return match ? Number(match[1]) : null
}

export default async function handler(req, res) {
  const stationId = String(req.query.stationId ?? '')
  if (!STATIONS.has(stationId)) return res.status(404).json({ error: 'Unknown NZ rainfall station' })

  try {
    const upstream = await fetch(SOURCE, { headers: { Accept: 'text/html' } })
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'WCRC rainfall service unavailable' })
    const html = await upstream.text()
    const block = [...html.matchAll(/var myLatlng\d+[\s\S]*?(?=var myLatlng\d+|$)/g)]
      .map(match => match[0])
      .find(item => {
        const site = item.match(/site=([^&']+)&name=/)?.[1]
        return site && decodeURIComponent(site) === stationId
      })
    if (!block) return res.status(404).json({ error: 'No rainfall observation for station' })

    const stationName = block.match(/<h3>(.*?)<\/h3>/)?.[1]?.replace(/<[^>]+>/g, '') ?? stationId
    const updateTime = block.match(/<strong>Last Sample: <\/strong><\/td><td>(.*?)<\/td>/i)?.[1] ?? ''
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800')
    res.status(200).json({
      source: 'wcrc',
      stationName,
      past10min: null,
      past1hr: value(block, 'Last Hour'),
      past3hr: null,
      past6hr: value(block, '6 Hours'),
      past12hr: null,
      past24hr: value(block, '24 Hours'),
      past2days: null,
      past3days: null,
      past7days: value(block, '7 Days'),
      updateTime,
    })
  } catch (error) {
    res.status(502).json({ error: String(error) })
  }
}
