/**
 * 將 scripts/rainfall_stations.json 匯入 PocketBase rainfall_stations collection。
 * 用法：node scripts/import-rainfall-stations.mjs <admin-email> <admin-password> [pb-url]
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PB_URL = process.argv[4] ?? process.env.PB_URL ?? 'http://localhost:8090'
const [, , adminEmail, adminPassword] = process.argv

if (!adminEmail || !adminPassword) {
  console.error('用法：node scripts/import-rainfall-stations.mjs <admin-email> <admin-password> [pb-url]')
  process.exit(1)
}

const raw = JSON.parse(readFileSync(join(__dirname, 'rainfall_stations.json'), 'utf-8'))
const stations = raw.stations
  .map(s => ({
    station_id: s.StationId,
    name: s.StationName,
    county: s.CountyName,
    town: s.TownName,
    lat: parseFloat(s.Latitude),
    lon: parseFloat(s.Longitude),
    altitude: parseFloat(s.Altitude),
  }))
  .filter(s => s.station_id && Number.isFinite(s.lat) && Number.isFinite(s.lon))

console.log(`讀取 ${stations.length} 個雨量測站`)

// --- 登入 ---
const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identity: adminEmail, password: adminPassword }),
})
if (!authRes.ok) { console.error('登入失敗', await authRes.text()); process.exit(1) }
const { token } = await authRes.json()
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
console.log('登入成功')

// --- 建立 collection ---
const colRes = await fetch(`${PB_URL}/api/collections`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    name: 'rainfall_stations',
    type: 'base',
    listRule: '',
    viewRule: '',
    fields: [
      { name: 'station_id', type: 'text',   required: true },
      { name: 'name',       type: 'text',   required: true },
      { name: 'county',     type: 'text' },
      { name: 'town',       type: 'text' },
      { name: 'lat',        type: 'number', required: true },
      { name: 'lon',        type: 'number', required: true },
      { name: 'altitude',   type: 'number' },
    ],
  }),
})
if (colRes.ok) {
  console.log('建立 rainfall_stations collection 成功')
} else {
  const body = await colRes.json().catch(() => null)
  if (body?.data?.name?.code === 'validation_not_unique') {
    console.log('collection 已存在，跳過建立')
  } else {
    console.error('建立 collection 失敗', body)
    process.exit(1)
  }
}

// --- 清空舊資料 ---
console.log('清空舊資料...')
let page = 1
let deleted = 0
while (true) {
  const listRes = await fetch(`${PB_URL}/api/collections/rainfall_stations/records?perPage=200&page=${page}&fields=id`, { headers })
  if (!listRes.ok) break
  const { items } = await listRes.json()
  if (!items?.length) break
  await Promise.all(items.map(r =>
    fetch(`${PB_URL}/api/collections/rainfall_stations/records/${r.id}`, { method: 'DELETE', headers })
  ))
  deleted += items.length
  process.stdout.write(`\r刪除 ${deleted} 筆`)
}
if (deleted > 0) console.log()

// --- 匯入 ---
console.log('匯入中...')
const BATCH = 10
let done = 0
for (let i = 0; i < stations.length; i += BATCH) {
  const batch = stations.slice(i, i + BATCH)
  await Promise.all(batch.map(s =>
    fetch(`${PB_URL}/api/collections/rainfall_stations/records`, {
      method: 'POST',
      headers,
      body: JSON.stringify(s),
    })
  ))
  done += batch.length
  process.stdout.write(`\r匯入 ${done}/${stations.length}`)
}
console.log(`\n完成！共匯入 ${done} 個雨量測站`)
