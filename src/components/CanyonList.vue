<template>
  <aside class="sidebar">
    <div class="title-row">
      <h2 class="title">台灣溪谷路線探索</h2>
      <button class="close-sidebar-btn" @click="$emit('close')" title="收合">&#9664;</button>
    </div>

    <DifficultyGuide v-if="showGuide" :records="difficultyRecords" :loading="difficultyLoading" @close="showGuide = false" />

    <div class="region-tabs">
      <button
        v-for="r in regions"
        :key="r.value"
        :class="['region-tab', { active: selectedRegion.includes(r.value) }]"
        @click="$emit('filterRegion', r.value)"
      >{{ r.label }}</button>
    </div>

    <div class="type-tabs">
      <button
        v-for="t in routeTypes"
        :key="t.value"
        :class="['type-tab', `type-tab--${t.key}`, { active: selectedType === t.value }]"
        @click="$emit('filterType', t.value)"
      >{{ t.value }}</button>
    </div>

    <div class="search-section">
      <div class="search-wrap">
        <input
          v-model="searchQuery"
          class="search-input"
          type="text"
          placeholder="搜尋地點名稱或縣市..."
          @input="$emit('search', searchQuery)"
        />
        <button v-if="searchQuery" class="search-clear" @click="clearSearch">✕</button>
      </div>
    </div>

    <!-- 溪降篩選 -->
    <div v-if="selectedType === '溪降'" class="route-filters">
      <div class="filter-row">
        <select v-model="filterV" @change="emitRouteFilter" class="filter-select">
          <option value="">V 全部</option>
          <option v-for="v in vOptions" :key="v" :value="v">{{ v }}</option>
        </select>
        <select v-model="filterA" @change="emitRouteFilter" class="filter-select">
          <option value="">A 全部</option>
          <option v-for="a in aOptions" :key="a" :value="a">{{ a }}</option>
        </select>
      </div>
      <div class="filter-row">
        <select v-model="filterT" @change="emitRouteFilter" class="filter-select">
          <option value="">T 全部</option>
          <option v-for="t in tOptions" :key="t" :value="t">{{ t }}</option>
        </select>
        <select v-model="filterDrop" @change="emitRouteFilter" class="filter-select">
          <option value="">落差 全部</option>
          <option value="≤20">≤ 20m</option>
          <option value="21-40">21–40m</option>
          <option value="41-60">41–60m</option>
          <option value=">60">> 60m</option>
        </select>
      </div>
    </div>

    <!-- 一般路線列表 -->
    <ul v-if="selectedType !== '溪降'" class="canyon-list">
      <li
        v-for="canyon in canyons"
        :key="canyon.id"
        :class="['canyon-item', { active: selectedId === canyon.id }]"
        @click.stop="emit('select', canyon.id); emit('showDetail', { kind: 'canyon', data: canyon })"
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

    <!-- 溪降路線列表 -->
    <ul v-else class="canyon-list">
      <li class="guide-row">
        <button class="guide-btn" @click.stop="openGuide">難度說明</button>
      </li>
      <li v-if="routesLoading" class="empty">載入中...</li>
      <template v-else>
        <li
          v-for="route in canyonRoutes"
          :key="route.id"
          :class="['canyon-item', { active: props.selectedRouteId === route.id }]"
          @click.stop="emit('showDetail', { kind: 'route', data: route })"
        >
          <div class="canyon-header">
            <span class="canyon-name">{{ route.name }}</span>
            <span class="type-badge type-badge--canyon">{{ route.grading || '—' }}</span>
          </div>
          <div class="canyon-meta">
            <span class="canyon-location">{{ route.region }}</span>
            <span class="route-rappel">{{ route.max_drop || '' }}</span>
          </div>
          <div class="route-meta">
            <span v-if="route.approach">接近 {{ route.approach }}</span>
            <span v-if="route.total_time">全程 {{ route.total_time }}</span>
          </div>
        </li>
        <li v-if="canyonRoutes.length === 0" class="empty">查無符合的路線</li>
      </template>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Canyon, RouteType } from '../data/canyon'
import DifficultyGuide from './DifficultyGuide.vue'
import { pb } from '../lib/pb'

const showGuide = ref(false)
const difficultyRecords = ref<any[]>([])
const difficultyLoaded = ref(false)
const difficultyLoading = ref(false)

async function openGuide() {
  showGuide.value = true
  if (!difficultyLoaded.value) {
    difficultyLoading.value = true
    try {
      difficultyRecords.value = await pb.collection('difficulty_levels').getFullList({ sort: 'sort_order' })
      difficultyLoaded.value = true
    } finally {
      difficultyLoading.value = false
    }
  }
}

const props = defineProps<{
  canyons: Canyon[]
  canyonRoutes: any[]
  routesLoading: boolean
  selectedId: string | null
  selectedRouteId: string | null
  selectedDifficulty: number | null
  selectedType: RouteType | null
  selectedRegion: string[]
}>()

const emit = defineEmits<{
  select: [id: string]
  filter: [difficulty: number | null]
  filterType: [type: RouteType | null]
  filterRegion: [region: string]
  search: [query: string]
  close: []
  showDetail: [item: { kind: 'canyon' | 'route', data: any }]
  routeFilter: [f: { v: string, a: string, t: string, drop: string }]
}>()

const searchQuery = ref('')
const filterV    = ref('')
const filterA    = ref('')
const filterT    = ref('')
const filterDrop = ref('')

const vOptions = ['V1','V2','V3','V4','V5','V6','V7']
const aOptions = ['A1','A2','A3','A4','A5','A6','A7']
const tOptions = ['I','II','III','IV','V','VI']

function clearSearch() {
  searchQuery.value = ''
  emit('search', '')
}

function emitRouteFilter() {
  emit('routeFilter', { v: filterV.value, a: filterA.value, t: filterT.value, drop: filterDrop.value })
}

watch(() => props.selectedType, () => {
  searchQuery.value = ''
  filterV.value = ''
  filterA.value = ''
  filterT.value = ''
  filterDrop.value = ''
  emit('search', '')
  emit('routeFilter', { v: '', a: '', t: '', drop: '' })
})

const routeTypes = [
  { value: '溪降' as RouteType, key: 'canyon' },
  { value: '溯溪' as RouteType, key: 'river' },
  { value: '野溪溫泉' as RouteType, key: 'hotspring' },
]

const regions = [
  { value: '北部', label: '北部' },
  { value: '中部', label: '中部' },
  { value: '南部', label: '南部' },
  { value: '東部', label: '東部' },
]

function typeKey(type: RouteType) {
  return { '溯溪': 'river', '溪降': 'canyon', '野溪溫泉': 'hotspring' }[type]
}
</script>

<style scoped>
.sidebar {
  width: 100%;
  min-width: 0;
  height: 100vh;
  background: #1a1a2e;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #2a2a4a;
}

.title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
}

.route-filters {
  padding: 10px 16px;
  border-bottom: 1px solid #2a2a4a;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-row {
  display: flex;
  gap: 6px;
}

.filter-select {
  flex: 1;
  padding: 5px 8px;
  border-radius: 6px;
  border: 1px solid #3a3a5a;
  background: #12122a;
  color: #ccc;
  font-size: 0.78rem;
  cursor: pointer;
  outline: none;
}

.filter-select:focus { border-color: #6c8ef5; }

.guide-row {
  padding: 10px 16px;
  border-bottom: 1px solid #2a2a4a;
  list-style: none;
}

.guide-btn {
  font-size: 0.72rem;
  padding: 4px 10px;
  border-radius: 10px;
  border: 1px solid #3a3a5a;
  background: transparent;
  color: #888;
  cursor: pointer;
  transition: all 0.15s;
}
.guide-btn:hover { border-color: #6c8ef5; color: #6c8ef5; }

.close-sidebar-btn {
  background: none;
  border: none;
  color: #555;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: color 0.15s;
}
.close-sidebar-btn:hover { color: #aaa; }

/* Region tabs */
.region-tabs {
  display: flex;
  padding: 8px 12px;
  gap: 6px;
  border-bottom: 1px solid #2a2a4a;
}

.region-tab {
  flex: 1;
  padding: 5px 4px;
  border: 1px solid #3a3a5a;
  border-radius: 6px;
  background: transparent;
  color: #888;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}
.region-tab:hover { border-color: #6c8ef5; color: #ccc; }
.region-tab.active { background: #6c8ef5; border-color: #6c8ef5; color: #fff; font-weight: 600; }

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

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 8px 32px 8px 12px;
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

.search-clear {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: #555;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 2px 4px;
  line-height: 1;
  border-radius: 3px;
  transition: color 0.15s;
}
.search-clear:hover { color: #aaa; }

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

.route-meta {
  display: flex;
  gap: 10px;
  font-size: 0.72rem;
  color: #6abf8a;
}

.route-rappel { font-size: 0.75rem; color: #f5a030; }

.empty {
  padding: 20px 16px;
  color: #666;
  font-size: 0.85rem;
  text-align: center;
}
</style>
