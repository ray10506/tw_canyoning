export default async function handler(req, res) {
  const { stationId } = req.query
  const apiKey = process.env.CWA_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'CWA_API_KEY not configured' })

  const url = new URL('https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0002-001')
  url.searchParams.set('Authorization', apiKey)
  url.searchParams.set('limit', '100')
  url.searchParams.set('format', 'JSON')
  url.searchParams.set('StationId', stationId)
  url.searchParams.set('RainfallElement', 'Now,Past10Min,Past1hr,Past3hr,Past6hr,Past12hr,Past24hr,Past2days,Past3days')
  url.searchParams.set('GeoInfo', 'CountyName,TownName,StationLatitude,StationLongitude')

  try {
    const upstream = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
    })
    const body = await upstream.text()
    const contentType = upstream.headers.get('Content-Type') ?? ''
    if (!contentType.includes('json')) {
      return res.status(502).json({ error: `CWA API 回傳非 JSON 內容 (HTTP ${upstream.status}): ${body.slice(0, 200)}` })
    }
    res.status(upstream.status)
      .setHeader('Content-Type', 'application/json; charset=utf-8')
      .send(body)
  } catch (err) {
    res.status(502).json({ error: String(err) })
  }
}
