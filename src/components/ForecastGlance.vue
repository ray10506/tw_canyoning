<template>
  <!-- Observed data alone can read green right before a storm, so the next five days sit in the
       header beside it — as plain facts that never tint the status colour. -->
  <button
    type="button"
    class="forecast-glance"
    :aria-label="t('未來五日預報，開啟氣象預報分頁', 'Five-day forecast, open Weather tab')"
    @click="emit('open')"
  >
    <span v-if="state === 'loading'" class="fc-state">{{ t('正在取得五日預報…', 'Loading 5-day forecast…') }}</span>
    <span v-else-if="state === 'failed'" class="fc-state">{{ t('暫時無法取得五日預報', '5-day forecast unavailable right now') }}</span>
    <span v-for="(day, i) in days" v-else :key="day.date" class="fc-day">
      <span class="fc-dow">{{ dayLabel(day.date, i) }}</span>
      <span class="fc-wx">{{ weatherLabel(day.code) }}</span>
      <span :class="['fc-mm', { wet: (day.rain ?? 0) > 0 }]">{{ day.rain == null ? '—' : `${Number(day.rain.toFixed(1))} mm` }}</span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { locale, t } from '../lib/locale'
import { fetchForecast, weatherLabel, type ForecastDay } from '../lib/forecast'

const props = defineProps<{ gps: string }>()
const emit = defineEmits<{ open: []; days: [days: ForecastDay[]] }>()

const days = ref<ForecastDay[]>([])
const state = ref<'loading' | 'failed' | 'ready'>('loading')

watch(() => props.gps, async (gps) => {
  state.value = 'loading'
  days.value = []
  emit('days', [])
  try {
    const result = await fetchForecast(gps)
    if (props.gps !== gps) return
    days.value = result
    state.value = 'ready'
    emit('days', result)
  } catch {
    if (props.gps === gps) state.value = 'failed'
  }
}, { immediate: true })

// Open-Meteo (timezone=auto) starts at today in the route's own timezone, not the viewer's.
function dayLabel(date: string, index: number) {
  const en = locale.value === 'en'
  const day = new Date(`${date}T00:00:00Z`)
  // Today carries its date too, so a screenshot shared tomorrow still says which day it was.
  if (index === 0) return en ? `Today ${day.getUTCDate()}` : `${day.getUTCMonth() + 1}/${day.getUTCDate()} 今天`
  const weekday = new Intl.DateTimeFormat(en ? 'en-NZ' : 'zh-TW', { weekday: en ? 'short' : 'narrow', timeZone: 'UTC' }).format(day)
  return en ? `${weekday} ${day.getUTCDate()}` : `${day.getUTCMonth() + 1}/${day.getUTCDate()} ${weekday}`
}
</script>

<style scoped>
/* Forecast is fact, not verdict: neutral surface, emphasis by weight only. */
.forecast-glance {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
  width: 100%;
  margin-top: 8px;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: var(--color-surface);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}
.forecast-glance:hover { background: var(--color-hover); }
.forecast-glance:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.fc-state { grid-column: 1 / -1; font-size: 0.78rem; color: var(--color-text-muted); }
.fc-day { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.fc-dow { font-size: 0.68rem; color: var(--color-text-muted); white-space: nowrap; }
.fc-wx { font-size: 0.75rem; font-weight: 600; color: var(--color-text); line-height: 1.25; overflow-wrap: anywhere; }
.fc-mm {
  font: 500 0.72rem ui-monospace, SFMono-Regular, Consolas, monospace;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
  white-space: nowrap;
}
.fc-mm.wet { font-weight: 700; color: var(--color-text-strong); }
</style>
