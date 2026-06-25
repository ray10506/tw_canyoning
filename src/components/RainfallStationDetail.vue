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
        <div v-else-if="error" class="state error">{{ error }}</div>
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

  left = Math.max(MARGIN, Math.min(left, window.innerWidth - CARD_W - MARGIN))
  top = Math.max(MARGIN, Math.min(top, window.innerHeight - ESTIMATED_H - MARGIN))

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

onMounted(async () => {
  try {
    data.value = await fetchRainfallData(props.station.station_id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '載入失敗'
  } finally {
    loading.value = false
  }
})
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
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.18);
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
  border-right: 8px solid #fff;
  filter: drop-shadow(-2px 0 2px rgba(0,0,0,0.08));
}

.arrow-right {
  right: -8px;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-left: 8px solid #fff;
  filter: drop-shadow(2px 0 2px rgba(0,0,0,0.08));
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
  color: #111;
  line-height: 1.2;
}

.station-id {
  font-size: 0.75rem;
  color: #888;
}

.close-btn {
  background: none;
  border: none;
  color: #bbb;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0 2px;
  flex-shrink: 0;
  line-height: 1;
}
.close-btn:hover { color: #555; }

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
  border-bottom: 1px solid #f0f0f0;
  font-size: 0.82rem;
}
.row:last-of-type { border-bottom: none; }

.row-label { color: #555; }
.row-value { font-weight: 600; color: #111; }

.state {
  font-size: 0.82rem;
  color: #888;
  padding: 12px 0;
  text-align: center;
}
.state.error { color: #e05c5c; }

.update-time {
  font-size: 0.68rem;
  color: #aaa;
  text-align: right;
  padding-top: 6px;
}
</style>
