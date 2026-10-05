import JSZip from 'jszip'
import landMask from '../../src/data/cwa-grid-land-mask.json' with { type: 'json' }

// Public CWA product O-A0040-003 (去背景小間距日累積雨量圖); the S3 object needs no API key.
const KMZ_URL = 'https://cwaopendata.s3.ap-northeast-1.amazonaws.com/Observation/O-A0040-003.kmz'

const tag = (xml, name) => Number(xml.match(new RegExp(`<${name}>\\s*([-\\d.]+)\\s*</${name}>`))?.[1])

export async function parseRainfallKmz(buffer) {
  const zip = await JSZip.loadAsync(buffer)
  const doc = await zip.file('doc.kml')?.async('string')
  const overlay = await zip.file('0/0/0.kml')?.async('string')
  const png = await zip.file('0/0/0.png')?.async('base64')
  if (!doc || !overlay || !png) throw new Error('Unexpected KMZ layout')

  const time = doc.match(/<name>(\d{4}-\d{2}-\d{2})_(\d{2})(\d{2})_/)
  const box = overlay.match(/<LatLonBox>[\s\S]*?<\/LatLonBox>/)?.[0] ?? ''
  const [north, south, east, west] = ['north', 'south', 'east', 'west'].map(name => tag(box, name))
  if (!time || ![north, south, east, west].every(Number.isFinite) || north <= south || east <= west)
    throw new Error('Unexpected KMZ metadata')

  // The 00:00 issue is the previous day's full total (CWA labels it "D-1 00:00~D 00:00").
  const start = new Date(`${time[1]}T00:00:00Z`)
  if (time[2] === '00' && time[3] === '00') start.setUTCDate(start.getUTCDate() - 1)
  return {
    from: `${start.toISOString().slice(0, 10)}T00:00:00+08:00`,
    observedAt: `${time[1]}T${time[2]}:${time[3]}:00+08:00`,
    bounds: { north, south, east, west },
    image: `data:image/png;base64,${png}`,
  }
}

// Public CWA O-A0002-001 (all rain gauges); rolling 48 h / 72 h totals per station. No API key needed.
const STATIONS_URL = 'https://cwaopendata.s3.ap-northeast-1.amazonaws.com/Observation/O-A0002-001.json'
const STALE_MS = 3 * 3600_000

const toTaipeiIso = ms => new Date(ms + 8 * 3600_000).toISOString().slice(0, 19) + '+08:00'

/** 1.7 MB upstream → [name, lat, lon, 48h, 72h] rows; offline gauges (keep their last totals) are dropped. */
export function parseRainfallStations(json) {
  const list = json?.cwaopendata?.dataset?.Station
  if (!Array.isArray(list) || !list.length) throw new Error('Unexpected station layout')
  const rain = (station, key) => {
    const v = Number.parseFloat(station.RainfallElement?.[key]?.Precipitation)
    return Number.isFinite(v) && v >= 0 ? Math.round(v * 10) / 10 : null
  }
  const timed = list.map(station => ({ station, time: Date.parse(station.ObsTime?.DateTime ?? '') }))
  const latest = Math.max(...timed.map(item => item.time).filter(Number.isFinite))
  if (!Number.isFinite(latest)) throw new Error('No observation time')
  const stations = timed
    .filter(({ time }) => latest - time <= STALE_MS)
    .map(({ station }) => {
      const wgs = station.GeoInfo?.Coordinates?.find(c => c.CoordinateName === 'WGS84')
      return [station.StationName ?? station.StationId, Number.parseFloat(wgs?.StationLatitude), Number.parseFloat(wgs?.StationLongitude), rain(station, 'Past2days'), rain(station, 'Past3days')]
    })
    .filter(([, lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon))
  return { observedAt: toTaipeiIso(latest), stations }
}

// CWA's own daily map (O-A0040-004) is inverse-distance-weighted gauge totals on this 0.03° grid;
// CWA keeps no past days of it, so the 48 / 72 h fields are rebuilt the same way from the gauges.
const ROWS = landMask.rows.length
const COLS = landMask.rows[0].length
const STEP = landMask.step
export const GRID_BOUNDS = {
  south: landMask.south - STEP / 2, north: landMask.south + (ROWS - 1) * STEP + STEP / 2,
  west: landMask.west - STEP / 2, east: landMask.west + (COLS - 1) * STEP + STEP / 2,
}
const NEAREST = 8

/** Rows run south→north, west→east (QPF/gridToImage order); sea cells are null. */
export function interpolateRainGrid(stations, column) {
  const gauges = stations.filter(row => row[column] != null)
  if (!gauges.length) return { max: null, values: new Array(ROWS * COLS).fill(null) }
  const values = []
  for (let r = 0; r < ROWS; r++) {
    const lat = landMask.south + r * STEP
    const kmPerLon = 111.32 * Math.cos(lat * Math.PI / 180)
    for (let c = 0; c < COLS; c++) {
      if (landMask.rows[r][c] !== '1') { values.push(null); continue }
      const lon = landMask.west + c * STEP
      // Gauges within ~27 km first; the full list only when that window holds too few.
      const window = gauges.filter(g => Math.abs(g[1] - lat) < 0.25 && Math.abs(g[2] - lon) < 0.25)
      const near = (window.length >= NEAREST ? window : gauges)
        .map(g => ({ mm: g[column], d2: ((g[1] - lat) * 110.57) ** 2 + ((g[2] - lon) * kmPerLon) ** 2 }))
        .sort((a, b) => a.d2 - b.d2)
        .slice(0, NEAREST)
      let value
      if (near[0].d2 < 0.25) value = near[0].mm // gauge inside this cell: the measured value
      else {
        let sum = 0, weights = 0
        for (const { mm, d2 } of near) { sum += mm / d2; weights += 1 / d2 }
        value = sum / weights
      }
      values.push(Math.round(value * 10) / 10)
    }
  }
  return { max: Math.max(...gauges.map(g => g[column])), values }
}

async function stationsHandler(res) {
  const upstream = await fetch(STATIONS_URL, { signal: AbortSignal.timeout(15000) })
  if (!upstream.ok) return res.status(502).json({ error: 'CWA rainfall stations unavailable' })
  const { observedAt, stations } = parseRainfallStations(await upstream.json())
  // ponytail: grid is TWD67, gauges WGS84 (~0.8 km apart); under the 3 km cell, same as the QPF layer.
  const data = {
    observedAt, rows: ROWS, cols: COLS, bounds: GRID_BOUNDS,
    past48: interpolateRainGrid(stations, 3),
    past72: interpolateRainGrid(stations, 4),
  }
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200')
  res.status(200).json(data)
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    // Folded into this function (not a new file): Vercel Hobby caps deployments at 12 functions.
    if (req.query?.kind === 'stations') return await stationsHandler(res)
    const upstream = await fetch(KMZ_URL, { signal: AbortSignal.timeout(15000) })
    if (!upstream.ok) return res.status(502).json({ error: 'CWA rainfall map unavailable' })
    const data = await parseRainfallKmz(Buffer.from(await upstream.arrayBuffer()))
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200')
    res.status(200).json(data)
  } catch {
    res.status(502).json({ error: 'CWA rainfall map unavailable' })
  }
}
