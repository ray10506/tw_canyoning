import { withApiTiming, timedFetch } from '../../scripts/lib/api-timing.mjs'
// CWA F-C0041-001/002: 6 h QPF grids for Taiwan, only issued during land typhoon warnings.
const IDS = ['F-C0041-001', 'F-C0041-002']
const SIZE = 130
// Grid point centres per the dataset spec (TWD67); image bounds extend half a cell past them.
const GRID = { south: 20.8, north: 26.65, west: 117.56, east: 123.91 }
const HALF_LAT = (GRID.north - GRID.south) / (SIZE - 1) / 2
const HALF_LON = (GRID.east - GRID.west) / (SIZE - 1) / 2
export const QPF_BOUNDS = {
  south: GRID.south - HALF_LAT, north: GRID.north + HALF_LAT,
  west: GRID.west - HALF_LON, east: GRID.east + HALF_LON,
}

export function parseQpfWindow(json) {
  const dataset = json?.cwaopendata?.Dataset
  const info = dataset?.DatasetInfo ?? {}
  // The spec says 130 lines, but live files put all 16 900 values on one line; count values, not lines.
  const cells = String(dataset?.Contents?.Content?.ContentText ?? '').trim().split(/[\s,]+/)
  if (cells.length !== SIZE * SIZE || !info.IssueTime || !info.StartTime || !info.EndTime) throw new Error('Unexpected QPF layout')
  const values = cells.map(cell => {
    const n = Number(cell)
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : null
  })
  return { issuedAt: info.IssueTime, start: info.StartTime, end: info.EndTime, values }
}

async function handler(req, res) {
  const apiKey = process.env.CWA_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'CWA_API_KEY not configured' })
  try {
    const windows = await Promise.all(IDS.map(async id => {
      const url = `https://opendata.cwa.gov.tw/fileapi/v1/opendataapi/${id}?Authorization=${encodeURIComponent(apiKey)}&format=JSON`
      const upstream = await timedFetch(url, { signal: AbortSignal.timeout(20000) })
      if (!upstream.ok) throw new Error('upstream')
      return parseQpfWindow(await upstream.json())
    }))
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200')
    // Outside typhoon warnings CWA leaves the last issue in place; never present that as a current forecast.
    if (Date.now() >= Date.parse(windows[0].end)) return res.status(200).json({ active: false, issuedAt: windows[0].issuedAt })
    res.status(200).json({ active: true, issuedAt: windows[0].issuedAt, rows: SIZE, cols: SIZE, bounds: QPF_BOUNDS, windows })
  } catch {
    // Generic text: the upstream URL carries the API key.
    res.status(502).json({ error: 'CWA QPF grid unavailable' })
  }
}

export default withApiTiming(handler)
