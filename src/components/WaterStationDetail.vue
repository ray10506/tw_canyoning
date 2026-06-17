<template>
  <Teleport to="body">
    <div class="overlay" @click="$emit('close')">
      <div class="panel" @click.stop>
        <div class="panel-header">
          <div class="header-left">
            <span class="station-name">{{ station.name }}</span>
            <span class="river-badge">{{ station.river || '—' }}</span>
            <span class="period-badge">{{ periodLabel }}</span>
          </div>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>

        <div class="panel-body">
          <div class="meta-row">
            <span>站號 {{ station.id }}</span>
            <span v-if="station.address">{{ station.address }}</span>
          </div>

          <div v-if="loading" class="state-msg">載入水位資料中...</div>
          <div v-else-if="error" class="state-msg error">{{ error }}</div>
          <template v-else-if="series">
            <div v-if="latest != null" class="latest-row">
              目前水位 <strong>{{ latest }} m</strong>
              <span class="latest-time">{{ latestTime }}</span>
            </div>
            <WaterLevelChart :series="chartSeries" y-label="水位 (m)" />
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import WaterLevelChart from './WaterLevelChart.vue'
import { fetchWaterLevel, type WaterLevelSeries, type WaterStation } from '../lib/waterLevel'
import type { ChartSeries } from '../lib/chart'

const props = withDefaults(defineProps<{ station: WaterStation; days?: number }>(), {
  days: 7,
})
defineEmits<{ close: [] }>()

const loading = ref(false)
const error = ref<string | null>(null)
const series = ref<WaterLevelSeries | null>(null)
let loadRequestId = 0

async function load() {
  const stationId = props.station.id
  const days = props.days
  const requestId = ++loadRequestId
  const isCurrentRequest = () => requestId === loadRequestId && props.station.id === stationId && props.days === days

  loading.value = true
  error.value = null
  series.value = null
  try {
    const nextSeries = await fetchWaterLevel(stationId, days)
    if (!isCurrentRequest()) return
    series.value = nextSeries
  } catch (e) {
    if (!isCurrentRequest()) return
    error.value = e instanceof Error ? e.message : '載入失敗'
  } finally {
    if (isCurrentRequest()) loading.value = false
  }
}

onMounted(load)
watch(() => [props.station.id, props.days], load)

const periodLabel = computed(() => {
  switch (props.days) {
    case 7: return '近一週'
    case 30: return '近一月'
    case 90: return '近一季'
    case 365: return '近一年'
    default: return `近 ${props.days} 天`
  }
})

const latest = computed(() => {
  const points = series.value?.points
  if (!points) return null
  for (let i = points.length - 1; i >= 0; i--) {
    const v = points[i].value
    if (v != null) return v
  }
  return null
})

const latestTime = computed(() => {
  const points = series.value?.points
  if (!points) return ''
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].value != null) {
      const d = new Date(points[i].time)
      return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:00`
    }
  }
  return ''
})

const chartSeries = computed<ChartSeries[]>(() => {
  const points = series.value?.points
  if (!points) return []
  const result: ChartSeries[] = [
    { label: '水位 (m)', color: '#43AEDB', points },
  ]
  const addAlert = (level: number | null, label: string, color: string) => {
    if (level == null) return
    result.push({
      label,
      color,
      dashed: true,
      points: points.map(p => ({ time: p.time, value: level })),
    })
  }
  addAlert(props.station.alert3, '三級警戒', '#f0d977')
  addAlert(props.station.alert2, '二級警戒', '#ff8076')
  addAlert(props.station.alert1, '一級警戒', '#e63946')
  return result
})
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1500;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.panel {
  background: #12122a;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  width: 880px;
  max-width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  overflow: hidden;
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
}

.station-name {
  font-size: 1.2rem;
  font-weight: 700;
  color: #fff;
}

.river-badge {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  background: #1e2d6b;
  color: #6c8ef5;
}

.period-badge {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  background: #2a2a4a;
  color: #aaa;
}

.close-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 1rem;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}
.close-btn:hover { background: #2a2a4a; color: #fff; }

.panel-body {
  padding: 18px 24px 24px;
  overflow-y: auto;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.85rem;
  color: #888;
  margin-bottom: 14px;
}

.state-msg {
  font-size: 0.85rem;
  color: #888;
  padding: 24px 0;
  text-align: center;
}
.state-msg.error { color: #e05c5c; }

.latest-row {
  font-size: 0.95rem;
  color: #ccc;
  margin-bottom: 12px;
}
.latest-row strong {
  color: #43AEDB;
  font-size: 1.2rem;
}
.latest-time {
  margin-left: 8px;
  font-size: 0.8rem;
  color: #666;
}
</style>
