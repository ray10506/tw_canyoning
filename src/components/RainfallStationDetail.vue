<template>
  <Teleport to="body">
    <div class="popup" :style="popupStyle">
      <div class="arrow" :class="arrowSide" :style="arrowStyle"></div>
      <div class="drag-handle" aria-hidden="true"></div>
      <div class="popup-header">
        <div class="header-left">
          <span class="name">{{ station.name }}</span>
          <span v-if="station.town || station.county" class="river-badge">{{ station.town || station.county }}</span>
          <span v-if="distance != null" class="dist-badge">{{ locale === 'en' ? 'From route' : '距路線' }} {{ distance.toFixed(1) }} km</span>
        </div>
        <button class="close-btn" :aria-label="locale === 'en' ? 'Close' : '關閉'" @click="$emit('close')">✕</button>
      </div>

      <div class="badge-row">
        <button :class="['period-btn', { active: mode === 'live' }]" :aria-pressed="mode === 'live'" @click="selectMode('live')">{{ locale === 'en' ? 'Live' : '即時' }}</button>
        <button :class="['period-btn', { active: mode === '7' }]" :aria-pressed="mode === '7'" @click="selectMode('7')">{{ locale === 'en' ? '7 days' : '近 7 天' }}</button>
        <button :class="['period-btn', { active: mode === '14' }]" :aria-pressed="mode === '14'" @click="selectMode('14')">{{ locale === 'en' ? '14 days' : '近 14 天' }}</button>
      </div>

      <div class="popup-body" aria-live="polite" :aria-busy="loading">
        <div v-if="loading" class="state" role="status">{{ locale === 'en' ? 'Loading rainfall data…' : '正在取得雨量資料…' }}</div>
        <template v-else-if="error">
          <div class="state error">{{ error }}</div>
          <button class="retry-btn" @click="fetchData">{{ locale === 'en' ? 'Retry' : '重試' }}</button>
        </template>
        <template v-else-if="mode === 'live' && data">
          <div class="status-card" :class="`status-${rainStatus.tone}`">
            <div class="status-title">{{ rainStatus.title }}</div>
            <div class="rain-summary">
              <span><strong>{{ data.past24hr ?? '—' }}</strong> mm<small>{{ locale === 'en' ? '24 hr' : '24 小時' }}</small></span>
              <span><strong>{{ data.source === 'wcrc' ? (data.past7days ?? '—') : (data.past3days ?? '—') }}</strong> mm<small>{{ data.source === 'wcrc' ? (locale === 'en' ? '7 days' : '7 日') : (locale === 'en' ? '72 hr' : '72 小時') }}</small></span>
            </div>
            <div class="status-note">{{ rainStatus.note }}</div>
            <div class="safety-note">{{ locale === 'en' ? 'Rainfall alone does not determine canyon safety.' : '雨量不能單獨判斷溪谷是否安全。' }}</div>
          </div>
          <div class="row" v-for="item in rainItems" :key="item.label">
            <span class="row-label">{{ item.label }}</span>
            <span class="row-value">{{ item.value }}</span>
          </div>
          <div v-if="observedText" class="update-time">{{ locale === 'en' ? `Observed ${observedText}` : `觀測時間 ${observedText}` }}</div>
          <div v-else-if="data.updateTime" class="update-time">{{ data.updateTime }} {{ locale === 'en' ? 'updated' : '更新' }}</div>
        </template>
        <template v-else-if="currentHistory">
          <div class="history-total">
            <span>{{ currentHistory.total }}</span>
            <small>{{ currentHistory.unit }}</small>
          </div>
          <div class="history-actions">
            <div class="history-range">{{ currentHistory.from }} - {{ currentHistory.to }}</div>
            <button class="download-btn" @click="downloadHistoryImage">{{ locale === 'en' ? 'PNG' : '下載 PNG' }}</button>
          </div>
          <WaterLevelChart
            ref="chartRef"
            :series="historySeries"
            type="bar"
            :height-px="180"
            :y-label="locale === 'en' ? 'Daily accumulated rainfall (mm)' : '每日累積雨量 (mm)'"
          />
          <div class="update-time">
            {{ locale === 'en'
              ? `Last ${currentHistory.days} complete days · ${currentHistory.daysIncluded} available`
              : `最近 ${currentHistory.days} 個完整日，目前取得 ${currentHistory.daysIncluded} 日` }}
          </div>
        </template>
        <a v-if="station.source === 'wcrc'" :href="wcrcSourceUrl" target="_blank" rel="noopener" class="source-link">
          {{ locale === 'en' ? 'WCRC official data' : 'WCRC 官方資料' }} ↗
        </a>
        <p v-else class="source-note">{{ t('資料來源：中央氣象署', 'Source: Central Weather Administration') }}</p>
        <!-- Same disclosure as the water card: metadata stays out of the decision path. -->
        <details class="station-details">
          <summary class="station-details-summary">{{ t('測站資訊', 'Station info') }}</summary>
          <div class="station-details-body">
            <span class="detail-item">{{ t('站號', 'ID') }} {{ station.station_id }}</span>
            <span v-if="station.county || station.town" class="detail-item">{{ t('位置', 'Location') }} {{ [station.county, station.town].filter(Boolean).join(' ') }}</span>
            <span v-if="station.altitude != null" class="detail-item">{{ t('海拔', 'Altitude') }} {{ station.altitude }} m</span>
          </div>
        </details>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { RainfallStation } from '../lib/rainfall'
import { fetchRainfallData, fetchRainfallHistory, rainfallStatus, type RainfallData, type RainfallHistoryData } from '../lib/rainfallData'
import { clamp } from '../lib/clamp'
import { locale, t, loadErrorText } from '../lib/locale'
import { taipeiParts } from '../lib/waterLevel'
import WaterLevelChart from './WaterLevelChart.vue'
import type { ChartSeries } from '../lib/chart'

// One width for every mode, matching the water card, so switching tabs never reflows the card.
const CARD_W = 480
const CARD_OFFSET = 28
const MARGIN = 16
const ICON_CENTER_OFFSET_Y = 13
const ARROW_HALF_H = 8
const ARROW_SAFE_PAD = 24

const props = defineProps<{
  station: RainfallStation
  pos: { x: number; y: number }
  distance?: number
  leftInset?: number
}>()
defineEmits<{ close: [] }>()

const loading = ref(true)
const error = ref<string | null>(null)
const data = ref<RainfallData | null>(null)
const mode = ref<'live' | '7' | '14'>('live')
const historyCache = ref<Record<'7' | '14', RainfallHistoryData | null>>({ '7': null, '14': null })

const popupWidth = computed(() => Math.min(CARD_W, window.innerWidth - MARGIN * 2))

const estimatedHeight = computed(() => {
  if (loading.value || error.value) return 160
  return mode.value === 'live' ? 580 : 520
})

const openOnRight = computed(() => props.distance == null && props.pos.x + CARD_OFFSET + popupWidth.value + MARGIN <= window.innerWidth)
const arrowSide = computed(() => openOnRight.value ? 'arrow-left' : 'arrow-right')

const popupLayout = computed(() => {
  const width = popupWidth.value
  const height = Math.min(estimatedHeight.value, Math.max(120, window.innerHeight - MARGIN * 2))
  const onRight = openOnRight.value
  let left = onRight ? props.pos.x + CARD_OFFSET : props.pos.x - CARD_OFFSET - width
  let top = props.pos.y - ICON_CENTER_OFFSET_Y - 44

  // Keep clear of the open sidebar so the route list stays readable; overlap it only when the map is too narrow.
  const maxLeft = window.innerWidth - width - MARGIN
  left = clamp(left, Math.min((props.leftInset ?? 0) + MARGIN, maxLeft), maxLeft)
  top = clamp(top, MARGIN, window.innerHeight - height - MARGIN)

  const targetY = props.pos.y - ICON_CENTER_OFFSET_Y
  const arrowTop = clamp(targetY - top - ARROW_HALF_H, ARROW_SAFE_PAD, height - ARROW_SAFE_PAD)

  return { left, top, width, height, arrowTop }
})

const popupStyle = computed(() => {
  const { left, top, width, height } = popupLayout.value
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: window.innerWidth <= 640 ? undefined : `${width}px`,
    maxHeight: window.innerWidth <= 640 ? undefined : `${height}px`,
    minHeight: window.innerWidth <= 640 ? undefined : loading.value || error.value ? `${height}px` : undefined,
  }
})

const arrowStyle = computed(() => ({ top: `${popupLayout.value.arrowTop}px` }))
const wcrcSourceUrl = computed(() => `https://envirodata.wcrc.govt.nz/dashboards/rainfall/rainfall.php?chart=Y&site=${encodeURIComponent(props.station.station_id)}&name=${encodeURIComponent(props.station.name)}`)

const rainItems = computed(() => {
  if (!data.value) return []
  const en = locale.value === 'en'
  if (data.value.source === 'wcrc') return [
    { label: en ? '1 hr' : '一小時', value: `${data.value.past1hr ?? '—'} mm` },
    { label: en ? '6 hr' : '六小時', value: `${data.value.past6hr ?? '—'} mm` },
    { label: en ? '24 hr' : '24 小時', value: `${data.value.past24hr ?? '—'} mm` },
    { label: en ? '7 days' : '7 日', value: `${data.value.past7days ?? '—'} mm` },
  ]
  return [
    { label: en ? '10 min'   : '十分鐘', value: `${data.value.past10min ?? '—'} mm` },
    { label: en ? '1 hr'     : '一小時',  value: `${data.value.past1hr ?? '—'} mm` },
    { label: en ? '3 hr'     : '三小時',  value: `${data.value.past3hr ?? '—'} mm` },
    { label: en ? '6 hr'     : '六小時',  value: `${data.value.past6hr ?? '—'} mm` },
    { label: en ? '12 hr'    : '12 小時', value: `${data.value.past12hr ?? '—'} mm` },
    { label: en ? '24 hr'    : '24 小時', value: `${data.value.past24hr ?? '—'} mm` },
    { label: en ? '2 days'   : '二日',    value: `${data.value.past2days ?? '—'} mm` },
    { label: en ? '3 days'   : '三日',    value: `${data.value.past3days ?? '—'} mm` },
  ]
})

const rainStatus = computed(() => rainfallStatus(data.value!))

const observedText = computed(() => {
  const iso = data.value?.observedAt
  if (!iso) return ''
  const p = taipeiParts(iso, props.station.source === 'wcrc' ? 'Pacific/Auckland' : 'Asia/Taipei')
  return `${p.year}/${p.month}/${p.day} ${p.hour}:${p.minute}`
})

const currentHistory = computed(() => mode.value === 'live' ? null : historyCache.value[mode.value])

const historySeries = computed<ChartSeries[]>(() => {
  const history = currentHistory.value
  if (!history?.daily?.length) return []
  return [{
    label: history.unit,
    color: '#5b9cf6',
    points: history.daily.map(item => ({ time: item.date, value: item.value })),
  }]
})

const chartRef = ref<InstanceType<typeof WaterLevelChart> | null>(null)

// ponytail: exported PNG is just the chart canvas, not the station-name/total header the old
// hand-drawn version baked in. Re-add by drawing an overlay onto the exported blob if that's missed.
function downloadHistoryImage() {
  const history = currentHistory.value
  if (!history) return
  chartRef.value?.toBlob(blob => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.station.station_id}-rainfall-${history.days}d.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  })
}

let requestId = 0

async function fetchData() {
  const id = ++requestId
  const { station_id: stationId, source } = props.station
  const target = mode.value
  loading.value = true
  error.value = null
  try {
    if (target === 'live') {
      const next = await fetchRainfallData(stationId, source)
      if (id === requestId) data.value = next
    } else {
      const next = await fetchRainfallHistory(stationId, Number(target) as 7 | 14, source)
      if (id === requestId) historyCache.value[target] = next
    }
  } catch (e) {
    if (id === requestId) error.value = loadErrorText(e, source === 'wcrc' ? 'WCRC' : t('氣象署', 'CWA'))
  } finally {
    if (id === requestId) loading.value = false
  }
}

function selectMode(next: 'live' | '7' | '14') {
  mode.value = next
  error.value = null // clear stale error from previous mode before checking cache
  const cached = next === 'live' ? data.value : historyCache.value[next]
  if (cached) {
    requestId++ // drop any in-flight load for the mode we just left
    loading.value = false
  } else fetchData()
}

onMounted(fetchData)
// App reuses this card when another rainfall station is clicked; never show the previous station's numbers.
watch(() => props.station.station_id, () => {
  data.value = null
  historyCache.value = { '7': null, '14': null }
  mode.value = 'live'
  fetchData()
})
</script>

<style scoped>
.popup {
  position: fixed;
  z-index: 2000;
  background: #12122a;
  border: 1px solid #2a2a4a;
  border-radius: 10px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  overflow: visible;
  display: flex;
  flex-direction: column;
}

.arrow {
  position: absolute;
  top: 36px;
  width: 0;
  height: 0;
}

.arrow-left {
  left: -8px;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-right: 8px solid #12122a;
  filter: drop-shadow(-2px 0 3px rgba(0,0,0,0.4));
}

.arrow-right {
  right: -8px;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-left: 8px solid #12122a;
  filter: drop-shadow(2px 0 3px rgba(0,0,0,0.4));
}

.popup-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 12px 12px 6px;
  gap: 6px;
}

.header-left {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px;
  min-width: 0;
}

.name {
  overflow-wrap: anywhere;
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
}

.dist-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  background: #1a2a1a;
  color: #5ecb6f;
}

.close-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  flex-shrink: 0;
  line-height: 1;
}
.close-btn:hover { background: #1e1e3a; color: #aaa; }
.close-btn:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

.badge-row {
  display: flex;
  gap: 4px;
  padding: 0 12px 8px;
}

.period-btn {
  flex: 1;
  font-size: 0.7rem;
  border: 1px solid #2a2a4a;
  background: #181832;
  color: #aaa;
  border-radius: 4px;
  padding: 3px 4px;
  cursor: pointer;
}

.period-btn.active {
  border-color: #5b9cf6;
  color: #fff;
  background: #1e2d6b;
}

.popup-body {
  padding: 0 12px 10px;
  overflow-y: auto;
  min-height: 0;
}

.status-card {
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 8px;
  background: #171733;
}

.status-title { color: #fff; font-size: 0.82rem; font-weight: 700; }
.status-note { color: #bbb; font-size: 0.7rem; margin-top: 6px; }

.rain-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 8px;
}

.rain-summary span {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 3px;
  color: #aaa;
  font-size: 0.68rem;
}

.rain-summary strong { color: var(--color-water); font-size: 1.15rem; }
.rain-summary small { width: 100%; color: #888; font-size: 0.64rem; }
.safety-note { color: #777; font-size: 0.64rem; margin-top: 6px; }

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #1e1e3a;
  font-size: 0.875rem;
}
.row:last-of-type { border-bottom: none; }

.row-label { color: #888; }
.row-value { font-weight: 600; color: #e0e0e0; }

.history-total {
  color: #fff;
  font-size: 1.7rem;
  font-weight: 700;
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 4px;
  padding: 12px 0 2px;
}

.history-total small {
  font-size: 0.75rem;
  color: #aaa;
  font-weight: 600;
}

.history-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 2px 0 8px;
}

.download-btn {
  border: 1px solid #2a2a4a;
  background: #181832;
  color: #d6defd;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.7rem;
  cursor: pointer;
}

.download-btn:hover {
  border-color: #5b9cf6;
  color: #fff;
}

.download-btn:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

.history-range {
  color: #aaa;
  font-size: 0.75rem;
  min-width: 0;
}

.state {
  font-size: 0.875rem;
  color: #888;
  padding: 12px 0;
  text-align: center;
}
.state.error { color: #e05c5c; }

.retry-btn {
  display: block;
  margin: 6px auto 10px;
  padding: 5px 18px;
  background: none;
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  color: #aaa;
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.retry-btn:hover        { border-color: #6c8ef5; color: #6c8ef5; }
.retry-btn:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

.update-time {
  font-size: 0.7rem;
  color: #aaa;
  text-align: right;
  padding-top: 6px;
}
.source-link {
  display: block;
  margin-top: 8px;
  color: #6c8ef5;
  font-size: 0.72rem;
  text-align: right;
  text-decoration: none;
}
.source-link:hover { text-decoration: underline; }
.source-note {
  margin: 8px 0 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
.source-link:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

@keyframes sheet-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

/* Drag handle: hidden on desktop, shown on mobile */
.drag-handle {
  display: none;
  width: 40px;
  height: 4px;
  background: #2a2a4a;
  border-radius: 2px;
  margin: 10px auto 4px;
  flex-shrink: 0;
}

/* ── Mobile: bottom sheet ── */
@media (max-width: 640px) {
  .popup {
    width: auto;
    max-width: none;
    left: 12px !important;
    right: 12px;
    top: auto !important;
    bottom: 12px;
    max-height: calc(85dvh - 12px);
    border-radius: 16px;
    padding-bottom: env(safe-area-inset-bottom, 0px);
    animation: sheet-up 0.28s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .arrow { display: none; }

  .drag-handle { display: block; }
}
</style>
