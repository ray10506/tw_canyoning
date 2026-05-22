<template>
  <div class="map-wrapper">
    <div id="map"></div>
    <select class="map-mode-select" :value="selectedTile" @change="onTileChange">
      <option v-for="t in tileOptions" :key="t.key" :value="t.key">{{ t.label }}</option>
    </select>
    <div v-if="loadingRivers" class="river-loading">載入溪流資料中...</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref } from 'vue'
import L from 'leaflet'
import type { Canyon } from '../data/canyon'

const props = defineProps<{
  canyons: Canyon[]
  selectedId: string | null
}>()

let map: L.Map | null = null
let markers: L.Marker[] = []

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
const selectedTile = ref('carto')
const loadingRivers = ref(false)

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

async function loadRivers() {
  if (!map) return
  loadingRivers.value = true
  try {
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
      body: query
    })
    const data = await res.json()

    const riverFeatures: any[] = []
    const canalFeatures: any[] = []
    const streamFeatures: any[] = []

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
      if (w === 'river')       riverFeatures.push(feature)
      else if (w === 'canal')  canalFeatures.push(feature)
      else                     streamFeatures.push(feature)
    }

    const toGeoJSON = (features: any[]) =>
      ({ type: 'FeatureCollection' as const, features })

    layerRiver  = L.geoJSON(toGeoJSON(riverFeatures),  { style: { color: '#1d6fa4', weight: 2.5, opacity: 1    } })
    layerCanal  = L.geoJSON(toGeoJSON(canalFeatures),  { style: { color: '#2a8fbf', weight: 1.8, opacity: 0.9  } })
    layerStream = L.geoJSON(toGeoJSON(streamFeatures), { style: { color: '#3aa8d8', weight: 1,   opacity: 0.75 } })

    updateRiverVisibility()
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

  const defaultTile = tileOptions.find(t => t.key === 'carto')!
  currentTile = L.tileLayer(defaultTile.url, { attribution: defaultTile.attribution, maxZoom: 19 })
  currentTile.addTo(map)

  map.on('zoomend', updateRiverVisibility)

  renderMarkers()
  await loadRivers()
})

watch(() => props.canyons, renderMarkers)

watch(() => props.selectedId, (id) => {
  if (!id || !map) return
  const idx = props.canyons.findIndex(c => c.id === id)
  if (idx === -1) return
  const canyon = props.canyons[idx]
  map.flyTo(canyon.coordinates, 13, { duration: 1 })
  setTimeout(() => markers[idx]?.openPopup(), 1000)
})
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
