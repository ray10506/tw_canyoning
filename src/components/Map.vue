<template>
  <div class="map-wrapper">
    <div id="map"></div>
    <select class="map-mode-select" :value="selectedTile" @change="onTileChange">
      <option v-for="t in tileOptions" :key="t.key" :value="t.key">{{ t.label }}</option>
    </select>
    <button class="layers-fab" @click="showLayersPanel = !showLayersPanel" :class="{ active: showLayersPanel }">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    </button>
    <div v-if="showLayersPanel" class="layers-panel">
      <div class="layers-header">
        <span class="layers-title">圖層</span>
        <button class="layers-close" @click="showLayersPanel = false">✕</button>
      </div>
      <div class="layers-list">
        <div class="layer-row">
          <span class="layer-icon">💧</span>
          <span class="layer-label">水位站 River Level</span>
          <label class="toggle-switch">
            <input type="checkbox" v-model="showWaterStations" />
            <span class="toggle-track" :class="{ on: showWaterStations }">
              <span class="toggle-thumb"></span>
            </span>
          </label>
        </div>
        <div class="layer-row">
          <span class="layer-icon">🌂</span>
          <span class="layer-label">雨量站 Rain Gauge</span>
          <label class="toggle-switch">
            <input type="checkbox" v-model="showRainfallStations" />
            <span class="toggle-track" :class="{ on: showRainfallStations }">
              <span class="toggle-thumb"></span>
            </span>
          </label>
        </div>
      </div>
    </div>
    <div v-if="loadingRivers" class="river-loading">載入溪流資料中...</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref } from 'vue'
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { Canyon } from '../data/canyon'
import waterStations from '../data/water-stations.json'
import type { WaterStation } from '../lib/waterLevel'
import { rainfallStations, type RainfallStation } from '../lib/rainfall'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

interface WaypointData { lat: number; lon: number; name: string; seq?: number; time?: string }
interface RouteTrack {
  track: [number, number][] | [number, number][][]
  waypoints: WaypointData[]
  pad?: { paddingTopLeft: [number, number]; paddingBottomRight: [number, number] }
}

interface RouteMarker { id: string; lat: number; lon: number; name: string }

const props = defineProps<{
  canyons: Canyon[]
  selectedId: string | null
  focusPoint: [number, number] | null
  routeTrack: RouteTrack | null
  canyonRouteMarkers: RouteMarker[]
  selectedRouteId: string | null
}>()

const emit = defineEmits<{ selectRoute: [id: string]; selectWaterStation: [station: WaterStation]; selectRainfallStation: [station: RainfallStation] }>()

let map: L.Map | null = null
let markers: L.Marker[] = []
let focusMarker: L.Marker | null = null
let trackLayer: L.Polyline | null = null
let waypointMarkers: L.Marker[] = []
let routeMarkerLayers: L.Marker[] = []
let waterStationLayer: L.MarkerClusterGroup | null = null
let rainfallStationLayer: L.MarkerClusterGroup | null = null

// 三層溪流圖層，依 zoom 分別顯示
let layerRiver: L.GeoJSON | null = null   // 主要河流，zoom >= 8
let layerCanal: L.GeoJSON | null = null   // 水渠，    zoom >= 11
let layerStream: L.GeoJSON | null = null  // 小支流，  zoom >= 13

const tileOptions = [
  { key: 'carto',     label: '清晰模式',   url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',                                                              attribution: '© OpenStreetMap contributors © CARTO' },
  { key: 'osm',       label: '標準模式',   url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',                                                                         attribution: '© OpenStreetMap contributors' },
  { key: 'topo',      label: '地形模式',   url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                                                                           attribution: '© OpenTopoMap contributors' },
  { key: 'satellite', label: '衛星模式',   url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',                              attribution: '© Esri, Maxar, Earthstar Geographics' },
]

let currentTile: L.TileLayer | null = null
const selectedTile = ref('topo')
const loadingRivers = ref(false)
const showWaterStations = ref(false)
const showRainfallStations = ref(false)
const showLayersPanel = ref(false)

const waterStationIcon = L.divIcon({
  className: '',
  html: '<div style="width:28px;height:28px;background:rgba(255,255,255,0.92);border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1">💧</div>',
  iconSize: [28, 26],
  iconAnchor: [14, 26],
})

const rainfallStationIcon = L.divIcon({
  className: '',
  html: '<div style="width:28px;height:28px;background:rgba(255,255,255,0.92);border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1">🌂</div>',
  iconSize: [28, 26],
  iconAnchor: [14, 26],
})

function renderWaterStations() {
  if (!map) return
  waterStationLayer = L.markerClusterGroup({
    maxClusterRadius: 80,
    iconCreateFunction(cluster) {
      const count = cluster.getChildCount()
      return L.divIcon({
        className: '',
        html: `<div class="water-cluster">${count}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })
    },
  })
  ;(waterStations as WaterStation[]).forEach(s => {
    L.marker([s.lat, s.lon], { icon: waterStationIcon })
      .bindTooltip(Object.assign(document.createElement('span'), { textContent: `${s.name}（${s.river}）` }), { direction: 'top', offset: [0, -6] })
      .on('click', () => emit('selectWaterStation', s))
      .addTo(waterStationLayer!)
  })
}

watch(showWaterStations, (show) => {
  if (!map) return
  if (show) {
    if (!waterStationLayer) renderWaterStations()
    waterStationLayer?.addTo(map)
  } else {
    waterStationLayer?.remove()
  }
})

function renderRainfallStations() {
  if (!map) return
  rainfallStationLayer = L.markerClusterGroup({
    maxClusterRadius: 80,
    iconCreateFunction(cluster) {
      const count = cluster.getChildCount()
      return L.divIcon({
        className: '',
        html: `<div class="rainfall-cluster">${count}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })
    },
  })
  rainfallStations.forEach(s => {
    L.marker([s.lat, s.lon], { icon: rainfallStationIcon })
      .bindTooltip(`${s.name}（${s.county}${s.town}）`, { direction: 'top', offset: [0, -6] })
      .on('click', () => emit('selectRainfallStation', s))
      .addTo(rainfallStationLayer!)
  })
}

watch(showRainfallStations, (show) => {
  if (!map) return
  if (show) {
    if (!rainfallStationLayer) renderRainfallStations()
    rainfallStationLayer?.addTo(map)
  } else {
    rainfallStationLayer?.remove()
  }
})

function onTileChange(e: Event) {
  if (!map) return
  const key = (e.target as HTMLSelectElement).value
  selectedTile.value = key
  const opt = tileOptions.find(t => t.key === key)!
  currentTile?.remove()
  currentTile = L.tileLayer(opt.url, { attribution: opt.attribution, maxZoom: 19 })
  currentTile.addTo(map)
  // 確保溪流圖層在底圖上方
  layerRiver?.bringToFront()
  layerCanal?.bringToFront()
  layerStream?.bringToFront()
}

function renderMarkers() {
  if (!map) return
  markers.forEach(m => m.remove())
  markers = props.canyons.map(canyon =>
    L.marker(canyon.coordinates)
      .addTo(map!)
      .bindPopup(`
        <div>
          <h3><strong>${canyon.name}</strong></h3>
          <p>地點：${canyon.location}</p>
          <p>難度：${'★'.repeat(canyon.difficulty)}${'☆'.repeat(5 - canyon.difficulty)}</p>
          <p>適合季節：${canyon.season.join('、')}</p>
          <p>${canyon.description}</p>
        </div>
      `)
  )
}

function updateRiverVisibility() {
  if (!map) return
  const zoom = map.getZoom()

  // 主要河流：隨時顯示
  if (layerRiver) {
    if (!map.hasLayer(layerRiver)) layerRiver.addTo(map)
  }
  // 水渠：zoom 11+
  if (layerCanal) {
    if (zoom >= 11) { if (!map.hasLayer(layerCanal))  layerCanal.addTo(map) }
    else            { if (map.hasLayer(layerCanal))   map.removeLayer(layerCanal) }
  }
  // 小支流：zoom 13+
  if (layerStream) {
    if (zoom >= 13) { if (!map.hasLayer(layerStream)) layerStream.addTo(map) }
    else            { if (map.hasLayer(layerStream))  map.removeLayer(layerStream) }
  }
}

const CACHE_KEY = 'tw-rivers-v1'
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000  // 7 天

function buildLayers(river: any[], canal: any[], stream: any[]) {
  const toGeoJSON = (features: any[]) => ({ type: 'FeatureCollection' as const, features })
  layerRiver  = L.geoJSON(toGeoJSON(river),  { style: { color: '#1d6fa4', weight: 2.5, opacity: 1    } })
  layerCanal  = L.geoJSON(toGeoJSON(canal),  { style: { color: '#2a8fbf', weight: 1.8, opacity: 0.9  } })
  layerStream = L.geoJSON(toGeoJSON(stream), { style: { color: '#3aa8d8', weight: 1,   opacity: 0.75 } })
  updateRiverVisibility()
}

async function loadRivers() {
  if (!map) return
  loadingRivers.value = true
  try {
    // 先查 localStorage 快取
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const { ts, river, canal, stream } = JSON.parse(cached)
        if (Date.now() - ts < CACHE_TTL) {
          buildLayers(river, canal, stream)
          return
        }
      }
    } catch {}

    const query = `
      [out:json][timeout:60];
      area["ISO3166-1"="TW"][admin_level=2]->.tw;
      (
        way["waterway"="river"](area.tw);
        way["waterway"="canal"](area.tw);
        way["waterway"="stream"](area.tw);
      );
      out geom;
    `
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    })
    const data = await res.json()

    const river: any[] = []
    const canal: any[] = []
    const stream: any[] = []

    for (const el of data.elements) {
      if (!el.geometry || el.geometry.length < 2) continue
      const feature = {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: el.geometry.map((pt: any) => [pt.lon, pt.lat])
        },
        properties: { name: el.tags?.name ?? '' }
      }
      const w = el.tags?.waterway
      if (w === 'river')      river.push(feature)
      else if (w === 'canal') canal.push(feature)
      else                    stream.push(feature)
    }

    // 存入快取
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), river, canal, stream }))
    } catch {}

    buildLayers(river, canal, stream)
  } finally {
    loadingRivers.value = false
  }
}

const TAIWAN_BOUNDS = L.latLngBounds(
  L.latLng(21.8, 119.9),
  L.latLng(25.4, 122.1)
)

onMounted(async () => {
  map = L.map('map', {
    maxBounds: TAIWAN_BOUNDS,
    maxBoundsViscosity: 1.0,
    minZoom: 8,
  }).setView([23.9871, 121.6015], 9)

  const defaultTile = tileOptions.find(t => t.key === 'topo')!
  currentTile = L.tileLayer(defaultTile.url, { attribution: defaultTile.attribution, maxZoom: 19 })
  currentTile.addTo(map)

  map.on('zoomend', updateRiverVisibility)

  renderMarkers()
  renderRouteMarkers(props.canyonRouteMarkers, props.selectedRouteId)
  await loadRivers()
})

watch(() => props.canyons, renderMarkers)

watch(() => props.selectedId, (id) => {
  if (!map) return
  if (!id) { map.closePopup(); return }
  const idx = props.canyons.findIndex(c => c.id === id)
  if (idx === -1) return
  const canyon = props.canyons[idx]
  map.flyTo(canyon.coordinates, 13, { duration: 1 })
  map.once('moveend', () => markers[idx]?.openPopup())
})

watch(() => props.focusPoint, (coords) => {
  focusMarker?.remove()
  focusMarker = null
  if (!coords || !map) return
  map.flyTo(coords, 14, { duration: 1 })
  focusMarker = L.marker(coords).addTo(map)
})

watch(() => props.routeTrack, (data) => {
  trackLayer?.remove(); trackLayer = null
  waypointMarkers.forEach(m => m.remove()); waypointMarkers = []
  if (!data || !map) return

  // Support both flat [lat,lon][] and segmented [lat,lon][][] formats
  const isPoint = (value: unknown): value is [number, number] =>
    Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number'
  const rawTrack = data.track
  const segments = Array.isArray(rawTrack)
    ? rawTrack.some(isPoint)
      ? [rawTrack as [number, number][]]
      : rawTrack as [number, number][][]
    : []
  if (segments.some(segment => segment.some(isPoint))) {
    trackLayer = L.polyline(segments, { color: '#e63946', weight: 3, opacity: 0.85 }).addTo(map)
    map.fitBounds(trackLayer.getBounds(), {
      ...(data.pad ?? { padding: [40, 40] }),
      maxZoom: 15,
    })
  }

  waypointMarkers = data.waypoints.map(wp => {
    const label = wp.seq != null ? String(wp.seq).padStart(2, '0') : (wp.name.match(/^\d+/)?.[0] ?? '·')
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:22px;height:22px;border-radius:50%;background:#111;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.5)">${label}</div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    })
    return L.marker([wp.lat, wp.lon], { icon })
      .addTo(map!)
      .bindTooltip(wp.name, { permanent: false, direction: 'top', offset: [0, -12] })
  })
})

function renderRouteMarkers(routeMarkers: RouteMarker[], selId: string | null) {
  routeMarkerLayers.forEach(m => m.remove())
  routeMarkerLayers = []
  if (!map) return
  routeMarkerLayers = routeMarkers.map(r => {
    const marker = L.marker([r.lat, r.lon])
      .addTo(map!)
      .bindTooltip(Object.assign(document.createElement('span'), { textContent: r.name }), { direction: 'top', offset: [0, -6] })
      .on('click', () => emit('selectRoute', r.id))
    if (r.id === selId) (marker as any).setZIndexOffset(1000)
    return marker
  })
}

watch(() => [props.canyonRouteMarkers, props.selectedRouteId] as const, ([routeMarkers, selId]) => {
  renderRouteMarkers(routeMarkers, selId)
}, { deep: true })
</script>

<style scoped>
.map-wrapper {
  position: relative;
  flex: 1;
}

:global(#map) {
  width: 100%;
  height: 100vh;
}

.map-mode-select {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1000;
  padding: 7px 12px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.92);
  color: #333;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  outline: none;
}

.layers-fab {
  position: absolute;
  top: 56px;
  right: 12px;
  z-index: 1000;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.92);
  color: #444;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  transition: background 0.15s, color 0.15s;
}
.layers-fab:hover { background: #f0f0f0; }
.layers-fab.active { background: #1a1a2e; color: #fff; }

.layers-panel {
  position: absolute;
  top: 56px;
  right: 56px;
  z-index: 1000;
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  min-width: 240px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  overflow: hidden;
}

.layers-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #2a2a4a;
}

.layers-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #fff;
}

.layers-close {
  background: none;
  border: none;
  color: #666;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 2px 5px;
  border-radius: 4px;
}
.layers-close:hover { background: #2a2a4a; color: #fff; }

.layers-list {
  padding: 6px 0;
}

.layer-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  transition: background 0.12s;
}
.layer-row:hover { background: #252545; }

.layer-icon { font-size: 1rem; flex-shrink: 0; }

.layer-label {
  flex: 1;
  font-size: 0.82rem;
  color: #ccc;
}

.toggle-switch { flex-shrink: 0; cursor: pointer; }
.toggle-switch input { display: none; }

.toggle-track {
  display: block;
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: #3a3a5a;
  position: relative;
  transition: background 0.2s;
}
.toggle-track.on { background: #6c8ef5; }

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  transition: left 0.2s;
}
.toggle-track.on .toggle-thumb { left: 21px; }

:global(.water-cluster) {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(8, 145, 178, 0.85);
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: #fff;
}

:global(.rainfall-cluster) {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(124, 58, 237, 0.85);
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: #fff;
}

.river-loading {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(26, 26, 46, 0.9);
  color: #38bdf8;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.82rem;
  pointer-events: none;
  z-index: 1000;
}
</style>

<style src="leaflet/dist/leaflet.css"></style>
