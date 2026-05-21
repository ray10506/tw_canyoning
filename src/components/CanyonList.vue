<template>
  <aside class="sidebar">
    <h2 class="title">路線探索</h2>

    <div class="type-tabs">
      <button
        :class="['type-tab', { active: selectedType === null }]"
        @click="$emit('filterType', null)"
      >全部</button>
      <button
        v-for="t in routeTypes"
        :key="t.value"
        :class="['type-tab', `type-tab--${t.key}`, { active: selectedType === t.value }]"
        @click="$emit('filterType', t.value)"
      >{{ t.value }}</button>
    </div>

    <div class="search-section">
      <input
        v-model="searchQuery"
        class="search-input"
        type="text"
        placeholder="搜尋地點名稱或縣市..."
        @input="$emit('search', searchQuery)"
      />
    </div>

    <div class="filter-section">
      <p class="filter-label">難度篩選</p>
      <div class="filter-buttons">
        <button
          :class="['filter-btn', { active: selectedDifficulty === null }]"
          @click="$emit('filter', null)"
        >全部</button>
        <button
          v-for="d in [1, 2, 3, 4, 5]"
          :key="d"
          :class="['filter-btn', { active: selectedDifficulty === d }]"
          @click="$emit('filter', d)"
        >Lv.{{ d }}</button>
      </div>
    </div>

    <ul class="canyon-list">
      <li
        v-for="canyon in canyons"
        :key="canyon.id"
        :class="['canyon-item', { active: selectedId === canyon.id }]"
        @click="$emit('select', canyon.id)"
      >
        <div class="canyon-header">
          <span class="canyon-name">{{ canyon.name }}</span>
          <span :class="['type-badge', `type-badge--${typeKey(canyon.type)}`]">{{ canyon.type }}</span>
        </div>
        <div class="canyon-meta">
          <span class="canyon-location">{{ canyon.location }}</span>
          <span class="canyon-difficulty">{{ '★'.repeat(canyon.difficulty) }}{{ '☆'.repeat(5 - canyon.difficulty) }}</span>
        </div>
        <div class="canyon-season">{{ canyon.season.join('、') }}</div>
      </li>
      <li v-if="canyons.length === 0" class="empty">查無符合的地點</li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Canyon, RouteType } from '../data/canyon'

defineProps<{
  canyons: Canyon[]
  selectedId: number | null
  selectedDifficulty: number | null
  selectedType: RouteType | null
}>()

defineEmits<{
  select: [id: number]
  filter: [difficulty: number | null]
  filterType: [type: RouteType | null]
  search: [query: string]
}>()

const searchQuery = ref('')

const routeTypes = [
  { value: '溯溪' as RouteType, key: 'river' },
  { value: '溪降' as RouteType, key: 'canyon' },
  { value: '野溪溫泉' as RouteType, key: 'hotspring' },
]

function typeKey(type: RouteType) {
  return { '溯溪': 'river', '溪降': 'canyon', '野溪溫泉': 'hotspring' }[type]
}
</script>

<style scoped>
.sidebar {
  width: 280px;
  min-width: 280px;
  height: 100vh;
  background: #1a1a2e;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.title {
  font-size: 1.1rem;
  font-weight: 700;
  padding: 20px 16px 12px;
  border-bottom: 1px solid #2a2a4a;
  color: #fff;
}

/* Type tabs */
.type-tabs {
  display: flex;
  border-bottom: 1px solid #2a2a4a;
}

.type-tab {
  flex: 1;
  padding: 10px 4px;
  border: none;
  background: transparent;
  color: #888;
  font-size: 0.78rem;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}

.type-tab:hover {
  color: #ccc;
}

.type-tab.active {
  color: #fff;
  font-weight: 600;
}

.type-tab--river.active   { border-bottom-color: #6c8ef5; color: #6c8ef5; }
.type-tab--canyon.active  { border-bottom-color: #f5a030; color: #f5a030; }
.type-tab--hotspring.active { border-bottom-color: #f56c8e; color: #f56c8e; }

/* Search */
.search-section {
  padding: 12px 16px;
  border-bottom: 1px solid #2a2a4a;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #3a3a5a;
  background: #12122a;
  color: #e0e0e0;
  font-size: 0.85rem;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.search-input::placeholder { color: #555; }
.search-input:focus { border-color: #6c8ef5; }

/* Difficulty filter */
.filter-section {
  padding: 12px 16px;
  border-bottom: 1px solid #2a2a4a;
}

.filter-label {
  font-size: 0.75rem;
  color: #888;
  margin-bottom: 8px;
}

.filter-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-btn {
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid #3a3a5a;
  background: transparent;
  color: #ccc;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-btn:hover { border-color: #6c8ef5; color: #6c8ef5; }
.filter-btn.active { background: #6c8ef5; border-color: #6c8ef5; color: #fff; }

/* List */
.canyon-list {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}

.canyon-item {
  padding: 12px 16px;
  border-bottom: 1px solid #2a2a4a;
  cursor: pointer;
  transition: background 0.15s;
}

.canyon-item:hover { background: #252545; }
.canyon-item.active { background: #1e2d6b; border-left: 3px solid #6c8ef5; }

.canyon-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.canyon-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: #fff;
}

.type-badge {
  font-size: 0.68rem;
  padding: 2px 7px;
  border-radius: 10px;
  font-weight: 500;
}

.type-badge--river     { background: #1e2d6b; color: #6c8ef5; }
.type-badge--canyon    { background: #3a2800; color: #f5a030; }
.type-badge--hotspring { background: #3a1020; color: #f56c8e; }

.canyon-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}

.canyon-location { font-size: 0.75rem; color: #888; }
.canyon-difficulty { font-size: 0.75rem; color: #f0a030; letter-spacing: 1px; }
.canyon-season { font-size: 0.75rem; color: #6abf8a; }

.empty {
  padding: 20px 16px;
  color: #666;
  font-size: 0.85rem;
  text-align: center;
}
</style>
