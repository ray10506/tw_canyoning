<template>
  <Teleport to="body">
    <div class="overlay" @click="$emit('close')">
      <div class="card" @click.stop>
        <div class="card-header">
          <div class="header-left">
            <span class="icon">🌂</span>
            <span class="name">{{ station.name }}</span>
            <span class="sub">{{ station.county }}{{ station.town }}</span>
          </div>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>

        <div class="card-body">
          <div v-if="loading" class="state">載入雨量資料中...</div>
          <div v-else-if="error" class="state error">{{ error }}</div>
          <template v-else-if="data">
            <div class="stats">
              <div class="stat-item">
                <span class="stat-label">今日累積</span>
                <span class="stat-value">{{ data.todayTotal }} <span class="unit">mm</span></span>
              </div>
              <div class="divider"></div>
              <div class="stat-item">
                <span class="stat-label">近三小時</span>
                <span class="stat-value">{{ data.last3hTotal }} <span class="unit">mm</span></span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { RainfallStation } from '../lib/rainfall'
import { fetchRainfallData, type RainfallData } from '../lib/rainfallData'

const props = defineProps<{ station: RainfallStation }>()
defineEmits<{ close: [] }>()

const loading = ref(true)
const error = ref<string | null>(null)
const data = ref<RainfallData | null>(null)

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
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1500;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.card {
  background: #12122a;
  border: 1px solid #2a2a4a;
  border-radius: 14px;
  width: 320px;
  max-width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #2a2a4a;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon { font-size: 1.1rem; }

.name {
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
}

.sub {
  font-size: 0.72rem;
  color: #888;
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

.card-body {
  padding: 20px 18px 24px;
}

.state {
  font-size: 0.85rem;
  color: #888;
  text-align: center;
  padding: 12px 0;
}
.state.error { color: #e05c5c; }

.stats {
  display: flex;
  align-items: center;
  gap: 0;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.stat-label {
  font-size: 0.75rem;
  color: #888;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #7c3aed;
}

.unit {
  font-size: 0.9rem;
  font-weight: 400;
  color: #888;
}

.divider {
  width: 1px;
  height: 48px;
  background: #2a2a4a;
  flex-shrink: 0;
}
</style>
