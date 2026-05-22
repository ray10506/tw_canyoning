/**
 * 使用方式：
 * node scripts/seed.mjs <admin-email> <admin-password>
 */

const PB_URL = 'http://localhost:8090'
const [, , adminEmail, adminPassword] = process.argv

if (!adminEmail || !adminPassword) {
  console.error('用法：node scripts/seed.mjs <admin-email> <admin-password>')
  process.exit(1)
}

const canyons = [
  { name: '黃金峽谷',       location: '花蓮縣秀林鄉',       lat: 24.0931657, lng: 121.5658838, difficulty: 3, type: '溯溪',    season: ['春','秋'],           description: '台灣著名溯溪景點，水質清澈，峽谷壯麗' },
  { name: '慕谷慕魚',       location: '花蓮縣秀林鄉銅門村',  lat: 24.0245,    lng: 121.5712,    difficulty: 1, type: '溯溪',    season: ['春','夏','秋'],       description: '清澈溪流穿越太魯閣峽谷，適合全家同遊' },
  { name: '銅門峽谷',       location: '花蓮縣秀林鄉',       lat: 24.0312,    lng: 121.5834,    difficulty: 2, type: '溯溪',    season: ['春','秋'],           description: '溪谷地形豐富，適合入門溯溪體驗' },
  { name: '神秘谷',         location: '花蓮縣秀林鄉',       lat: 24.1723,    lng: 121.6289,    difficulty: 2, type: '溯溪',    season: ['春','夏','秋'],       description: '短程溯溪路線，碧綠溪水搭配原始峽谷地景' },
  { name: '布拉旦溪',       location: '花蓮縣卓溪鄉',       lat: 23.5821,    lng: 121.1923,    difficulty: 4, type: '溪降',    season: ['春','秋'],           description: '深山秘境，峽谷深邃，需具備豐富溯溪經驗' },
  { name: '立霧溪支流',     location: '花蓮縣秀林鄉',       lat: 24.1523,    lng: 121.6112,    difficulty: 5, type: '溪降',    season: ['秋'],                description: '高難度路線，需嚮導帶領，峽谷景色極為壯觀' },
  { name: '清水溪峽谷',     location: '花蓮縣秀林鄉',       lat: 24.1900,    lng: 121.6500,    difficulty: 3, type: '溪降',    season: ['春','秋'],           description: '多段瀑布地形，需具備垂降技術，景色原始壯觀' },
  { name: '馬太鞍野溪溫泉', location: '花蓮縣光復鄉',       lat: 23.6731,    lng: 121.4021,    difficulty: 2, type: '野溪溫泉', season: ['春','夏','秋','冬'], description: '沿溪步行可達的野溪溫泉，溪水與溫泉交匯，景色秀麗' },
  { name: '瑞穗野溪溫泉',   location: '花蓮縣瑞穗鄉',       lat: 23.4950,    lng: 121.3700,    difficulty: 1, type: '野溪溫泉', season: ['春','夏','秋','冬'], description: '交通便利，溫泉水質優良，是花蓮最易到達的野溪溫泉之一' },
  { name: '安通野溪溫泉',   location: '花蓮縣玉里鎮',       lat: 23.3500,    lng: 121.3600,    difficulty: 2, type: '野溪溫泉', season: ['春','秋','冬'],      description: '隱藏於山谷中的碳酸氫鈉泉，需涉水前往，原始感十足' },
]

async function main() {
  // 1. Superuser 登入 (PocketBase v0.23+)
  console.log('登入中...')
  const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: adminEmail, password: adminPassword }),
  })
  if (!authRes.ok) {
    console.error('登入失敗', await authRes.text())
    process.exit(1)
  }
  const { token } = await authRes.json()
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  // 2. 建立 collection (v0.23+ 用 fields 取代 schema)
  console.log('建立 canyons collection...')
  const colRes = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'canyons',
      type: 'base',
      listRule: '',
      viewRule: '',
      fields: [
        { name: 'name',        type: 'text',   required: true },
        { name: 'location',    type: 'text' },
        { name: 'lat',         type: 'number', required: true },
        { name: 'lng',         type: 'number', required: true },
        { name: 'difficulty',  type: 'number', required: true },
        { name: 'type',        type: 'text',   required: true },
        { name: 'season',      type: 'json' },
        { name: 'description', type: 'text' },
      ],
    }),
  })
  if (!colRes.ok) {
    const err = await colRes.json()
    const isDuplicate = JSON.stringify(err).includes('already exists') || JSON.stringify(err).includes('not_unique')
    if (isDuplicate) {
      console.log('collection 已存在，略過建立')
    } else {
      console.error('建立 collection 失敗', JSON.stringify(err, null, 2))
      process.exit(1)
    }
  }

  // 3. 寫入資料
  console.log(`寫入 ${canyons.length} 筆資料...`)
  for (const canyon of canyons) {
    const r = await fetch(`${PB_URL}/api/collections/canyons/records`, {
      method: 'POST',
      headers,
      body: JSON.stringify(canyon),
    })
    const result = await r.json()
    console.log(r.ok ? `  ✓ ${canyon.name}` : `  ✗ ${canyon.name}: ${JSON.stringify(result)}`)
  }

  console.log('\n完成！')
}

main()
