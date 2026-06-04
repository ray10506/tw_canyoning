// Parse a KMZ file and store track + waypoints into a canyon_routes PocketBase record.
// Usage: RECORD_ID=xxx PB_EMAIL=x PB_PASSWORD=y node scripts/import-kmz.mjs path/to/file.kmz
import { readFileSync } from 'fs'
import JSZip from 'jszip'

const KMZ_PATH  = process.argv[2]
const RECORD_ID = process.env.RECORD_ID
const PB_URL    = process.env.PB_URL     ?? 'https://raych-pocketbase.fly.dev'
const PB_EMAIL    = process.env.PB_EMAIL
const PB_PASSWORD = process.env.PB_PASSWORD
const MAX_TRACK_PTS = 200

if (!KMZ_PATH || !RECORD_ID || !PB_EMAIL || !PB_PASSWORD) {
  console.error('Usage: RECORD_ID=xxx PB_EMAIL=x PB_PASSWORD=y node scripts/import-kmz.mjs path/to/file.kmz')
  process.exit(1)
}

function downsample(pts, max) {
  if (pts.length <= max) return pts
  const step = (pts.length - 1) / (max - 1)
  return Array.from({ length: max }, (_, i) => pts[Math.round(i * step)])
}

// Unzip KMZ → get KML text
const kmzBuf = readFileSync(KMZ_PATH)
const zip = await JSZip.loadAsync(kmzBuf)
const kmlFile = Object.values(zip.files).find(f => f.name.endsWith('.kml'))
if (!kmlFile) { console.error('No .kml found inside KMZ'); process.exit(1) }
const kml = await kmlFile.async('text')

// Parse <Placemark> entries: tracks (LineString/gx:Track) and waypoints (Point)
const track = []
const waypoints = []

// ── LineString tracks ─────────────────────────────────────────────────────
for (const m of kml.matchAll(/<LineString[^>]*>(.*?)<\/LineString>/gs)) {
  const coordsM = m[1].match(/<coordinates>(.*?)<\/coordinates>/s)
  if (!coordsM) continue
  const pts = coordsM[1].trim().split(/\s+/)
    .map(c => {
      const [lon, lat, alt] = c.split(',').map(Number)
      if (isNaN(lat) || isNaN(lon)) return null
      return alt != null && !isNaN(alt) ? [lat, lon, Math.round(alt)] : [lat, lon]
    })
    .filter(Boolean)
  if (pts.length >= 2) track.push(pts)
}

// ── gx:Track (Google Earth extension) ────────────────────────────────────
for (const m of kml.matchAll(/<gx:Track[^>]*>(.*?)<\/gx:Track>/gs)) {
  const coords = [...m[1].matchAll(/<gx:coord>([^<]+)<\/gx:coord>/g)]
    .map(c => {
      const [lon, lat, alt] = c[1].trim().split(/\s+/).map(Number)
      if (isNaN(lat) || isNaN(lon)) return null
      return alt != null && !isNaN(alt) ? [lat, lon, Math.round(alt)] : [lat, lon]
    })
    .filter(Boolean)
  if (coords.length >= 2) track.push(coords)
}

// Downsample each segment proportionally
const totalRaw = track.reduce((s, seg) => s + seg.length, 0)
const sampledTrack = track.map(seg => {
  const segMax = Math.max(2, Math.round(MAX_TRACK_PTS * seg.length / totalRaw))
  return downsample(seg, segMax)
})

// ── Point waypoints ───────────────────────────────────────────────────────
let seq = 1
for (const m of kml.matchAll(/<Placemark[^>]*>(.*?)<\/Placemark>/gs)) {
  const body = m[1]
  if (!body.includes('<Point>') && !body.includes('<Point ')) continue
  const coordsM = body.match(/<coordinates>\s*([^<]+)\s*<\/coordinates>/)
  if (!coordsM) continue
  const [lon, lat] = coordsM[1].trim().split(',').map(Number)
  if (isNaN(lat) || isNaN(lon)) continue
  const nameM = body.match(/<name>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/name>/s)
  waypoints.push({ lat, lon, name: nameM?.[1]?.trim() ?? '', seq: seq++ })
}

const totalDown = sampledTrack.reduce((s, seg) => s + seg.length, 0)
console.log(`Parsed: ${sampledTrack.length} track segments, ${totalRaw} → ${totalDown} points, ${waypoints.length} waypoints`)

// Auth
const { token } = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
}).then(r => r.json())
if (!token) { console.error('登入失敗'); process.exit(1) }
console.log('登入成功')

const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

// Ensure gpx_track / gpx_waypoints fields exist with sufficient size
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
    method: 'PATCH', headers,
    body: JSON.stringify({ fields: [...updatedFields, ...toAdd] }),
  })
  if (!res.ok) { console.error('Schema update failed:', await res.text()); process.exit(1) }
}

// Update record
const res = await fetch(`${PB_URL}/api/collections/canyon_routes/records/${RECORD_ID}`, {
  method: 'PATCH', headers,
  body: JSON.stringify({ gpx_track: JSON.stringify(sampledTrack), gpx_waypoints: JSON.stringify(waypoints) }),
})
if (!res.ok) { console.error('Update failed:', await res.text()); process.exit(1) }
console.log(`Done — record ${RECORD_ID} updated.`)
