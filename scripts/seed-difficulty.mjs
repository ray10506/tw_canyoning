/**
 * 使用方式：
 * node scripts/seed-difficulty.mjs <admin-email> <admin-password>
 */

const PB_URL = process.env.PB_URL ?? 'http://localhost:8090'
const [, , adminEmail, adminPassword] = process.argv

if (!adminEmail || !adminPassword) {
  console.error('用法：node scripts/seed-difficulty.mjs <admin-email> <admin-password>')
  process.exit(1)
}

const records = [
  // 繩索 (rope)
  { type: 'rope', code: 'V1', name: '入門',    sort_order: 1,  items: ['無須繩索', '無垂降', '無攀爬或下攀'] },
  { type: 'rope', code: 'V2', name: '初階',    sort_order: 2,  items: ['固定點易觸及', '垂降低於 10m', '簡單攀爬 & 下攀'] },
  { type: 'rope', code: 'V3', name: '中階',    sort_order: 3,  items: ['垂降落差 < 30m／垂降點間允許重整', '低水流垂直水線／落點於平靜水域', '手繩易架設', '攀爬難度達 5.6'] },
  { type: 'rope', code: 'V4', name: '高階',    sort_order: 4,  items: ['固定點不易觸及', '垂降落差 > 30m／手繩架設具技術性', '岩角具護繩需求／落點於動態水域', '多繩距垂降（空間大立足式架點）', '攀爬難度達 5.8 或 A0'] },
  { type: 'rope', code: 'V5', name: '頂階',    sort_order: 5,  items: ['多繩距垂降（懸掛式架點）', '具垂降渡動態水域需求', '中等至大垂直水線', '繩索回收困難或具泳渡收繩可能', '攀爬難度 5.10a 或 A1'] },
  { type: 'rope', code: 'V6', name: '高冒險',  sort_order: 6,  items: ['固定點非常難觸及', '手繩非常難架設', '大至超大水流垂直水線', '垂降渡垂直水線非常困難', '落點於動態白水和強勁水流', '攀爬難度達 5.10c 或 A2'] },
  { type: 'rope', code: 'V7', name: '極限冒險', sort_order: 7, items: ['路線能見度低且多重障礙物', '非常密集連續性瀑布無間距', '水中閉氣必要性', '落點於激流峽潭及極強勁水流', '攀爬難度 > 5.10c 或 A2'] },

  // 水域 (water)
  { type: 'water', code: 'A1', name: '入門',    sort_order: 1,  items: ['無水或平靜水域', '選擇性泳渡'] },
  { type: 'water', code: 'A2', name: '初階',    sort_order: 2,  items: ['泳渡平靜水域 < 10m', '跳水落差 < 3m', '滑瀑短且角度平緩'] },
  { type: 'water', code: 'A3', name: '中階',    sort_order: 3,  items: ['泳渡平靜水域 < 30m', '激流於部分區域', '正常跳水落差 3–5m', '滑瀑長或角度中等'] },
  { type: 'water', code: 'A4', name: '高階',    sort_order: 4,  items: ['長時間處於冰冷水域', '中等激流於部分區域', '正常跳水落差 8–10m', '困難跳水落差 5–8m', '水洞寬度 & 深度可達 1m', '大型陡峭滑瀑'] },
  { type: 'water', code: 'A5', name: '頂階',    sort_order: 5,  items: ['長時間處於冰冷水域', '激流可致使影響泳渡路線', '危險激流短時間困住泳者', '正常跳水落差 8–10m', '困難跳水落差 5–8m', '水洞寬度 & 深度可能達 2m'] },
  { type: 'water', code: 'A6', name: '高冒險',  sort_order: 6,  items: ['強勁激流難以抵達泳渡目標', '危險激流中等時間困住泳者', '正常跳水落差介於 10–14m', '困難跳水落差介於 5–8m', '水洞寬度 & 深度可能達 3m'] },
  { type: 'water', code: 'A7', name: '極限冒險', sort_order: 7, items: ['強勁激流極難抵達泳渡目標', '危險激流長時間困住泳者', '正常跳水落差 > 14m', '困難跳水落差 > 10m', '水洞寬度 & 深度達 3m', '高危險水洞超過 1m 深'] },

  // 時間 (time)
  { type: 'time', code: 'I',   name: '', sort_order: 1, items: ['能快速脫離暴漲區', '全段皆有撤退路線', '總時數約 < 2 小時'] },
  { type: 'time', code: 'II',  name: '', sort_order: 2, items: ['脫離暴漲區約 15 分鐘', '撤退需約 30 分鐘', '總時數約 2 至 4 小時'] },
  { type: 'time', code: 'III', name: '', sort_order: 3, items: ['脫離暴漲區約 30 分鐘', '撤退需約 1 小時', '總時數約 4 至 8 小時'] },
  { type: 'time', code: 'IV',  name: '', sort_order: 4, items: ['脫離暴漲區約 1 小時', '撤退需約 2 小時', '總時數約 8 小時至 1 天'] },
  { type: 'time', code: 'V',   name: '', sort_order: 5, items: ['脫離暴漲區約 2 小時', '撤退需約 4 小時', '總時數約 1 至 2 天'] },
  { type: 'time', code: 'VI',  name: '', sort_order: 6, items: ['脫離暴漲區超過 2 小時', '撤退需超過 4 小時', '總時數超過 2 天'] },

  // 星級 (star)
  { type: 'star', code: '無星',    name: '練習路線',  sort_order: 0, items: ['值得新手練習'] },
  { type: 'star', code: '★',      name: '鄉級路線',  sort_order: 1, items: [] },
  { type: 'star', code: '★★',     name: '縣級路線',  sort_order: 2, items: ['值得重覆造訪'] },
  { type: 'star', code: '★★★',    name: '國家級路線', sort_order: 3, items: ['具優良進出點', '迷人地貌', '具娛樂及挑戰性'] },
  { type: 'star', code: '★★★★★', name: '國際級路線', sort_order: 5, items: [] },
]

async function main() {
  console.log('登入中...')
  const { token } = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: adminEmail, password: adminPassword }),
  }).then(r => r.json())
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  console.log('建立 difficulty_levels collection...')
  const colRes = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'difficulty_levels',
      type: 'base',
      listRule: '',
      viewRule: '',
      fields: [
        { name: 'type',       type: 'text',   required: true },
        { name: 'code',       type: 'text',   required: true },
        { name: 'name',       type: 'text' },
        { name: 'items',      type: 'json' },
        { name: 'sort_order', type: 'number' },
      ],
    }),
  })
  if (!colRes.ok) {
    const err = await colRes.json()
    const isDuplicate = JSON.stringify(err).includes('already exists') || JSON.stringify(err).includes('not_unique')
    if (isDuplicate) console.log('collection 已存在，略過')
    else { console.error('建立失敗', JSON.stringify(err, null, 2)); process.exit(1) }
  }

  console.log(`寫入 ${records.length} 筆資料...`)
  for (const rec of records) {
    const r = await fetch(`${PB_URL}/api/collections/difficulty_levels/records`, {
      method: 'POST',
      headers,
      body: JSON.stringify(rec),
    })
    const result = await r.json()
    console.log(r.ok ? `  ✓ ${rec.code} ${rec.name}` : `  ✗ ${rec.code}: ${JSON.stringify(result)}`)
  }
  console.log('\n完成！')
}

main()
