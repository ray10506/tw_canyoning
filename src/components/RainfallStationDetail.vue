<template>
  <Teleport to="body">
    <div class="card-overlay" @click="$emit('close')"></div>
    <div class="popup" :style="popupStyle">
      <div class="arrow" :class="arrowSide"></div>
      <div class="popup-header">
        <div class="header-left">
          <span class="name">{{ station.name }}</span>
          <span class="station-id">({{ station.station_id }})</span>
        </div>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="badge-row">
        <span class="badge">即時</span>
      </div>

      <div class="popup-body">
        <div v-if="loading" class="state">載入中...</div>
        <template v-else-if="error">
          <div class="state error">{{ error }}</div>
          <button class="retry-btn" @click="fetchData">重試</button>
        </template>
        <template v-else-if="data">
          <div class="row" v-for="item in rainItems" :key="item.label">
            <span class="row-label">{{ item.label }}</span>
            <span class="row-value">{{ item.value }}</span>
          </div>
          <div v-if="data.updateTime" class="update-time">{{ data.updateTime }} 更新</div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { RainfallStation } from '../lib/rainfall'
import { fetchRainfallData, type RainfallData } from '../lib/rainfallData'
import { clamp } from '../lib/clamp'

const CARD_W = 200
const CARD_OFFSET = 28
const MARGIN = 12
const ESTIMATED_H = 360

const props = defineProps<{
  station: RainfallStation
  pos: { x: number; y: number }
}>()
defineEmits<{ close: [] }>()

const loading = ref(true)
const error = ref<string | null>(null)
const data = ref<RainfallData | null>(null)

const arrowSide = computed(() => {
  return props.pos.x + CARD_OFFSET + CARD_W + MARGIN <= window.innerWidth ? 'arrow-left' : 'arrow-right'
})

const popupStyle = computed(() => {
  const onRight = props.pos.x + CARD_OFFSET + CARD_W + MARGIN <= window.innerWidth
  let left = onRight ? props.pos.x + CARD_OFFSET : props.pos.x - CARD_OFFSET - CARD_W
  // iconAnchor=[14,26] → anchor at bottom; icon centre is 13px above anchor
  // arrow css top:36px, arrow height 8px → arrow centre at cardTop+44
  // want cardTop+44 = pos.y-13  →  cardTop = pos.y-57
  let top = props.pos.y - 57

  left = clamp(left, MARGIN, window.innerWidth - CARD_W - MARGIN)
  top = clamp(top, MARGIN, window.innerHeight - ESTIMATED_H - MARGIN)

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${CARD_W}px`,
  }
})

const rainItems = computed(() => !data.value ? [] : [
  { label: '十分鐘', value: `${data.value.past10min} mm` },
  { label: '一小時',  value: `${data.value.past1hr} mm` },
  { label: '三小時',  value: `${data.value.past3hr} mm` },
  { label: '六小時',  value: `${data.value.past6hr} mm` },
  { label: '12 小時', value: `${data.value.past12hr} mm` },
  { label: '24 小時', value: `${data.value.past24hr} mm` },
  { label: '二日',    value: `${data.value.past2days} mm` },
  { label: '三日',    value: `${data.value.past3days} mm` },
])

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    data.value = await fetchRainfallData(props.station.station_id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '雨量資料暫時無法載入'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.card-overlay {
  position: fixed;
  inset: 0;
  z-index: 1999;
}

.popup {
  position: fixed;
  z-index: 2000;
  background: #12122a;
  border: 1px solid #2a2a4a;
  border-radius: 10px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
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
}

.name {
  font-size: 0.95rem;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
}

.station-id {
  font-size: 0.75rem;
  color: #888;
}

.close-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  flex-shrink: 0;
  line-height: 1;
}
.close-btn:hover { background: #1e1e3a; color: #aaa; }

.badge-row {
  padding: 0 12px 8px;
}

.badge {
  font-size: 0.68rem;
  border: 1px solid #5b9cf6;
  color: #5b9cf6;
  border-radius: 4px;
  padding: 1px 6px;
}

.popup-body {
  padding: 0 12px 10px;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #1e1e3a;
  font-size: 0.82rem;
}
.row:last-of-type { border-bottom: none; }

.row-label { color: #888; }
.row-value { font-weight: 600; color: #e0e0e0; }

.state {
  font-size: 0.82rem;
  color: #888;
  padding: 12px 0;
  text-align: center;
}
.state.error { color: #e05c5c; }

.retry-btn {
  display: block;
  margin: 0 auto 8px;
  padding: 5px 14px;
  background: none;
  border: 1px solid #e05c5c;
  color: #e05c5c;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.78rem;
  transition: background 0.15s;
}
.retry-btn:hover { background: rgba(224, 92, 92, 0.12); }

.update-time {
  font-size: 0.68rem;
  color: #aaa;
  text-align: right;
  padding-top: 6px;
}
</style>
