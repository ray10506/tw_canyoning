<template>
  <Teleport to="body">
    <div class="overlay" @click="$emit('close')">
      <div class="picker" @click.stop>
        <div class="picker-header">
          <span class="station-name">{{ station.name }}</span>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>
        <div class="picker-body">
          <p class="hint">{{ locale === 'en' ? 'Select a time range to view' : '選擇查看的水位變化區間' }}</p>
          <div class="period-grid">
            <button
              v-for="p in PERIODS"
              :key="p.label"
              class="period-btn"
              @click="$emit('select', p.days)"
            >
              {{ locale === 'en' ? p.labelEn : p.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { PERIODS, type WaterStation } from '../lib/waterLevel'
import { locale } from '../lib/locale'

defineProps<{ station: WaterStation }>()
defineEmits<{ close: []; select: [days: number] }>()
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

.picker {
  background: #12122a;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  width: 320px;
  max-width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #2a2a4a;
}

.station-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
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
.close-btn:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

.picker-body {
  padding: 18px 20px 20px;
}

.hint {
  font-size: 0.875rem;
  color: #888;
  margin: 0 0 14px;
  text-align: center;
}

.period-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.period-btn {
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  color: #ccc;
  font-size: 1rem;
  font-weight: 600;
  padding: 14px 0;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.period-btn:hover {
  background: #1e2d6b;
  border-color: #6c8ef5;
  color: #6c8ef5;
}
.period-btn:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }
</style>
