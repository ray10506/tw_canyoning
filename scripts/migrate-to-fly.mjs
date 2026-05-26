/**
 * 將本機 PocketBase 的 canyon_routes 同步到 Fly.io
 *
 * 使用方式：
 *   node scripts/migrate-to-fly.mjs <admin-email> <admin-password>
 */

const LOCAL_URL = 'http://localhost:8090'
const FLY_URL   = 'https://raych-pocketbase.fly.dev'
const COLLECTION = 'canyon_routes'

const [,, adminEmail, adminPassword] = process.argv
if (!adminEmail || !adminPassword) {
  console.error('用法：node scripts/migrate-to-fly.mjs <email> <password>')
  process.exit(1)
}

async function login(baseUrl) {
  const res = await fetch(`${baseUrl}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: adminEmail, password: adminPassword }),
  })
  const data = await res.json()
  if (!data.token) throw new Error(`登入 ${baseUrl} 失敗`)
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` }
}

async function fetchAll(baseUrl, headers) {
  const all = []
  let page = 1
  while (true) {
    const res  = await fetch(`${baseUrl}/api/collections/${COLLECTION}/records?perPage=500&page=${page}`, { headers })
    const data = await res.json()
    all.push(...(data.items ?? []))
    if (!data.totalPages || page >= data.totalPages) break
    page++
  }
  return all
}

async function main() {
  console.log('登入本機 PocketBase...')
  const localHeaders = await login(LOCAL_URL)

  console.log('登入 Fly.io PocketBase...')
  const flyHeaders = await login(FLY_URL)

  console.log('讀取本機資料...')
  const localRecords = await fetchAll(LOCAL_URL, localHeaders)
  console.log(`本機共 ${localRecords.length} 筆`)

  console.log('讀取 Fly.io 現有資料...')
  const flyRecords = await fetchAll(FLY_URL, flyHeaders)
  const flyMap = new Map(flyRecords.map(r => [r.name, r.id]))
  console.log(`Fly.io 現有 ${flyRecords.size ?? flyRecords.length} 筆`)

  // 刪除 Fly.io 有但本機沒有的記錄
  const localNames = new Set(localRecords.map(r => r.name))
  const toDelete = flyRecords.filter(r => !localNames.has(r.name))
  console.log(`需刪除 ${toDelete.length} 筆多餘記錄...`)
  let deleted = 0
  for (const rec of toDelete) {
    const res = await fetch(`${FLY_URL}/api/collections/${COLLECTION}/records/${rec.id}`, {
      method: 'DELETE', headers: flyHeaders,
    })
    if (res.ok) {
      deleted++
      if (deleted % 10 === 0) console.log(`  ... 已刪除 ${deleted} 筆`)
    } else {
      console.log(`  ✗ 刪除失敗 ${rec.name}`)
    }
  }
  console.log(`刪除完成：${deleted} 筆`)

  console.log('開始同步...')
  let created = 0, updated = 0, fail = 0

  for (const rec of localRecords) {
    const { id, collectionId, collectionName, created: _c, updated: _u, ...fields } = rec
    const existingId = flyMap.get(rec.name)
    const res = await fetch(
      existingId
        ? `${FLY_URL}/api/collections/${COLLECTION}/records/${existingId}`
        : `${FLY_URL}/api/collections/${COLLECTION}/records`,
      { method: existingId ? 'PATCH' : 'POST', headers: flyHeaders, body: JSON.stringify(fields) }
    )
    if (res.ok) {
      existingId ? updated++ : created++
      if ((created + updated) % 10 === 0) console.log(`  ... ${created + updated} 筆`)
    } else {
      const err = await res.json()
      console.log(`  ✗ ${rec.name}: ${JSON.stringify(err)}`)
      fail++
    }
  }

  console.log(`\n完成！刪除 ${deleted} 筆，新增 ${created} 筆，更新 ${updated} 筆，失敗 ${fail} 筆`)
}

main().catch(e => { console.error(e); process.exit(1) })
