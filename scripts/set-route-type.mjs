// One-off script: ensure canyon_routes collection has a `type` field
// and set type = '溪降' on every record.
// Usage: PB_EMAIL=x PB_PASSWORD=y node scripts/set-route-type.mjs

const PB_URL      = process.env.PB_URL      ?? 'https://raych-pocketbase.fly.dev'
const PB_EMAIL    = process.env.PB_EMAIL
const PB_PASSWORD = process.env.PB_PASSWORD

if (!PB_EMAIL || !PB_PASSWORD) {
  console.error('Error: PB_EMAIL and PB_PASSWORD env vars are required')
  process.exit(1)
}

// Auth
const { token } = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
}).then(r => r.json())

if (!token) { console.error('登入失敗'); process.exit(1) }
console.log('登入成功')

const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

// Ensure `type` field exists in collection schema
const colInfo = await fetch(`${PB_URL}/api/collections/canyon_routes`, { headers }).then(r => r.json())
const existingFields = colInfo.fields ?? []
if (!existingFields.some(f => f.name === 'type')) {
  console.log('新增 type 欄位到 collection schema...')
  const res = await fetch(`${PB_URL}/api/collections/${colInfo.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields: [...existingFields, { name: 'type', type: 'text' }] }),
  })
  if (!res.ok) { console.error('Schema update failed:', await res.text()); process.exit(1) }
  console.log('Schema 更新完成')
}

// Fetch all records
const records = await fetch(
  `${PB_URL}/api/collections/canyon_routes/records?perPage=500`,
  { headers }
).then(r => r.json())

const items = records.items ?? []
console.log(`共 ${items.length} 筆資料，開始更新...`)

let ok = 0, fail = 0
for (const record of items) {
  const res = await fetch(`${PB_URL}/api/collections/canyon_routes/records/${record.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ type: '溪降' }),
  })
  if (res.ok) { ok++ } else { fail++; console.error(`失敗 ${record.id}:`, await res.text()) }
}

console.log(`完成：${ok} 筆成功，${fail} 筆失敗`)
