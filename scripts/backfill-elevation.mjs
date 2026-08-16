/**
 * Backfill elevation for all 溪降 routes that have elevation = 0.
 *
 * Priority order per route:
 *   1. GPX track   → max ele from track points (third coord)
 *   2. GPX waypoints → max ele from waypoints
 *   3. GPS coords   → OpenTopoData SRTM30m API
 *
 * Usage:
 *   node scripts/backfill-elevation.mjs
 *
 * Set PB_EMAIL / PB_PASSWORD env vars.
 */

const PB_URL      = 'https://raych-pocketbase.fly.dev'
const PB_EMAIL    = process.env.PB_EMAIL
const PB_PASSWORD = process.env.PB_PASSWORD

if (!PB_EMAIL || !PB_PASSWORD) {
  console.error('Missing required environment variables: PB_EMAIL and PB_PASSWORD')
  process.exit(1)
}

// OpenTopoData rate limit: ~1 req/s on the free tier
const API_DELAY_MS = 1200

// ── Auth ──────────────────────────────────────────────────────────────────────
const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
}).then(r => r.json())

const token = authRes.token
if (!token) { console.error('Auth failed:', authRes); process.exit(1) }
console.log('Authenticated ✓')

// ── Fetch all 溪降 routes with elevation = 0 ──────────────────────────────────
const params = new URLSearchParams({
  filter: "type = '溪降' && elevation = 0",
  fields: 'id,name,gps,gpx_track,gpx_waypoints,elevation',
  perPage: '500',
})
const listRes = await fetch(`${PB_URL}/api/collections/canyon_routes/records?${params}`, {
  headers: { Authorization: token },
}).then(r => r.json())

const routes = listRes.items ?? []
console.log(`Found ${routes.length} routes with elevation = 0\n`)

// ── Helpers ───────────────────────────────────────────────────────────────────
function maxEleFromTrack(gpx_track) {
  try {
    const parsed = JSON.parse(gpx_track)
    const isSegmented = parsed.length > 0 && Array.isArray(parsed[0][0])
    const allPts = isSegmented ? parsed.flat() : parsed
    const eles = allPts.map(p => p[2]).filter(e => e != null && !isNaN(e))
    return eles.length >= 2 ? Math.round(Math.max(...eles)) : null
  } catch { return null }
}

function maxEleFromWaypoints(gpx_waypoints) {
  try {
    const wps = JSON.parse(gpx_waypoints)
    const eles = wps.map(p => p.ele).filter(e => typeof e === 'number')
    return eles.length ? Math.round(Math.max(...eles)) : null
  } catch { return null }
}

function parseGps(gps) {
  const parts = (gps ?? '').trim().split(/[,\s]+/).map(Number)
  if (parts.length < 2) return null
  const [lat, lon] = parts
  if (!isFinite(lat) || !isFinite(lon)) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  return { lat, lon }
}

async function fetchElevationApi(lat, lon) {
  try {
    const res = await fetch(
      `https://api.opentopodata.org/v1/srtm30m?locations=${lat},${lon}`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) { console.warn(`  API ${res.status}`); return null }
    const data = await res.json()
    const ele = data?.results?.[0]?.elevation
    return typeof ele === 'number' ? Math.round(ele) : null
  } catch (e) { console.warn(`  API error: ${e.message}`); return null }
}

async function patchElevation(id, ele) {
  const res = await fetch(`${PB_URL}/api/collections/canyon_routes/records/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify({ elevation: ele }),
  })
  if (!res.ok) console.warn(`  PATCH failed: ${res.status}`)
  return res.ok
}

// ── Main loop ─────────────────────────────────────────────────────────────────
let apiCallCount = 0
let updated = 0
let skipped = 0

for (const route of routes) {
  process.stdout.write(`[${route.name}] `)

  // 1. GPX track
  if (route.gpx_track) {
    const ele = maxEleFromTrack(route.gpx_track)
    if (ele != null) {
      console.log(`track → ${ele}m`)
      if (await patchElevation(route.id, ele)) updated++
      continue
    }
  }

  // 2. GPX waypoints
  if (route.gpx_waypoints) {
    const ele = maxEleFromWaypoints(route.gpx_waypoints)
    if (ele != null) {
      console.log(`waypoints → ${ele}m`)
      if (await patchElevation(route.id, ele)) updated++
      continue
    }
  }

  // 3. OpenTopoData API
  const coord = parseGps(route.gps)
  if (!coord) { console.log('no GPS, skip'); skipped++; continue }

  await new Promise(r => setTimeout(r, API_DELAY_MS))
  apiCallCount++
  const ele = await fetchElevationApi(coord.lat, coord.lon)
  if (ele == null) { console.log('API returned null, skip'); skipped++; continue }

  console.log(`API → ${ele}m`)
  if (await patchElevation(route.id, ele)) updated++
}

console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}, API calls: ${apiCallCount}`)
