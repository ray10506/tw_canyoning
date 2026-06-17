<template>
  <div class="app-layout">
    <div v-if="loading" class="loading-overlay">
      <span>載入資料中...</span>
    </div>
    <div v-else-if="loadError" class="loading-overlay error">
      <span>無法連線到資料庫，請確認 PocketBase 是否已啟動</span>
    </div>
    <template v-else>
      <div
        :class="['sidebar-wrap', { closed: !sidebarOpen, resizing: isResizing }]"
        :style="sidebarOpen ? { width: sidebarWidth + 'px' } : {}"
      >
        <CanyonList
          :canyons="filteredCanyons"
          :canyon-routes="filteredRoutes"
          :routes-loading="routesLoading"
          :selected-id="selectedId"
          :selected-route-id="selectedRouteId"
          :selected-difficulty="selectedDifficulty"
          :selected-type="selectedType"
          :selected-region="selectedRegion"
          @select="selectedId = $event"
          @filter="onFilter"
          @filter-type="onFilterType"
          @filter-region="toggleRegion($event)"
          @search="onSearch"
          @close="sidebarOpen = false"
          @show-detail="detailItem = $event"
          @route-filter="routeFilter = $event"
        />
        <div v-if="sidebarOpen" class="resize-handle" @mousedown="startResize" />
      </div>
      <div class="map-container">
        <button v-if="!sidebarOpen" class="sidebar-open-btn" @click="sidebarOpen = true">
          &#9654;
        </button>
        <Map
          :canyons="selectedType === '溪降' ? [] : filteredCanyons"
          :selected-id="selectedId"
          :focus-point="routeFocusPoint"
          :route-track="routeTrack"
          :canyon-route-markers="canyonRouteMarkers"
          :selected-route-id="selectedRouteId"
          @select-route="onSelectRoute"
          @select-water-station="waterStationPicker = $event"
        />
      </div>
      <RouteDetail
        v-if="detailItem"
        :item="detailItem"
        :init-pos="cardInitPos"
        @close="detailItem = null"
      />
      <WaterStationPeriodPicker
        v-if="waterStationPicker"
        :station="waterStationPicker"
        @select="onSelectWaterPeriod"
        @close="waterStationPicker = null"
      />
      <WaterStationDetail
        v-if="waterStationDetail"
        :station="waterStationDetail.station"
        :days="waterStationDetail.days"
        @close="waterStationDetail = null"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import Map from './components/Map.vue'
import CanyonList from './components/CanyonList.vue'
import RouteDetail from './components/RouteDetail.vue'
import WaterStationDetail from './components/WaterStationDetail.vue'
import WaterStationPeriodPicker from './components/WaterStationPeriodPicker.vue'
import { pb } from './lib/pb'
import type { Canyon, RouteType } from './data/canyon'
import type { WaterStation } from './lib/waterLevel'

const sidebarOpen  = ref(true)
const detailItem   = ref<{ kind: 'canyon' | 'route', data: any } | null>(null)
const sidebarWidth = ref(280)
const waterStationPicker = ref<WaterStation | null>(null)
const waterStationDetail = ref<{ station: WaterStation; days: number } | null>(null)

function onSelectWaterPeriod(days: number) {
  if (!waterStationPicker.value) return
  waterStationDetail.value = { station: waterStationPicker.value, days }
  waterStationPicker.value = null
}

const routeFocusPoint = computed((): [number, number] | null => {
  if (detailItem.value?.kind !== 'route') return null
  const gps = detailItem.value.data.gps?.trim()
  if (!gps) return null
  const parts = gps.split(/[,\s]+/).map(Number)
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1]))
    return [parts[0], parts[1]]
  return null
})

const cardInitPos = computed((): { x: number; y: number } | null => {
  if (detailItem.value?.kind !== 'route') return null
  const gps = detailItem.value.data.gps?.trim()
  if (!gps) return null

  const mapLeft = sidebarOpen.value ? sidebarWidth.value : 0
  const mapCenterX = mapLeft + (window.innerWidth - mapLeft) / 2
  const mapCenterY = window.innerHeight / 2
  const cardW = 380
  const cardH = 420
  const gap = 24

  const rawX = mapCenterX + gap + cardW <= window.innerWidth
    ? mapCenterX + gap
    : mapCenterX - gap - cardW

  const x = Math.max(0, Math.min(rawX, window.innerWidth - cardW))
  const y = Math.max(0, Math.min(mapCenterY + gap, window.innerHeight - cardH - gap))
  return { x, y }
})
const isResizing   = ref(false)

function startResize(e: MouseEvent) {
  isResizing.value = true
  e.preventDefault()
  const onMove = (ev: MouseEvent) => {
    const max = window.innerWidth / 2
    sidebarWidth.value = Math.min(Math.max(ev.clientX, 200), max)
  }
  const onUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

const canyons = ref<Canyon[]>([])
const loading = ref(true)
const loadError = ref(false)

const canyonRoutes = ref<any[]>([])
const routesLoaded = ref(false)
const routesLoading = ref(false)
const routeFilter = ref({ v: '', a: '', t: '', drop: '' })

const selectedDifficulty = ref<number | null>(null)
const selectedType = ref<RouteType | null>('溪降')
const selectedId = ref<string | null>(null)
const searchQuery = ref('')
const selectedRegion = ref<string[]>([])

const routeTrack = computed(() => {
  if (detailItem.value?.kind !== 'route') return null
  const d = detailItem.value.data
  if (!d.gpx_track) return null
  try {
    const mapLeft = sidebarOpen.value ? sidebarWidth.value : 0
    const mapCenterX = mapLeft + (window.innerWidth - mapLeft) / 2
    const cardW = 380
    const gap = 24
    const cardOnRight = mapCenterX + gap + cardW <= window.innerWidth
    return {
      track: JSON.parse(d.gpx_track),
      waypoints: d.gpx_waypoints ? JSON.parse(d.gpx_waypoints) : [],
      pad: cardOnRight
        ? { paddingTopLeft: [40, 40] as [number, number], paddingBottomRight: [cardW + gap * 2, 40] as [number, number] }
        : { paddingTopLeft: [cardW + gap * 2, 40] as [number, number], paddingBottomRight: [40, 40] as [number, number] },
    }
  } catch { return null }
})

const canyonRouteMarkers = computed(() => {
  if (selectedType.value !== '溪降') return []
  return filteredRoutes.value.flatMap(r => {
    const gps = r['gps']?.trim()
    if (!gps) return []
    const parts = gps.split(/[,\s]+/).map(Number)
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return []
    return [{ id: r['id'], lat: parts[0], lon: parts[1], name: r['name'] }]
  })
})

function onSelectRoute(id: string) {
  const route = canyonRoutes.value.find(r => r.id === id)
  if (route) detailItem.value = { kind: 'route', data: route }
}

const REGION_KEYWORDS: Record<string, string[]> = {
  '北部': ['台北', '臺北', '新北', '基隆', '桃園', '新竹', '宜蘭'],
  '中部': ['苗栗', '台中', '臺中', '彰化', '南投', '雲林'],
  '南部': ['嘉義', '台南', '臺南', '高雄', '屏東', '澎湖'],
  '東部': ['花蓮', '台東', '臺東'],
}

function toggleRegion(region: string) {
  const i = selectedRegion.value.indexOf(region)
  if (i === -1) selectedRegion.value.push(region)
  else selectedRegion.value.splice(i, 1)
}

function matchRegion(text: string, regions: string[]): boolean {
  if (regions.length === 0) return true
  return regions.some(r => (REGION_KEYWORDS[r] ?? []).some(k => text.includes(k)))
}

const selectedRouteId = computed(() =>
  detailItem.value?.kind === 'route' ? detailItem.value.data.id : null
)

watch(detailItem, item => { if (!item) selectedId.value = null })

onMounted(async () => {
  routesLoading.value = true
  pb.collection('canyon_routes').getFullList({ sort: 'name' }).then(records => {
    canyonRoutes.value = records
    routesLoaded.value = true
  }).finally(() => { routesLoading.value = false })

  try {
    const records = await pb.collection('canyons').getFullList({ sort: 'name' })
    canyons.value = records.map(r => ({
      id: r.id,
      name: r['name'],
      location: r['location'],
      coordinates: [r['lat'], r['lng']] as [number, number],
      difficulty: r['difficulty'],
      type: r['type'],
      season: r['season'],
      description: r['description'],
    }))
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
})

function parseMeters(val: string): number {
  const m = (val ?? '').match(/(\d+(?:\.\d+)?)/)
  return m ? parseFloat(m[1]) : 0
}

const filteredRoutes = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const { v, a, t, drop } = routeFilter.value
  return canyonRoutes.value.filter(r => {
    const hasGps = r['gps']?.trim()
    if (!hasGps) return false
    if (!matchRegion(r['region'] ?? '', selectedRegion.value)) return false
    const matchSearch = !q || r['name']?.toLowerCase().includes(q) || r['region']?.toLowerCase().includes(q)
    const grading = (r['grading'] ?? '').split(/\s+/)
    const matchV = !v || grading.some((p: string) => p === v)
    const matchA = !a || grading.some((p: string) => p === a)
    const matchT = !t || grading.some((p: string) => p === t)
    const d = parseMeters(r['max_drop'])
    const matchDrop = !drop
      || (drop === '≤20'  && d <= 20)
      || (drop === '21-40' && d > 20 && d <= 40)
      || (drop === '41-60' && d > 40 && d <= 60)
      || (drop === '>60'  && d > 60)
    return matchSearch && matchV && matchA && matchT && matchDrop
  })
})

const filteredCanyons = computed(() => {
  return canyons.value.filter(c => {
    const matchType = selectedType.value === null || c.type === selectedType.value
    const matchDifficulty = selectedDifficulty.value === null || c.difficulty === selectedDifficulty.value
    const q = searchQuery.value.trim().toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q)
    return matchType && matchDifficulty && matchSearch && matchRegion(c.location, selectedRegion.value)
  })
})

function onFilter(difficulty: number | null) {
  selectedDifficulty.value = difficulty
  selectedId.value = null
}

async function onFilterType(type: RouteType | null) {
  selectedType.value = type
  selectedId.value = null
  if (type === '溪降' && !routesLoaded.value && !routesLoading.value) {
    routesLoading.value = true
    try {
      canyonRoutes.value = await pb.collection('canyon_routes').getFullList({ sort: 'name' })
      routesLoaded.value = true
    } finally {
      routesLoading.value = false
    }
  }
}

function onSearch(query: string) {
  searchQuery.value = query
  selectedId.value = null
}
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar-wrap {
  position: relative;
  width: 280px;
  min-width: 280px;
  transition: width 0.3s ease, min-width 0.3s ease, opacity 0.3s ease;
  overflow: visible;
}

.sidebar-wrap.closed {
  width: 0 !important;
  min-width: 0;
  opacity: 0;
  overflow: hidden;
}

.sidebar-wrap.resizing {
  transition: none;
  user-select: none;
}

.resize-handle {
  position: absolute;
  top: 0;
  right: -3px;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  z-index: 100;
  background: transparent;
}

.resize-handle:hover,
.sidebar-wrap.resizing .resize-handle {
  background: #6c8ef5;
  opacity: 0.5;
}

.map-container {
  flex: 1;
  position: relative;
}

.sidebar-open-btn {
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  z-index: 1000;
  background: #1a1a2e;
  color: #6c8ef5;
  border: none;
  border-radius: 0 8px 8px 0;
  padding: 16px 8px;
  cursor: pointer;
  font-size: 0.8rem;
  box-shadow: 2px 0 8px rgba(0,0,0,0.3);
  transition: background 0.15s;
}

.sidebar-open-btn:hover {
  background: #252545;
}

.loading-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: #888;
  background: #f8f8f8;
}

.loading-overlay.error {
  color: #e05c5c;
}
</style>
