<template>
  <aside class="sidebar">
    <div class="title-row">
      <img src="/favicon-sidebar.png" class="sidebar-logo" alt="" />
      <h2 class="title">{{ locale === 'en' ? 'Taiwan Canyoning' : '台灣溪降地圖' }}</h2>
      <button class="close-sidebar-btn" @click="$emit('close')" :title="locale === 'en' ? 'Collapse' : '收合'">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        <span class="close-sidebar-text">{{ locale === 'en' ? 'Close' : '收合' }}</span>
      </button>
    </div>

    <div class="browse-switch" role="group" :aria-label="locale === 'en' ? 'Browse content' : '瀏覽內容'">
      <button
        :class="['browse-btn', { active: browseMode === 'route' }]"
        :aria-pressed="browseMode === 'route'"
        @click="emit('changeBrowseMode', 'route')"
      >TW</button>
      <button
        :class="['browse-btn', { active: browseMode === 'nz' }]"
        :aria-pressed="browseMode === 'nz'"
        @click="emit('changeBrowseMode', 'nz')"
      >NZ</button>
      <button
        :class="['browse-btn', { active: browseMode === 'hydrology' }]"
        :aria-pressed="browseMode === 'hydrology'"
        @click="emit('changeBrowseMode', 'hydrology')"
      >{{ locale === 'en' ? 'Hydrology' : '水文' }}</button>
    </div>

    <DifficultyGuide v-if="showGuide" :records="difficultyRecords" :loading="difficultyLoading" @close="showGuide = false" />

    <!-- Taiwan routes tab -->
    <template v-if="browseMode === 'route'">
      <div class="guide-row">
        <button class="guide-btn" @click.stop="openGuide">{{ locale === 'en' ? 'Grading Guide' : '難度說明' }}</button>
      </div>
      <div v-if="!routesLoading" class="list-count">
        <span>{{ canyonRoutes.length }} {{ locale === 'en' ? 'routes' : '條路線' }}</span>
        <button
          class="sort-btn"
          :title="sortDescending ? (locale === 'en' ? 'Sort easiest first' : '改為由易到難') : (locale === 'en' ? 'Sort hardest first' : '改為由難到易')"
          @click="$emit('toggleSort')"
        >{{ sortDescending ? (locale === 'en' ? 'Hardest first' : '由難到易') : (locale === 'en' ? 'Easiest first' : '由易到難') }}</button>
      </div>
      <ul ref="routeListRef" class="canyon-list">
        <li v-if="routesLoading" class="empty">{{ locale === 'en' ? 'Loading...' : '載入中...' }}</li>
        <template v-else>
          <li
            v-for="route in canyonRoutes"
            :key="route.id"
            :class="['canyon-item', { active: props.selectedRouteId === route.id }]"
            @click.stop="emit('showDetail', { kind: 'route', data: route })"
          >
            <div class="canyon-item-inner"><div class="canyon-right">
              <div class="canyon-name-row">
                <span class="canyon-name">{{ route.name }}</span>
                <span v-if="route.max_drop" class="canyon-drop"><span class="drop-label">{{ locale === 'en' ? 'Drop' : '瀑高' }}</span>{{ route.max_drop }}</span>
              </div>
              <div class="grade-badges">
                <span v-if="vPart(route.grading)" :class="['v-pill', vGradeClass(vPart(route.grading))]">{{ vPart(route.grading) }}</span>
                <span v-if="aPart(route.grading)" class="a-pill">{{ aPart(route.grading) }}</span>
                <span v-if="timePart(route.grading)" class="time-pill">{{ timePart(route.grading) }}</span>
                <span v-if="starsPart(route.grading)" class="stars-pill">{{ starsPart(route.grading) }}</span>
                <span v-if="!route.grading" class="type-badge type-badge--canyon">—</span>
              </div>
              <span class="canyon-location">{{ route.region }}</span>
            </div></div>
          </li>
          <li v-if="!canyonRoutes.length" class="empty">{{ locale === 'en' ? 'No results found' : '找不到符合的結果' }}</li>
        </template>
      </ul>
    </template>

    <!-- NZ routes tab -->
    <template v-else-if="browseMode === 'nz'">
      <div class="guide-row">
        <button class="guide-btn" @click.stop="openGuide">{{ locale === 'en' ? 'Grading Guide' : '難度說明' }}</button>
      </div>
      <div class="nz-search-row">
        <input
          v-model="nzQuery"
          class="nz-search-input"
          :placeholder="locale === 'en' ? 'Search NZ routes…' : '搜尋紐西蘭路線…'"
          type="search"
        />
      </div>
      <div class="list-count">
        <span>{{ filteredNzRoutes.length }} {{ locale === 'en' ? 'routes' : '條路線' }}</span>
      </div>
      <ul ref="routeListRef" class="canyon-list">
        <li v-if="routesLoading" class="empty">{{ locale === 'en' ? 'Loading...' : '載入中...' }}</li>
        <template v-else>
          <li
            v-for="route in filteredNzRoutes"
            :key="route.id"
            :class="['canyon-item', { active: props.selectedRouteId === route.id }]"
            @click.stop="emit('showDetail', { kind: 'nz', data: route })"
          >
            <div class="canyon-item-inner"><div class="canyon-right">
              <div class="canyon-name-row">
                <span class="canyon-name">{{ route.name }}</span>
                <span v-if="route.max_drop" class="canyon-drop"><span class="drop-label">{{ locale === 'en' ? 'Drop' : '瀑高' }}</span>{{ route.max_drop }}</span>
              </div>
              <div class="grade-badges">
                <span v-if="vPart(route.grading)" :class="['v-pill', vGradeClass(vPart(route.grading))]">{{ vPart(route.grading) }}</span>
                <span v-if="aPart(route.grading)" class="a-pill">{{ aPart(route.grading) }}</span>
                <span v-if="timePart(route.grading)" class="time-pill">{{ timePart(route.grading) }}</span>
                <span v-if="!route.grading" class="type-badge type-badge--canyon">—</span>
              </div>
              <span class="canyon-location">{{ route.region }}</span>
            </div></div>
          </li>
          <li v-if="!filteredNzRoutes.length" class="empty">{{ locale === 'en' ? 'No results found' : '找不到符合的結果' }}</li>
        </template>
      </ul>
    </template>

    <!-- Hydrology tab (station results) -->
    <template v-else>
      <div v-if="!routesLoading" class="list-count">
        <span>{{ waterStations.length + rainfallStations.length }} {{ locale === 'en' ? 'results' : '筆結果' }}</span>
      </div>
      <ul ref="routeListRef" class="canyon-list">
        <li v-if="routesLoading" class="empty">{{ locale === 'en' ? 'Loading...' : '載入中...' }}</li>
        <template v-else>
          <li
            v-for="station in waterStations"
            :key="`water-${station.id}`"
            :class="['canyon-item', { active: selectedStationKey === `water-${station.id}` }]"
          >
            <button class="station-item" @click.stop="emit('selectWaterStation', station)">
              <img src="/water-level.svg" class="station-icon" alt="" />
              <span class="station-copy">
                <span class="station-kind">{{ locale === 'en' ? 'Water level' : '水位站' }}</span>
                <strong :class="{ matched: matchesQuery(station.name) }">{{ station.name }}</strong>
                <small>
                  <span :class="{ matched: matchesQuery(station.river) }">{{ station.river || '—' }}</span>
                  <span v-if="station.river && station.address"> · </span>
                  <span :class="{ matched: matchesQuery(station.address) }">{{ station.address }}</span>
                </small>
              </span>
            </button>
          </li>
          <li
            v-for="station in rainfallStations"
            :key="`rain-${station.station_id}`"
            :class="['canyon-item', { active: selectedStationKey === `rain-${station.station_id}` }]"
          >
            <button class="station-item" @click.stop="emit('selectRainfallStation', station)">
              <img src="/rainfall.svg" class="station-icon" alt="" />
              <span class="station-copy">
                <span class="station-kind">{{ locale === 'en' ? 'Rainfall' : '雨量站' }}</span>
                <strong :class="{ matched: matchesQuery(station.name) }">{{ station.name }}</strong>
                <small :class="{ matched: matchesQuery(`${station.county} ${station.town}`) }">{{ station.county }} {{ station.town }}</small>
              </span>
            </button>
          </li>
          <li v-if="!waterStations.length && !rainfallStations.length" class="empty">{{ locale === 'en' ? 'No results found' : '找不到符合的結果' }}</li>
        </template>
      </ul>
    </template>
    <button class="mobile-close-btn" @click="$emit('close')">{{ locale === 'en' ? 'Close ✕' : '收起 ✕' }}</button>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { vGradeClass } from '../lib/grade'
import DifficultyGuide from './DifficultyGuide.vue'
import { pb } from '../lib/pb'
import { locale } from '../lib/locale'
import type { WaterStation } from '../lib/waterLevel'
import type { RainfallStation } from '../lib/rainfall'

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
  canyonRoutes: any[]
  nzRoutes: any[]
  routesLoading: boolean
  selectedId: string | null
  selectedRouteId: string | null
  selectedStationKey: string | null
  sortDescending: boolean
  browseMode: 'route' | 'nz' | 'hydrology'
  searchQuery: string
  waterStations: WaterStation[]
  rainfallStations: RainfallStation[]
}>()

const emit = defineEmits<{
  select: [id: string]
  close: []
  toggleSort: []
  changeBrowseMode: [mode: 'route' | 'nz' | 'hydrology']
  showDetail: [item: { kind: 'canyon' | 'route' | 'nz', data: any }]
  selectWaterStation: [station: WaterStation]
  selectRainfallStation: [station: RainfallStation]
}>()

const nzQuery = ref('')

const filteredNzRoutes = computed(() => {
  const q = nzQuery.value.trim().toLowerCase().replace(/臺/g, '台')
  if (!q) return props.nzRoutes
  return props.nzRoutes.filter(r =>
    [r.name, r.name_en, r.region, r.region_en, r.grading, r.note]
      .some(v => String(v ?? '').toLowerCase().replace(/臺/g, '台').includes(q))
  )
})

function matchesQuery(value: unknown): boolean {
  const q = props.searchQuery.trim().toLowerCase().replace(/臺/g, '台')
  return !!q && String(value ?? '').toLowerCase().replace(/臺/g, '台').includes(q)
}

const routeListRef = ref<HTMLElement | null>(null)

watch(() => [props.selectedRouteId, props.selectedStationKey], async ([routeId, stationKey]) => {
  if ((!routeId && !stationKey) || !routeListRef.value) return
  await nextTick()
  routeListRef.value.querySelector('.canyon-item.active')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
})

// Grade component parsers — case-insensitive so NZ (v4 a4) and TW (V4 A4) both match
function vPart(grading: string): string { return grading?.match(/v\d+/i)?.[0].toUpperCase() ?? '' }
function aPart(grading: string): string { return grading?.match(/a\d+/i)?.[0].toUpperCase() ?? '' }
function timePart(grading: string): string { return grading?.replace(/v\d+|a\d+/gi, '').match(/VI|IV|V|III|II|I/i)?.[0].toUpperCase() ?? '' }
function starsPart(grading: string): string {
  return (grading ?? '').replace(/v\d+|a\d+|VI|IV|V|III|II|I/gi, '').trim()
}



</script>

<style scoped>
.sidebar {
  width: 100%;
  min-width: 0;
  height: 100dvh;
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
  gap: 10px;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #2a2a4a;
}

.sidebar-logo {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  flex-shrink: 0;
}

.title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #6c8ef5;
  margin: 0;
  line-height: 1.2;
  white-space: nowrap;
}

.browse-switch {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4px;
  margin: 8px 16px 4px;
  padding: 3px;
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  background: #12122a;
  flex-shrink: 0;
}

.nz-search-row {
  padding: 8px 16px 0;
  flex-shrink: 0;
}

.nz-search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid #2a2a4a;
  background: #12122a;
  color: #e0e0e0;
  font-size: 0.85rem;
  outline: none;
}

.nz-search-input:focus {
  border-color: #6c8ef5;
}

[data-theme="light"] .nz-search-input {
  background: #f4f4f8;
  color: #1a1a2e;
  border-color: #c8c8d8;
}

[data-theme="light"] .nz-search-input:focus {
  border-color: #4a6cf7;
}

.browse-btn {
  min-height: 32px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #888;
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;
}

.browse-btn.active {
  background: #1e2d6b;
  color: #fff;
  font-weight: 600;
}

.browse-btn:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

:global(html[data-theme='light']) .browse-switch {
  background: #d7e0e8;
  border-color: #bcc7d1;
}

:global(html[data-theme='light']) .browse-btn { color: #64748b; }
:global(html[data-theme='light']) .browse-btn.active { background: #4f6fd8; color: #fff; }

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
  font-size: 0.75rem;
  cursor: pointer;
  outline: none;
}

.filter-select:focus { border-color: #6c8ef5; }

.guide-row {
  padding: 4px 16px 8px;
  border-bottom: 1px solid #2a2a4a;
  flex-shrink: 0;
}

.guide-btn {
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 10px;
  border: 1px solid #3a3a5a;
  background: transparent;
  color: #888;
  cursor: pointer;
  transition: all 0.15s;
}
.guide-btn:hover { border-color: #6c8ef5; color: #6c8ef5; }
.guide-btn:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

.title-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.lang-btn {
  background: none;
  border: 1px solid #3a3a5a;
  color: #888;
  font-size: 0.7rem;
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
  letter-spacing: 0.3px;
  transition: all 0.15s;
}
.lang-btn:hover { border-color: #6c8ef5; color: #6c8ef5; }
.lang-btn:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

.close-sidebar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: color 0.15s;
}
.close-sidebar-btn:hover { color: #aaa; }
.close-sidebar-btn:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

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
.region-tab:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

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
  font-size: 0.75rem;
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
.type-tab:focus-visible { outline: 2px solid #6c8ef5; outline-offset: -2px; }

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
  font-size: 0.875rem;
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
.search-clear:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

/* List */
.canyon-list {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}


.list-count {
  padding: 6px 16px;
  font-size: 0.8rem;
  color: #999;
  border-bottom: 1px solid #2a2a4a;
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.sort-btn {
  padding: 2px 0;
  border: 0;
  background: none;
  color: #6c8ef5;
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  white-space: nowrap;
}

.sort-btn:hover { color: #91a8ff; }
.sort-btn:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

.canyon-item {
  padding: 10px 16px;
  border-bottom: 1px solid #2a2a4a;
  cursor: pointer;
  transition: background 0.15s;
}

.canyon-item:hover { background: #252545; }
.canyon-item.active { background: #1e2d6b; border-left: 3px solid #6c8ef5; }

.station-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: 0;
  padding: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.station-item:focus-visible { outline: 2px solid #6c8ef5; outline-offset: 2px; }

.station-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
}

.station-copy {
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 2px 7px;
  align-items: baseline;
}

.station-kind { color: #6c8ef5; font-size: 0.68rem; }
.station-copy strong { color: #fff; font-size: 0.85rem; overflow-wrap: anywhere; }
.station-copy small { grid-column: 1 / -1; color: #777; font-size: 0.7rem; overflow-wrap: anywhere; }
.station-copy .matched { color: #b5c6ff; font-weight: 700; }

.canyon-item-inner {
  display: flex;
}

.canyon-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.canyon-name-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.canyon-drop {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #f5a030;
  line-height: 1.3;
}

.drop-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #9aa3b8;
}

.canyon-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: #fff;
  line-height: 1.3;
  white-space: pre-line;
}

.grade-badges {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

/* V-grade difficulty color scale: V1 (green/safe) → V6 (purple/extreme) */
.v-pill {
  font-size: 0.7rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.3px;
}
.v-pill:is(.v1,.v2,.v3,.v4,.v5,.v6) { background: var(--vg-bg); color: var(--vg-fg); }

/* A-grade: sky blue (matches RouteDetail water tag) */
.a-pill {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: #0e2a3a;
  color: #38bdf8;
}
/* Time grade: orange (matches RouteDetail time tag) */
.time-pill {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: #2a1e0e;
  color: #f5a030;
}
/* Stars: gold, no bg — they're decoration not data */
.stars-pill {
  font-size: 0.7rem;
  color: #f0a030;
  letter-spacing: 1px;
}

.type-badge {
  font-size: 0.7rem;
  padding: 2px 7px;
  border-radius: 10px;
  font-weight: 500;
}

.type-badge--river     { background: #1e2d6b; color: #6c8ef5; }
.type-badge--canyon    { background: #3a2800; color: #f5a030; }
.type-badge--hotspring { background: #3a1020; color: #f56c8e; }

.canyon-location { font-size: 0.72rem; color: #666; }

.empty {
  padding: 20px 16px;
  color: #999;
  font-size: 0.875rem;
  text-align: center;
}

.mobile-close-btn {
  display: none;
}

@media (max-width: 640px) {
  .close-sidebar-btn {
    border: 1px solid #3a3a5a;
    color: #d6defd;
    background: #12122a;
  }

  .close-sidebar-text {
    display: inline;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .mobile-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 18px;
    background: #12122a;
    border: none;
    border-top: 1px solid #2a2a4a;
    color: #888;
    font-size: 0.95rem;
    cursor: pointer;
    position: sticky;
    bottom: 0;
    flex-shrink: 0;
  }
  .mobile-close-btn:hover { color: #ccc; }
}

@media (min-width: 641px) {
  .close-sidebar-text {
    display: none;
  }
}
</style>
