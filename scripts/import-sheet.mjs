/**
 * 從 Google Sheets 匯入溪降路線資料到 PocketBase
 *
 * 使用方式：
 *
 *   方案 A — 本地 CSV 檔（從 Google Sheet 手動下載後放到 scripts/routes.csv）：
 *     node scripts/import-sheet.mjs <email> <password> --file
 *
 *   方案 B — 指定公開 CSV 網址（Google Sheet 發布到網路後取得）：
 *     node scripts/import-sheet.mjs <email> <password> --url <csv-url>
 */

import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PB_URL    = process.env.PB_URL ?? 'http://localhost:8090'

const args         = process.argv.slice(2)
const adminEmail   = args[0]
const adminPassword = args[1]
const mode         = args[2]          // '--file' 或 '--url'
const csvUrl       = args[3]          // mode 為 --url 時使用
const LOCAL_CSV    = join(__dirname, 'routes.csv')

if (!adminEmail || !adminPassword || !mode) {
  console.error([
    '用法：',
    '  本地 CSV：node scripts/import-sheet.mjs <email> <password> --file',
    '  遠端 URL：node scripts/import-sheet.mjs <email> <password> --url <csv-url>',
  ].join('\n'))
  process.exit(1)
}

// ── CSV 解析（支援帶引號的多行欄位）─────────────────────────────────────
function parseCSV(text) {
  const rows = []
  let row = [], field = '', inQuote = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (inQuote && text[i + 1] === '"') { field += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      row.push(field.trim()); field = ''
    } else if ((ch === '\n' || ch === '\r') && !inQuote) {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field.trim()); field = ''
      if (row.some(f => f !== '')) rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  if (field || row.length) { row.push(field.trim()); if (row.some(f => f !== '')) rows.push(row) }
  return rows
}

// ── 找到真正的欄位標題行（包含 Region 或 鄉鎮）──────────────────────────
function findHeaderRow(rows) {
  for (let i = 0; i < rows.length; i++) {
    const joined = rows[i].join('|')
    if (joined.includes('Region') || joined.includes('鄉鎮')) return i
  }
  return -1
}

// ── 主流程 ────────────────────────────────────────────────────────────────
async function main() {
  // 1. 登入
  console.log('登入中...')
  const { token } = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: adminEmail, password: adminPassword }),
  }).then(r => r.json())
  if (!token) { console.error('登入失敗'); process.exit(1) }
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  // 2. 建立 collection
  console.log('建立 canyon_routes collection...')
  const colRes = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST', headers,
    body: JSON.stringify({
      name: 'canyon_routes',
      type: 'base',
      listRule: '', viewRule: '',
      fields: [
        { name: 'region',     type: 'text' },
        { name: 'name',       type: 'text', required: true },
        { name: 'grading',    type: 'text' },
        { name: 'max_drop',   type: 'text' },
        { name: 'approach',   type: 'text' },
        { name: 'total_time', type: 'text' },
        { name: 'gps',        type: 'text' },
        { name: 'note',       type: 'text' },
        { name: 'deep_pool',  type: 'text' },
        { name: 'ab_shuttle', type: 'text' },
      ],
    }),
  })
  if (!colRes.ok) {
    const err = await colRes.json()
    const isDup = JSON.stringify(err).includes('already exists') || JSON.stringify(err).includes('not_unique') || JSON.stringify(err).includes('name_exists') || JSON.stringify(err).includes('unique')
    isDup ? console.log('collection 已存在，略過') : (console.error('建立失敗', err), process.exit(1))
  }

  // 2b. 確保 max_drop 欄位存在（相容舊版 schema 含 max_rappel 的資料庫）
  const colInfoRes = await fetch(`${PB_URL}/api/collections/canyon_routes`, { headers })
  const colInfo = await colInfoRes.json()
  const existingFields = colInfo.fields ?? []
  const missingFields = ['max_drop', 'gps', 'note', 'deep_pool', 'ab_shuttle'].filter(
    n => !existingFields.some(f => f.name === n)
  )
  if (missingFields.length > 0) {
    console.log(`偵測到舊 schema，新增欄位：${missingFields.join(', ')}...`)
    const additions = missingFields.map(name => ({ name, type: 'text' }))
    await fetch(`${PB_URL}/api/collections/${colInfo.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields: [...existingFields, ...additions] }),
    })
  }

  // 3. 取得 CSV
  let csvText
  if (mode === '--file') {
    if (!existsSync(LOCAL_CSV)) {
      console.error(`找不到 ${LOCAL_CSV}，請先從 Google Sheet 下載 CSV 並放到該路徑`)
      process.exit(1)
    }
    console.log(`讀取本地 CSV：${LOCAL_CSV}`)
    csvText = readFileSync(LOCAL_CSV, 'utf-8')
  } else if (mode === '--url') {
    if (!csvUrl) { console.error('請提供 CSV 網址'); process.exit(1) }
    console.log(`下載 CSV：${csvUrl}`)
    csvText = await fetch(csvUrl).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.text()
    })
  } else {
    console.error('未知模式，請用 --file 或 --url')
    process.exit(1)
  }

  // 4. 解析
  const rows = parseCSV(csvText)
  const headerIdx = findHeaderRow(rows)
  if (headerIdx === -1) { console.error('找不到標題行'); process.exit(1) }

  const headers2 = rows[headerIdx]
  const col = (name) => headers2.findIndex(h => h.includes(name))

  // 欄位 index（中英文欄位名稱都找）
  const I = {
    region:     col('Region')   !== -1 ? col('Region')   : col('鄉鎮'),
    name:       col('Name')     !== -1 ? col('Name')     : col('溪流'),
    grading:    col('Grading')  !== -1 ? col('Grading')  : col('分級'),
    maxDrop:    col('Drop') !== -1 ? col('Drop') : col('最高落差') !== -1 ? col('最高落差') : col('最短繩長'),
    approach:   col('Approach') !== -1 ? col('Approach') : col('接近'),
    totalTime:  col('Total')    !== -1 ? col('Total')    : col('全部時間'),
    deepPool:   col('深潭')     !== -1 ? col('深潭')     : col('Deep Pool'),
    abShuttle:  col('AB車')    !== -1 ? col('AB車')    : col('AB Shuttle'),
  }

  // 5. 寫入
  const dataRows = rows.slice(headerIdx + 1).filter(r => r[I.name]?.trim().length > 0)
  console.log(`找到 ${dataRows.length} 筆資料，讀取現有資料...`)

  // 讀取現有記錄（分頁直到全部取完），建立 name -> id 對應表（用於 upsert）
  const existingMap = new Map()
  let page = 1
  while (true) {
    const res = await fetch(`${PB_URL}/api/collections/canyon_routes/records?perPage=500&page=${page}`, { headers })
    const data = await res.json()
    for (const r of (data.items ?? [])) existingMap.set(r.name, r.id)
    if (!data.totalPages || page >= data.totalPages) break
    page++
  }
  console.log(`現有 ${existingMap.size} 筆，開始寫入...`)

  let created = 0, updated = 0, fail = 0
  for (const row of dataRows) {
    const record = {
      region:     row[I.region]    ?? '',
      name:       row[I.name]      ?? '',
      grading:    row[I.grading]   ?? '',
      max_drop:   row[I.maxDrop]   ?? '',
      approach:   row[I.approach]  ?? '',
      total_time: row[I.totalTime] ?? '',
      deep_pool:  I.deepPool  !== -1 ? (row[I.deepPool]  ?? '') : '',
      ab_shuttle: I.abShuttle !== -1 ? (row[I.abShuttle] ?? '') : '',
    }

    const existingId = existingMap.get(record.name)
    const r = await fetch(
      existingId
        ? `${PB_URL}/api/collections/canyon_routes/records/${existingId}`
        : `${PB_URL}/api/collections/canyon_routes/records`,
      { method: existingId ? 'PATCH' : 'POST', headers, body: JSON.stringify(record) }
    )
    if (r.ok) {
      existingId ? updated++ : created++
      if ((created + updated) % 10 === 0) console.log(`  ... ${created + updated} 筆已處理`)
    } else {
      const err = await r.json()
      console.log(`  ✗ ${record.region} ${record.name}: ${JSON.stringify(err)}`)
      fail++
    }
  }

  console.log(`\n完成！新增 ${created} 筆，更新 ${updated} 筆，失敗 ${fail} 筆`)
  if (fail === 0) console.log('全部處理成功 ✓')
}

main().catch(e => { console.error(e); process.exit(1) })
