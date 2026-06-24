export interface RainfallPoint {
  time: number
  mm: number
}

export interface RainfallData {
  stationName: string
  data24h: RainfallPoint[]
  todayTotal: number
  last3hTotal: number
}

function extractArray(text: string, varName: string): RainfallPoint[] {
  const idx = text.indexOf(`${varName} =`)
  if (idx === -1) return []
  const start = text.indexOf('[', idx)
  if (start === -1) return []
  let depth = 0, end = start
  for (; end < text.length; end++) {
    if (text[end] === '[') depth++
    else if (text[end] === ']') { if (--depth === 0) break }
  }
  try {
    const raw: [number, number | null][] = JSON.parse(text.slice(start, end + 1))
    return raw.map(([time, mm]) => ({ time, mm: mm ?? 0 }))
  } catch { return [] }
}

export async function fetchRainfallData(stationId: string): Promise<RainfallData> {
  const res = await fetch(`/api/cwa/rainfall/${stationId}?_=${Date.now()}`)
  if (!res.ok) throw new Error(`雨量 API 錯誤 (${res.status})`)
  const text = await res.text()

  const nameMatch = text.match(/ST_Name\s*=\s*["']([^"']+)["']/)
  const stationName = nameMatch?.[1] ?? stationId

  const data24h = extractArray(text, 'Rain_Data')

  const midnight = new Date()
  midnight.setHours(0, 0, 0, 0)
  const todayTotal = Math.round(
    data24h.filter(p => p.time >= midnight.getTime()).reduce((s, p) => s + p.mm, 0) * 10
  ) / 10

  const last3hTotal = Math.round(
    data24h.slice(-3).reduce((s, p) => s + p.mm, 0) * 10
  ) / 10

  return { stationName, data24h, todayTotal, last3hTotal }
}
