import JSZip from 'jszip'

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

export default async function handler(req, res) {
  try {
    const upstream = await fetch(KMZ_URL, { signal: AbortSignal.timeout(15000) })
    if (!upstream.ok) return res.status(502).json({ error: 'CWA rainfall map unavailable' })
    const data = await parseRainfallKmz(Buffer.from(await upstream.arrayBuffer()))
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200')
    res.status(200).json(data)
  } catch {
    res.status(502).json({ error: 'CWA rainfall map unavailable' })
  }
}
