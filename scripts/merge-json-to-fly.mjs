// Merges canyon_routes.json into Fly.io PocketBase canyon_routes collection.
// Matching: bidirectional substring on name field.
// Updates: region (county+town), max_drop (if empty), gps (from map_url redirect), note (ref_url).
import { readFileSync } from 'fs'
import PocketBase from 'pocketbase'

const PB_URL      = process.env.PB_URL      ?? 'https://raych-pocketbase.fly.dev'
const PB_EMAIL    = process.env.PB_EMAIL
const PB_PASSWORD = process.env.PB_PASSWORD
const JSON_PATH   = process.env.JSON_PATH   ?? 'C:/Users/User/Downloads/canyon_routes.json'

if (!PB_EMAIL || !PB_PASSWORD) {
  console.error('Error: PB_EMAIL and PB_PASSWORD env vars are required')
  process.exit(1)
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function resolveGPS(mapUrl) {
  if (!mapUrl) return null
  try {
    const res = await fetch(mapUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    })
    const url = res.url
    // @lat,lng,zoom format (most common)
    const m1 = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (m1) return `${m1[1]},${m1[2]}`
    // ?q=lat,lng
    const m2 = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (m2) return `${m2[1]},${m2[2]}`
    // ll=lat,lng
    const m3 = url.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (m3) return `${m3[1]},${m3[2]}`
    console.warn(`  [GPS?] Could not parse from final URL: ${url}`)
    return null
  } catch (e) {
    console.warn(`  [GPS!] ${mapUrl} → ${e.message}`)
    return null
  }
}

function nameMatch(pbName, jsonName) {
  const a = pbName.trim()
  const b = jsonName.trim()
  return a.includes(b) || b.includes(a)
}

async function main() {
  const jsonData = JSON.parse(readFileSync(JSON_PATH, 'utf-8'))

  const pb = new PocketBase(PB_URL)
  await pb.collection('_superusers').authWithPassword(PB_EMAIL, PB_PASSWORD)

  const allRecords = await pb.collection('canyon_routes').getFullList({ sort: 'name' })
  console.log(`PB records: ${allRecords.length}   JSON entries: ${jsonData.length}\n`)

  let matched = 0, updated = 0, noMatch = 0, gpsOk = 0, gpsFail = 0

  for (const j of jsonData) {
    const rec = allRecords.find(r => nameMatch(r.name, j.name))
    if (!rec) {
      console.log(`[NO MATCH] ${j.name}`)
      noMatch++
      continue
    }
    matched++

    const patch = {}

    // region = "county town"
    const region = [j.county, j.town].filter(Boolean).join(' ')
    if (region) patch.region = region

    // max_drop: only if PB field is empty
    const hasDrop = rec.max_drop && String(rec.max_drop).trim() !== ''
    if (!hasDrop && j.max_height_m != null) {
      patch.max_drop = `${j.max_height_m}m`
    }

    // gps: resolve from map_url redirect, only if PB gps is empty
    const hasGps = rec.gps && rec.gps.trim() !== ''
    if (!hasGps && j.map_url) {
      const gps = await resolveGPS(j.map_url)
      if (gps) { patch.gps = gps; gpsOk++ }
      else gpsFail++
      await sleep(200) // gentle pacing for Google Maps requests
    }

    // note: append ref_url if not already there
    if (j.ref_url) {
      const existing = (rec.note ?? '').trim()
      if (!existing.includes(j.ref_url)) {
        patch.note = existing ? `${existing}\n${j.ref_url}` : j.ref_url
      }
    }

    if (Object.keys(patch).length > 0) {
      await pb.collection('canyon_routes').update(rec.id, patch)
      console.log(`[OK] ${rec.name} ← ${Object.keys(patch).join(', ')}`)
      updated++
    } else {
      console.log(`[--] ${rec.name}`)
    }
  }

  console.log(`
── Summary ──────────────────────
matched  : ${matched} / ${jsonData.length}
no match : ${noMatch}
updated  : ${updated}
GPS ok   : ${gpsOk}   GPS failed: ${gpsFail}
`)
}

main().catch(console.error)
