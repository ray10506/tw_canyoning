export type RouteType = '溯溪' | '溪降' | '野溪溫泉'

export interface Canyon {
  id: number
  name: string
  location: string
  coordinates: [number, number]  // [lat, lng]
  difficulty: 1 | 2 | 3 | 4 | 5
  season: string[]
  description: string
  type: RouteType
  image?: string
}

export const canyons: Canyon[] = [
  // 溯溪
  {
    id: 1,
    name: '黃金峽谷',
    location: '花蓮縣秀林鄉',
    coordinates: [24.0931657, 121.5658838],
    difficulty: 3,
    season: ['春', '秋'],
    description: '台灣著名溯溪景點，水質清澈，峽谷壯麗',
    type: '溯溪'
  },
  {
    id: 2,
    name: '慕谷慕魚',
    location: '花蓮縣秀林鄉銅門村',
    coordinates: [24.0245, 121.5712],
    difficulty: 1,
    season: ['春', '夏', '秋'],
    description: '清澈溪流穿越太魯閣峽谷，適合全家同遊',
    type: '溯溪'
  },
  {
    id: 3,
    name: '銅門峽谷',
    location: '花蓮縣秀林鄉',
    coordinates: [24.0312, 121.5834],
    difficulty: 2,
    season: ['春', '秋'],
    description: '溪谷地形豐富，適合入門溯溪體驗',
    type: '溯溪'
  },
  {
    id: 9,
    name: '神秘谷',
    location: '花蓮縣秀林鄉',
    coordinates: [24.1723, 121.6289],
    difficulty: 2,
    season: ['春', '夏', '秋'],
    description: '短程溯溪路線，碧綠溪水搭配原始峽谷地景',
    type: '溯溪'
  },
  // 溪降
  {
    id: 4,
    name: '布拉旦溪',
    location: '花蓮縣卓溪鄉',
    coordinates: [23.5821, 121.1923],
    difficulty: 4,
    season: ['春', '秋'],
    description: '深山秘境，峽谷深邃，需具備豐富溯溪經驗',
    type: '溪降'
  },
  {
    id: 6,
    name: '立霧溪支流',
    location: '花蓮縣秀林鄉',
    coordinates: [24.1523, 121.6112],
    difficulty: 5,
    season: ['秋'],
    description: '高難度路線，需嚮導帶領，峽谷景色極為壯觀',
    type: '溪降'
  },
  {
    id: 10,
    name: '清水溪峽谷',
    location: '花蓮縣秀林鄉',
    coordinates: [24.1900, 121.6500],
    difficulty: 3,
    season: ['春', '秋'],
    description: '多段瀑布地形，需具備垂降技術，景色原始壯觀',
    type: '溪降'
  },
  // 野溪溫泉
  {
    id: 5,
    name: '馬太鞍野溪溫泉',
    location: '花蓮縣光復鄉',
    coordinates: [23.6731, 121.4021],
    difficulty: 2,
    season: ['春', '夏', '秋', '冬'],
    description: '沿溪步行可達的野溪溫泉，溪水與溫泉交匯，景色秀麗',
    type: '野溪溫泉'
  },
  {
    id: 7,
    name: '瑞穗野溪溫泉',
    location: '花蓮縣瑞穗鄉',
    coordinates: [23.4950, 121.3700],
    difficulty: 1,
    season: ['春', '夏', '秋', '冬'],
    description: '交通便利，溫泉水質優良，是花蓮最易到達的野溪溫泉之一',
    type: '野溪溫泉'
  },
  {
    id: 8,
    name: '安通野溪溫泉',
    location: '花蓮縣玉里鎮',
    coordinates: [23.3500, 121.3600],
    difficulty: 2,
    season: ['春', '秋', '冬'],
    description: '隱藏於山谷中的碳酸氫鈉泉，需涉水前往，原始感十足',
    type: '野溪溫泉'
  },
]
