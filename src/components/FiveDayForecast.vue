<template>
  <section class="forecast">
    <div class="forecast-head">
      <div>
        <h3>{{ locale === 'en' ? 'Next 5 days' : '未來 5 天' }}</h3>
        <p>{{ locale === 'en' ? 'Forecast at the route coordinates' : '依路線座標取得的預報' }}</p>
      </div>
      <a v-if="detailUrl" :href="detailUrl" target="_blank" rel="noopener" class="forecast-detail">
        {{ locale === 'en' ? 'Details' : '詳細預報' }} ↗
      </a>
    </div>

    <div v-if="loading" class="forecast-state" role="status">
      {{ locale === 'en' ? 'Loading forecast…' : '正在載入預報…' }}
    </div>
    <div v-else-if="failed" class="forecast-state" role="alert">
      <p>{{ locale === 'en' ? 'The five-day forecast is temporarily unavailable.' : '暫時無法取得五日預報。' }}</p>
      <button type="button" @click="load">{{ locale === 'en' ? 'Try again' : '重新載入' }}</button>
    </div>
    <div v-else class="forecast-list">
      <article v-for="day in days" :key="day.date" class="forecast-day">
        <time :datetime="day.date">{{ formatDate(day.date) }}</time>
        <div class="forecast-summary">
          <strong>{{ weatherLabel(day.code) }}</strong>
          <span>{{ temperature(day.max) }} / {{ temperature(day.min) }}</span>
        </div>
        <dl class="forecast-metrics">
          <div>
            <dt>{{ locale === 'en' ? 'Rain' : '降雨' }}</dt>
            <dd>{{ measure(day.rain, 'mm') }}</dd>
          </div>
          <div>
            <dt>{{ locale === 'en' ? 'Gusts' : '陣風' }}</dt>
            <dd>{{ measure(day.gust, 'km/h', true) }}</dd>
          </div>
        </dl>
      </article>
    </div>

    <p class="forecast-note">
      {{ locale === 'en' ? 'Model forecast, not an on-site observation. Mountain conditions can change quickly.' : '此為模式預報，並非現地觀測；山區天氣可能快速變化。' }}
    </p>
    <p class="forecast-source">
      {{ locale === 'en' ? 'Forecast data' : '預報資料' }}:
      <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>
      <template v-if="detailUrl && detailLabel">
        · <a :href="detailUrl" target="_blank" rel="noopener">{{ detailLabel }}</a>
      </template>
    </p>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { locale } from '../lib/locale'

const props = defineProps<{ gps?: string; detailUrl?: string; detailLabel?: string }>()

type ForecastDay = {
  date: string
  code: number | null
  max: number | null
  min: number | null
  rain: number | null
  gust: number | null
}

const days = ref<ForecastDay[]>([])
const loading = ref(false)
const failed = ref(false)

function finiteNumber(value: unknown) {
  return Number.isFinite(value) ? Number(value) : null
}

async function load() {
  const requestedGps = String(props.gps ?? '')
  const [latitude, longitude] = requestedGps.split(',').map(Number)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    failed.value = true
    return
  }

  loading.value = true
  failed.value = false
  try {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_gusts_10m_max',
      forecast_days: '5',
      timezone: 'auto',
    })
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
    if (!response.ok) throw new Error()
    const { daily } = await response.json()
    if (!Array.isArray(daily?.time)) throw new Error()
    if (String(props.gps ?? '') !== requestedGps) return

    days.value = daily.time.slice(0, 5).map((date: string, index: number) => ({
      date,
      code: finiteNumber(daily.weather_code?.[index]),
      max: finiteNumber(daily.temperature_2m_max?.[index]),
      min: finiteNumber(daily.temperature_2m_min?.[index]),
      rain: finiteNumber(daily.precipitation_sum?.[index]),
      gust: finiteNumber(daily.wind_gusts_10m_max?.[index]),
    }))
  } catch {
    if (String(props.gps ?? '') === requestedGps) failed.value = true
  } finally {
    if (String(props.gps ?? '') === requestedGps) loading.value = false
  }
}

watch(() => props.gps, load, { immediate: true })

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
function weatherLabel(code: number | null) {
  if (code == null) return '—'
  const [, en, zh] = WEATHER_LABELS.find(([max]) => code <= max) ?? WEATHER_LABELS[WEATHER_LABELS.length - 1]
  return locale.value === 'en' ? en : zh
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(locale.value === 'en' ? 'en-NZ' : 'zh-TW', {
    weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

function temperature(value: number | null) {
  return value == null ? '—' : `${Math.round(value)}°`
}

function measure(value: number | null, unit: string, integer = false) {
  if (value == null) return '—'
  return `${integer ? Math.round(value) : Number(value.toFixed(1))} ${unit}`
}
</script>

<style scoped>
.forecast { color: var(--text, #e0e0e0); }
.forecast-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  padding: 10px 6px 14px; border-bottom: 1px solid var(--line, #2a2a4a);
}
.forecast-head h3 { margin: 0; color: var(--text, #e0e0e0); font-size: 18px; line-height: 1.3; }
.forecast-head p { margin: 3px 0 0; color: var(--muted, #9898b8); font-size: 12px; }
.forecast-detail {
  flex-shrink: 0; padding: 6px 10px; border: 1px solid var(--line, #2a2a4a); border-radius: 6px;
  color: var(--cyan2, #91a8ff); font-size: 12px; text-decoration: none;
}
.forecast-detail:hover, .forecast-detail:focus-visible { background: var(--bg3, #252545); outline: none; }
.forecast-list { padding: 0 6px; }
.forecast-day {
  display: grid; grid-template-columns: 82px minmax(90px, 1fr) minmax(142px, auto);
  align-items: center; gap: 10px; min-height: 72px; padding: 10px 6px;
  border-bottom: 1px solid var(--line, #2a2a4a);
}
.forecast-day time { color: var(--cyan2, #91a8ff); font: 600 11px var(--mono, monospace); }
.forecast-summary { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.forecast-summary strong { color: var(--text, #e0e0e0); font-size: 13px; }
.forecast-summary span { color: var(--muted, #9898b8); font: 11.5px var(--mono, monospace); }
.forecast-metrics { display: grid; grid-template-columns: repeat(2, minmax(64px, 1fr)); gap: 8px; margin: 0; }
.forecast-metrics dt { padding: 0; color: var(--dim, #7878a8); font-size: 10px; }
.forecast-metrics dd { margin: 2px 0 0; color: var(--text, #e0e0e0); font: 600 11px var(--mono, monospace); white-space: nowrap; }
.forecast-note { margin: 14px 6px 0; color: var(--muted, #9898b8); font-size: 11px; line-height: 1.55; }
.forecast-source { margin: 8px 6px 0; color: var(--dim, #7878a8); font-size: 10.5px; }
.forecast-source a { color: var(--cyan, #6c8ef5); text-decoration: none; }
.forecast-source a:hover { text-decoration: underline; }
.forecast-state { padding: 32px 20px; text-align: center; color: var(--muted, #9898b8); font-size: 12px; }
.forecast-state p { margin: 0 0 12px; }
.forecast-state button {
  padding: 7px 12px; border: 1px solid var(--cyan, #6c8ef5); border-radius: 6px;
  background: var(--cdim, #1e2d6b); color: var(--cyan2, #91a8ff); font: 600 12px var(--sans, sans-serif); cursor: pointer;
}
.forecast-state button:focus-visible { outline: 2px solid var(--cyan2, #91a8ff); outline-offset: 2px; }

@media (max-width: 420px) {
  .forecast-day { grid-template-columns: 76px minmax(78px, 1fr) minmax(126px, auto); gap: 6px; padding-inline: 2px; }
  .forecast-metrics { gap: 4px; }
}
</style>
