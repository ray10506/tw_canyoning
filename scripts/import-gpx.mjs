// Parse a GPX file and store track + waypoints into a canyon_routes PocketBase record.
// Usage: PB_EMAIL=x PB_PASSWORD=y node scripts/import-gpx.mjs
import { readFileSync } from 'fs'

const GPX_PATH  = process.env.GPX_PATH   ?? 'D:/docker/npm/side-project/scripts/峽廊全段.gpx'
const RECORD_ID = process.env.RECORD_ID  ?? 'qo2jqvdjcj0e5pu'
const PB_URL    = process.env.PB_URL     ?? 'https://raych-pocketbase.fly.dev'
const PB_EMAIL    = process.env.PB_EMAIL
const PB_PASSWORD = process.env.PB_PASSWORD
const MAX_TRACK_PTS = 200   // downsample target

if (!PB_EMAIL || !PB_PASSWORD) {
  console.error('Error: PB_EMAIL and PB_PASSWORD env vars are required')
  process.exit(1)
}

const gpx = readFileSync(GPX_PATH, 'utf-8')

// Downsample evenly, always keep first + last point
function downsample(pts, max) {
  if (pts.length <= max) return pts
  const step = (pts.length - 1) / (max - 1)
  return Array.from({ length: max }, (_, i) => pts[Math.round(i * step)])
}

// Parse by segment so we don't draw teleportation lines between segments
// Each point is [lat, lon, ele] — ele rounded to integer metres
const rawSegments = [...gpx.matchAll(/<trkseg>(.*?)<\/trkseg>/gs)]
  .map(m => [...m[1].matchAll(/<trkpt lat="([^"]+)" lon="([^"]+)"[^>]*>(.*?)<\/trkpt>/gs)]
    .map(p => {
      const lat = parseFloat(p[1])
      const lon = parseFloat(p[2])
      const eleM = p[3].match(/<ele>([^<]+)<\/ele>/)
      const ele = eleM ? Math.round(parseFloat(eleM[1])) : null
      return ele !== null ? [lat, lon, ele] : [lat, lon]
    }))
  .filter(seg => seg.length >= 2)

const totalRaw = rawSegments.reduce((s, seg) => s + seg.length, 0)
const track = rawSegments.map(seg => {
  const segMax = Math.max(2, Math.round(MAX_TRACK_PTS * seg.length / totalRaw))
  return downsample(seg, segMax)
})

const waypoints = [...gpx.matchAll(/<wpt lat="([^"]+)" lon="([^"]+)">(.*?)<\/wpt>/gs)]
  .map(m => {
    const lat  = parseFloat(m[1])
    const lon  = parseFloat(m[2])
    const body = m[3]
    const nameM = body.match(/<name>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/name>/)
    const timeM = body.match(/<time>([^<]+)<\/time>/)
    return { lat, lon, name: nameM?.[1]?.trim() ?? '', time: timeM?.[1] ?? '' }
  })
  .sort((a, b) => a.time.localeCompare(b.time))
  .map((wp, i) => ({ ...wp, seq: i + 1 }))

const totalDownsampled = track.reduce((s, seg) => s + seg.length, 0)
console.log(`Parsed: ${rawSegments.length} segments, ${totalRaw} → downsampled to ${totalDownsampled} track points, ${waypoints.length} waypoints`)

// Auth
const { token } = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
}).then(r => r.json())

if (!token) { console.error('登入失敗'); process.exit(1) }
console.log('登入成功')

const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

// Ensure fields exist and have a high enough max
const colInfo = await fetch(`${PB_URL}/api/collections/canyon_routes`, { headers }).then(r => r.json())
const existingFields = colInfo.fields ?? []
const GPX_FIELDS = ['gpx_track', 'gpx_waypoints']
const updatedFields = existingFields.map(f =>
  GPX_FIELDS.includes(f.name) ? { ...f, max: 500000 } : f
)
const toAdd = GPX_FIELDS.filter(n => !existingFields.some(f => f.name === n))
  .map(name => ({ name, type: 'text', max: 500000 }))

if (toAdd.length || updatedFields.some((f, i) => f.max !== existingFields[i]?.max)) {
  console.log('Updating collection schema...')
  const res = await fetch(`${PB_URL}/api/collections/${colInfo.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields: [...updatedFields, ...toAdd] }),
  })
  if (!res.ok) { console.error('Schema update failed:', await res.text()); process.exit(1) }
}

// Update the record
const res = await fetch(`${PB_URL}/api/collections/canyon_routes/records/${RECORD_ID}`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({ gpx_track: JSON.stringify(track), gpx_waypoints: JSON.stringify(waypoints) }),
})

if (!res.ok) { console.error('Update failed:', await res.text()); process.exit(1) }
console.log(`Done — record ${RECORD_ID} updated.`)
