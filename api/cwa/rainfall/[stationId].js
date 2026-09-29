export default async function handler(req, res) {
  const stationId = String(req.query.stationId ?? '')
  if (!/^[A-Z0-9]{4,8}$/i.test(stationId)) return res.status(400).json({ error: 'Invalid station id' })
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
      signal: AbortSignal.timeout(15000),
    })
    // CWA answers outages with HTML; never relay that as JSON. Error text stays generic so the key-bearing URL never leaks.
    if (!upstream.ok || !upstream.headers.get('content-type')?.includes('json'))
      return res.status(502).json({ error: 'CWA rainfall service unavailable' })
    // Caching also keeps the shared CWA key well under its request quota.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    res.status(200).json(await upstream.json())
  } catch {
    res.status(502).json({ error: 'CWA rainfall service unavailable' })
  }
}
