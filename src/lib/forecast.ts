import { locale } from './locale.ts'

export type ForecastDay = {
  date: string
  code: number | null
  max: number | null
  min: number | null
  rain: number | null
  gust: number | null
}

function finiteNumber(value: unknown) {
  return Number.isFinite(value) ? Number(value) : null
}

// Share in-flight requests per coordinate between the route header and weather tab.
// Evict settled requests so later visits and retries fetch a fresh forecast.
const cache = new Map<string, Promise<ForecastDay[]>>()

export function fetchForecast(gps: string): Promise<ForecastDay[]> {
  const [latitude, longitude] = gps.split(',').map(Number)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return Promise.reject(new Error('invalid gps'))
  const key = `${latitude},${longitude}`
  const hit = cache.get(key)
  if (hit) return hit
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_gusts_10m_max',
    forecast_days: '5',
    timezone: 'auto',
  })
  const request = fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
    .then(async (response) => {
      if (!response.ok) throw new Error()
      const { daily } = await response.json()
      if (!Array.isArray(daily?.time)) throw new Error()
      return daily.time.slice(0, 5).map((date: string, index: number) => ({
        date,
        code: finiteNumber(daily.weather_code?.[index]),
        max: finiteNumber(daily.temperature_2m_max?.[index]),
        min: finiteNumber(daily.temperature_2m_min?.[index]),
        rain: finiteNumber(daily.precipitation_sum?.[index]),
        gust: finiteNumber(daily.wind_gusts_10m_max?.[index]),
      }))
    })
    .finally(() => {
      cache.delete(key)
    })
  cache.set(key, request)
  return request
}

// WMO weather codes, grouped by upper bound of each range (Open-Meteo `weather_code`).
const WEATHER_LABELS: [max: number, en: string, zh: string][] = [
  [0, 'Clear', '晴朗'],
  [3, 'Cloudy', '多雲'],
  [48, 'Fog', '有霧'],
  [57, 'Drizzle', '毛毛雨'],
  [67, 'Rain', '下雨'],
  [77, 'Snow', '下雪'],
  [82, 'Showers', '陣雨'],
  [86, 'Snow showers', '陣雪'],
  [Infinity, 'Thunderstorms', '雷雨'],
]
export function weatherLabel(code: number | null) {
  if (code == null) return '—'
  const [, en, zh] = WEATHER_LABELS.find(([max]) => code <= max) ?? WEATHER_LABELS[WEATHER_LABELS.length - 1]
  return locale.value === 'en' ? en : zh
}

// Heavy forecast rain soon, as a plain fact under the observation strip (which stays observation-only).
export function forecastRainNote(days: ForecastDay[]): string {
  const wet = days.slice(0, 3).filter(day => (day.rain ?? 0) >= 10)
  if (!wet.length) return ''
  const en = locale.value === 'en'
  const items = wet.map(day => {
    const [, m, d] = day.date.split('-').map(Number)
    return `${m}/${d} ${weatherLabel(day.code)} ${Number(day.rain!.toFixed(1))} mm`
  })
  return en ? `Forecast, next 3 days: ${items.join(', ')}` : `三日內預報：${items.join('、')}`
}
