<template>
  <Teleport to="body">
    <div class="popup" :style="popupStyle" @click.stop>
        <div class="arrow" :class="arrowSide" :style="arrowStyle"></div>
        <!-- Drag-handle affordance on mobile bottom sheet -->
        <div class="drag-handle" aria-hidden="true"></div>
        <div class="panel-header">
          <div class="header-left">
            <span class="station-name">{{ station.name }}</span>
            <span class="river-badge">{{ station.river || '—' }}</span>
            <span v-if="distance != null" class="dist-badge">{{ locale === 'en' ? 'From route' : '距路線' }} {{ distance.toFixed(1) }} km</span>
          </div>
          <button class="close-btn" :aria-label="locale === 'en' ? 'Close' : '關閉'" @click="$emit('close')">✕</button>
        </div>

        <div v-if="isNz && station.hasFlow" class="period-row" :aria-label="t('觀測項目', 'Measurement')">
          <button class="period-btn" :class="{ active: metric === 'level' }" :aria-pressed="metric === 'level'" @click="selectMetric('level')">{{ t('水位 (m)', 'Water level (m)') }}</button>
          <button class="period-btn" :class="{ active: metric === 'flow' }" :aria-pressed="metric === 'flow'" @click="selectMetric('flow')">{{ t('流量 (m³/s)', 'Flow (m³/s)') }}</button>
        </div>
        <div class="period-row">
          <button :class="['period-btn', { active: mode === 'live' }]" :aria-pressed="mode === 'live'" @click="selectMode('live')">{{ locale === 'en' ? 'Live' : '即時' }}</button>
          <button :class="['period-btn', { active: mode === '7' }]" :aria-pressed="mode === '7'" @click="selectMode('7')">{{ locale === 'en' ? '7 days' : '近 7 天' }}</button>
          <button :class="['period-btn', { active: mode === '14' }]" :aria-pressed="mode === '14'" @click="selectMode('14')">{{ locale === 'en' ? '14 days' : '近 14 天' }}</button>
        </div>

        <div class="panel-body" aria-live="polite" :aria-busy="loading">
          <!-- Loading: skeleton shaped like the status card so the user sees where the answer will appear -->
          <div v-if="loading" class="status-skeleton" role="status" :aria-label="t('水文資料載入中', 'Loading river data')">
            <div class="skel-title"></div>
            <div class="skel-level"></div>
            <div class="skel-note"></div>
          </div>

          <!-- Error: card-shaped container so it sits in the same visual slot as the verdict -->
          <template v-else-if="error">
            <div class="status-card status-error-card">
              <div class="status-title">{{ t('水文資料載入失敗', 'Could not load river data') }}</div>
              <div class="status-note error-note">{{ error }}</div>
            </div>
            <button class="retry-btn" @click="load">{{ locale === 'en' ? 'Retry' : '重試' }}</button>
          </template>

          <!-- Data: status card FIRST — the safety verdict is the answer to "should I go?" -->
          <template v-else-if="series">
            <div class="status-card" :class="levelStatus ? `status-${levelStatus.tone}` : 'status-unknown'">
              <div class="status-title">{{ levelStatus?.title ?? t('無有效觀測', 'No valid reading') }}</div>
              <div v-if="latest != null" class="status-level-line">
                <strong class="level-value">{{ latest }} {{ metric === 'flow' ? 'm³/s' : 'm' }}</strong>
                <span class="level-time">{{ latestTime }}</span>
              </div>
              <div class="status-note">{{ levelStatus?.note ?? (locale === 'en' ? 'Station may be offline.' : '測站可能暫時離線。') }}</div>
              <div v-if="hasAlertLevels && metric === 'level'" class="alert-levels">
                <span v-if="station.alert1 != null">{{ locale === 'en' ? 'Lv.1' : '一級' }} {{ formatLevel(station.alert1) }}m</span>
                <span v-if="station.alert2 != null">{{ locale === 'en' ? 'Lv.2' : '二級' }} {{ formatLevel(station.alert2) }}m</span>
                <span v-if="station.alert3 != null">{{ locale === 'en' ? 'Lv.3' : '三級' }} {{ formatLevel(station.alert3) }}m</span>
              </div>
            </div>
            <WaterLevelChart v-if="series.points.length > 1" :series="chartSeries" :y-label="measurementLabel" :time-zone="timeZone" :span-gaps="!isNz" :x-label="isNz ? t('日期／時間（紐西蘭）', 'Date / time (New Zealand)') : undefined" />
          </template>

          <p v-if="isNz" class="source-note">{{ t('WCRC 原始觀測，尚未完整檢核；時間以紐西蘭當地時間顯示。', 'WCRC raw observations, not fully verified. Times are local to New Zealand.') }}</p>
          <a v-if="isNz" class="source-link" :href="sourceUrl" target="_blank" rel="noopener">{{ t('WCRC 官方水文資料', 'WCRC official river data') }} ↗</a>
          <p v-else class="source-note">{{ t('資料來源：經濟部水利署', 'Source: Water Resources Agency') }}</p>

          <!-- Station metadata: collapsed by default, out of the critical decision path -->
          <details class="station-details">
            <summary class="station-details-summary">{{ locale === 'en' ? 'Station info' : '測站資訊' }}</summary>
            <div class="station-details-body">
              <span class="detail-item">{{ locale === 'en' ? 'ID' : '站號' }} {{ station.id }}</span>
              <span v-if="station.address" class="detail-item">
                <span class="meta-label">{{ locale === 'en' ? 'Location' : '位置' }}</span>{{ station.address }}
              </span>
            </div>
          </details>
        </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import WaterLevelChart from './WaterLevelChart.vue'
import { fetchWaterLevel, fetchWaterLevelHistory, taipeiParts, type WaterMetric, type WaterLevelDays, type WaterLevelSeries, type WaterStation } from '../lib/waterLevel'
import type { ChartSeries } from '../lib/chart'
import { locale, t, loadErrorText } from '../lib/locale'
import { clamp } from '../lib/clamp'

const props = withDefaults(defineProps<{ station: WaterStation; pos: { x: number; y: number }; days?: number; distance?: number; leftInset?: number }>(), {
  days: 7,
})
defineEmits<{ close: [] }>()

const loading = ref(false)
const error = ref<string | null>(null)
const series = ref<WaterLevelSeries | null>(null)
const mode = ref<'live' | '7' | '14'>('live')
const metric = ref<WaterMetric>('level')
const isNz = computed(() => props.station.source === 'wcrc')
const timeZone = computed(() => isNz.value ? 'Pacific/Auckland' : 'Asia/Taipei')
const measurementLabel = computed(() => metric.value === 'flow' ? t('流量 (m³/s)', 'Flow (m³/s)') : t('水位 (m)', 'Level (m)'))
const sourceUrl = computed(() => `https://envirodata.wcrc.govt.nz/dashboards/riverlevels/riverlevels.php?chart=Y&site=${encodeURIComponent(props.station.id.slice(5))}&type=${metric.value === 'flow' ? 'Flow' : 'Level'}`)
let loadRequestId = 0
const STALE_AFTER_MS = 3 * 3600000

const MARGIN = 16
const CARD_OFFSET = 28
const ARROW_HALF_H = 8
const ARROW_SAFE_PAD = 24
const popupWidth = computed(() => Math.min(480, window.innerWidth - MARGIN * 2))
const estimatedHeight = computed(() => loading.value || error.value ? 220 : 600)
const openOnRight = computed(() => props.distance == null && props.pos.x + CARD_OFFSET + popupWidth.value + MARGIN <= window.innerWidth)
const arrowSide = computed(() => openOnRight.value ? 'arrow-left' : 'arrow-right')
const popupLayout = computed(() => {
  const width = popupWidth.value
  const height = Math.min(estimatedHeight.value, Math.max(120, window.innerHeight - MARGIN * 2))
  const onRight = openOnRight.value
  let left = onRight ? props.pos.x + CARD_OFFSET : props.pos.x - CARD_OFFSET - width
  let top = props.pos.y - 13 - 44
  // Keep clear of the open sidebar so the route list stays readable; overlap it only when the map is too narrow.
  const maxLeft = window.innerWidth - width - MARGIN
  left = clamp(left, Math.min((props.leftInset ?? 0) + MARGIN, maxLeft), maxLeft)
  top = clamp(top, MARGIN, window.innerHeight - height - MARGIN)
  const arrowTop = clamp(props.pos.y - 13 - top - ARROW_HALF_H, ARROW_SAFE_PAD, height - ARROW_SAFE_PAD)
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

async function load() {
  const stationId = props.station.id
  const days = props.days
  const requestId = ++loadRequestId
  const isCurrentRequest = () => requestId === loadRequestId && props.station.id === stationId && props.days === days

  loading.value = true
  error.value = null
  series.value = null
  try {
    const nextSeries = mode.value === 'live'
      ? await fetchWaterLevel(stationId, metric.value)
      : await fetchWaterLevelHistory(stationId, Number(mode.value) as WaterLevelDays, metric.value)
    if (!isCurrentRequest()) return
    series.value = nextSeries
  } catch (e) {
    if (!isCurrentRequest()) return
    error.value = loadErrorText(e, isNz.value ? 'WCRC' : t('水利署', 'WRA'))
  } finally {
    if (isCurrentRequest()) loading.value = false
  }
}

function selectMode(next: 'live' | '7' | '14') {
  mode.value = next
  error.value = null
  load()
}

function selectMetric(next: WaterMetric) {
  metric.value = next
  load()
}

onMounted(load)
watch(() => [props.station.id, props.days], () => {
  metric.value = 'level'
  mode.value = 'live'
  load()
})

const latestPoint = computed(() => {
  const points = series.value?.points ?? []
  // A missing latest observation must not be replaced by an older measured value.
  if (isNz.value) return points[points.length - 1]
  return [...points].reverse().find(point => point.value != null)
})

const latest = computed(() => {
  const value = latestPoint.value?.value
  return value != null ? Number(value.toFixed(3)) : null
})

const latestTime = computed(() => {
  if (!latestPoint.value) return ''
  const parts = taipeiParts(latestPoint.value.time, timeZone.value)
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`
})

const hasAlertLevels = computed(() => [props.station.alert1, props.station.alert2, props.station.alert3].some(level => level != null))

function formatLevel(level: number) {
  return String(parseFloat(level.toFixed(2)))
}

const levelStatus = computed(() => {
  const value = latest.value
  const isEn = locale.value === 'en'
  if (value == null) return null
  // An old reading must never earn a "below alert" verdict: stations go offline and the feed keeps the last value.
  if (Date.now() - Date.parse(latestPoint.value!.time) > STALE_AFTER_MS) return {
    tone: 'unknown',
    title: t('觀測已超過 3 小時', 'Reading is over 3 hours old'),
    note: t('測站可能延遲或離線，請至官方來源確認。', 'The station may be delayed or offline. Check the official source.'),
  }
  if (isNz.value) return {
    tone: 'unknown',
    title: metric.value === 'flow' ? t('流量觀測', 'Flow reading') : t('水位觀測', 'Water-level reading'),
    note: t('未提供警戒門檻；請搭配上游雨量與天氣判斷。', 'No alert threshold provided. Check upstream rain and weather.'),
  }
  if (!hasAlertLevels.value) {
    return {
      tone: 'unknown',
      title: isEn ? 'No alert level set' : '未設定警戒水位',
      note: isEn ? 'Use upstream rainfall and weather before deciding.' : '請搭配上游雨量與天氣判斷。',
    }
  }
  if (props.station.alert1 != null && value >= props.station.alert1) {
    return {
      tone: 'danger',
      title: isEn ? 'Above Alert Lv.1' : '已達一級警戒',
      note: isEn ? 'Do not enter the canyon.' : '不建議進入溪谷。',
    }
  }
  if (props.station.alert2 != null && value >= props.station.alert2) {
    return {
      tone: 'warning',
      title: isEn ? 'Above Alert Lv.2' : '已達二級警戒',
      note: isEn ? 'Water level is already high.' : '水位已偏高，請避免下溪。',
    }
  }
  if (props.station.alert3 != null && value >= props.station.alert3) {
    return {
      tone: 'watch',
      title: isEn ? 'Above Alert Lv.3' : '已達三級警戒',
      note: isEn ? 'Conditions may change quickly.' : '溪況可能快速變化，需保守判斷。',
    }
  }

  const nextAlert = [
    { level: props.station.alert3, label: isEn ? 'Lv.3' : '三級警戒' },
    { level: props.station.alert2, label: isEn ? 'Lv.2' : '二級警戒' },
    { level: props.station.alert1, label: isEn ? 'Lv.1' : '一級警戒' },
  ]
    .filter((item): item is { level: number; label: string } => item.level != null && item.level > value)
    .sort((a, b) => a.level - b.level)[0]

  return {
    tone: 'normal',
    title: isEn ? 'Below alert level' : '低於警戒水位',
    note: nextAlert
      ? (isEn ? `${formatLevel(nextAlert.level - value)}m below ${nextAlert.label}.` : `距離${nextAlert.label}還有 ${formatLevel(nextAlert.level - value)}m。`)
      : (isEn ? 'Use upstream rainfall and weather before deciding.' : '仍需搭配上游雨量與天氣判斷。'),
  }
})

const chartSeries = computed<ChartSeries[]>(() => {
  const points = series.value?.points
  if (!points) return []
  const result: ChartSeries[] = [
    { label: measurementLabel.value, color: '#43AEDB', points },
  ]
  if (metric.value === 'flow') return result
  const addAlert = (level: number | null, label: string, color: string) => {
    if (level == null) return
    result.push({
      label,
      color,
      dashed: true,
      points: points.map(p => ({ time: p.time, value: level })),
    })
  }
  const isEn = locale.value === 'en'
  addAlert(props.station.alert3, isEn ? 'Alert Lv.3' : '三級警戒', '#f0d977')
  addAlert(props.station.alert2, isEn ? 'Alert Lv.2' : '二級警戒', '#ff8076')
  addAlert(props.station.alert1, isEn ? 'Alert Lv.1' : '一級警戒', '#e63946')
  return result
})
</script>

<style scoped>
/* ── Bottom-sheet slide-up (mobile only) ── */
@keyframes sheet-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

.popup {
  position: fixed;
  z-index: 2000;
  background: #12122a;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  width: 480px;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  overflow: visible;
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
    /* Respect safe-area on devices with home indicator */
    padding-bottom: env(safe-area-inset-bottom, 0px);
    animation: sheet-up 0.28s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .arrow { display: none; }

  .drag-handle { display: block; }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #2a2a4a;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.station-name {
  overflow-wrap: anywhere;
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
}

.period-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  background: #2a2a4a;
  color: #aaa;
}

.period-row {
  display: flex;
  gap: 4px;
  padding: 10px 24px 0;
}

.period-btn {
  flex: 1;
  min-height: 36px;
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  background: #171733;
  color: #aaa;
  cursor: pointer;
}

.period-btn.active {
  border-color: #6c8ef5;
  background: #1e2d6b;
  color: #fff;
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
  font-size: 1rem;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
}
.close-btn:hover { background: #2a2a4a; color: #fff; }
.close-btn:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

.panel-body {
  padding: 18px 24px 24px;
  overflow-y: auto;
  min-height: 0;
}

/* ── Loading skeleton ── */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
.status-skeleton {
  border: 1px solid #2a2a4a;
  border-radius: 10px;
  padding: 18px 20px;
  margin-bottom: 16px;
  background: #171733;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.skel-title, .skel-level, .skel-note {
  border-radius: 4px;
  background: linear-gradient(90deg, #2a2a4a 25%, #38386a 50%, #2a2a4a 75%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}
.skel-title  { height: 18px; width: 55%; }
.skel-level  { height: 30px; width: 38%; }
.skel-note   { height: 14px; width: 80%; }

/* ── Status card — the H1 of the panel ── */
.status-card {
  border: 1px solid #2a2a4a;
  border-radius: 10px;
  padding: 18px 20px;
  margin-bottom: 16px;
  background: #171733;
}

/* Level number lives inside the verdict card */
.status-level-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  margin: 8px 0 6px;
}
.level-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: #43AEDB;
  letter-spacing: -0.02em;
}
.level-time {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.source-note { color: var(--color-text-muted); font-size: 0.8rem; line-height: 1.5; margin: 12px 0 6px; }
.source-link { color: var(--color-primary-hover); display: inline-block; padding: 8px 0; font-size: 0.85rem; }
.period-btn:focus-visible, .source-link:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.period-btn:hover { border-color: var(--color-primary); }

/* Error variant */
.status-error-card { border-color: #4a2020; background: #1a1010; }
.error-note { color: #e05c5c; }

/* Retry button — styled, not browser-default */
.retry-btn {
  display: block;
  margin: 0 auto 16px;
  padding: 6px 22px;
  background: none;
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  color: #aaa;
  font-size: 0.875rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.retry-btn:hover        { border-color: #6c8ef5; color: #6c8ef5; }
.retry-btn:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

.status-title {
  font-weight: 700;
  font-size: 1rem;
  color: #fff;
  margin-bottom: 2px;
}

.status-note {
  font-size: 0.875rem;
  color: #bbb;
}

.alert-levels {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  font-size: 0.75rem;
  color: #999;
}

.alert-levels span {
  padding: 2px 8px;
  border-radius: 999px;
  background: #222244;
}

.status-unknown { border-color: #44445f; }
</style>
