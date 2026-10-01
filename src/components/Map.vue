<template>
  <div class="map-wrapper">
    <div id="map"></div>
    <select
      class="map-mode-select"
      :value="selectedTile"
      @change="onTileChange"
    >
      <option v-for="t in tileOptions" :key="t.key" :value="t.key">
        {{ locale === "en" ? t.labelEn : t.label }}
      </option>
    </select>
    <button
      class="layers-fab"
      :aria-label="locale === 'en' ? 'Layers' : '圖層'"
      @click="showLayersPanel = !showLayersPanel"
      :class="{ active: showLayersPanel }"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    </button>
    <div
      v-if="showLayersPanel"
      class="panel-overlay"
      @click="showLayersPanel = false"
    ></div>
    <div v-if="showLayersPanel" class="layers-panel">
      <div class="layers-header">
        <span class="layers-title">{{
          isStationSearch ? (locale === 'en' ? 'Search layers' : '搜尋圖層') : nzCountry ? (locale === 'en' ? 'New Zealand hydrology' : '紐西蘭水文') : (locale === 'en' ? 'Taiwan hydrology' : '台灣水文')
        }}</span>
        <button class="layers-close" :aria-label="locale === 'en' ? 'Close' : '關閉'" @click="showLayersPanel = false">✕</button>
      </div>
      <div class="layers-list">
        <p v-if="isStationSearch" class="layer-note">{{ locale === 'en' ? 'Showing stations from your search.' : '目前顯示搜尋結果中的測站。' }}</p>
        <div class="layer-row">
          <img class="layer-icon" src="/water-level.svg" alt="" />
          <span class="layer-label">{{
            locale === "en" ? "River Level" : "水位站"
          }}</span>
          <label class="toggle-switch">
            <input type="checkbox" v-model="showWaterStations" :disabled="isStationSearch" :aria-label="locale === 'en' ? 'Water stations' : '水位站'" />
            <span class="toggle-track" :class="{ on: showWaterStations }">
              <span class="toggle-thumb"></span>
            </span>
          </label>
        </div>
        <div class="layer-row">
          <img class="layer-icon" src="/rainfall.svg" alt="" />
          <span class="layer-label">{{
            locale === "en" ? "Rain Gauge" : "雨量站"
          }}</span>
          <label class="toggle-switch">
            <input type="checkbox" v-model="showRainfallStations" :disabled="isStationSearch" :aria-label="locale === 'en' ? 'Rainfall stations' : '雨量站'" />
            <span class="toggle-track" :class="{ on: showRainfallStations }">
              <span class="toggle-thumb"></span>
            </span>
          </label>
        </div>
        <div v-if="!nzCountry" class="layer-row layer-row--stack">
          <div class="layer-row-head">
            <svg class="layer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M7 14H6a4 4 0 1 1 .8-7.9A5.5 5.5 0 0 1 17.5 7H18a3.5 3.5 0 0 1 0 7h-1" />
              <path d="m8 17-1 3m6-3-1 3m6-3-1 3" />
            </svg>
            <span class="layer-label">
              {{ t('雨量圖', 'Rainfall map') }}
              <small v-if="rainMode !== 'off'" class="layer-sub" :class="{ warn: rainLayerError }">{{ rainSummary }}</small>
            </span>
          </div>
          <div class="rain-mode" role="radiogroup" :aria-label="t('雨量圖', 'Rainfall map')">
            <button
              v-for="m in rainModes"
              :key="m.value"
              type="button"
              role="radio"
              :aria-checked="rainMode === m.value"
              :disabled="m.forecast && !qpfActive && rainMode !== m.value"
              @click="rainMode = m.value"
            >{{ m.label }}</button>
          </div>
          <p v-if="!qpfActive" class="layer-sub">{{
            qpfStatus === 'error' ? t('無法確認預報格點資料', 'Could not check forecast grid')
            : qpfStatus === 'loading' ? t('確認預報資料中…', 'Checking forecast…')
            : t('預報圖層僅於陸上颱風警報期間提供', 'Forecast layers are only issued during land typhoon warnings')
          }}</p>
          <button type="button" class="rain-link" @click="openQpfCard">{{ t('氣象署 6／12 小時預報圖', 'CWA 6 / 12 h forecast charts') }} ›</button>
        </div>
        <div class="layer-divider"></div>
        <div class="layer-row">
          <svg class="layer-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 21s7-7.58 7-12a7 7 0 1 0-14 0c0 4.42 7 12 7 12z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          <span class="layer-label">{{
            locale === "en" ? "Routes" : "路線"
          }}</span>
          <label class="toggle-switch">
            <input type="checkbox" v-model="showLocationMarkers" :aria-label="locale === 'en' ? 'Routes' : '路線'" />
            <span class="toggle-track" :class="{ on: showLocationMarkers }">
              <span class="toggle-thumb"></span>
            </span>
          </label>
        </div>
      </div>
    </div>

    <section v-if="rainfallMapVisible" class="rain-legend" :aria-label="`${rainTitle} ${t('圖例', 'legend')}`">
      <div class="rain-legend-title">{{ rainTitle }} <span>mm</span></div>
      <p v-if="rainLayerError" class="rain-legend-status" role="alert">
        {{ t('無法取得中央氣象署雨量圖。', 'Could not load the CWA rainfall map.') }}
        <button type="button" class="rain-legend-retry" @click="loadRainLayer">{{ t('重試', 'Retry') }}</button>
      </p>
      <p v-else-if="!rainLayer" class="rain-legend-status">{{ t('載入中…', 'Loading…') }}</p>
      <template v-else>
        <p class="rain-legend-time">{{ rainRange }}</p>
        <p class="rain-legend-summary">{{ rainSummary }}</p>
        <p v-if="rainStale" class="rain-legend-status">{{ t('資料超過 3 小時未更新，可能延遲。', 'Over 3 hours old; data may be delayed.') }}</p>
        <div class="rain-legend-bar">
          <span
            v-for="(step, i) in rainLayer.scale"
            :key="step.min"
            :class="{ 'is-max': i === rainLayer.maxIndex }"
            :style="{ background: step.color }"
            :title="rainLayer.scale[i + 1] ? `${step.min}–${rainLayer.scale[i + 1].min} mm` : `≥ ${step.min} mm`"
          ></span>
        </div>
        <div class="rain-legend-labels" aria-hidden="true">
          <span v-for="i in [1, 4, 7, 9, 11, 14, 16]" :key="i" :style="{ left: `${(i / rainLayer.scale.length) * 100}%` }">{{ rainLayer.scale[i].min }}</span>
        </div>
      </template>
      <p class="rain-legend-source">{{ rainSource }}</p>
      <button type="button" class="rain-link" @click="openQpfCard">{{ t('氣象署 6／12 小時預報圖', 'CWA 6 / 12 h forecast charts') }} ›</button>
    </section>

    <Teleport to="body">
      <div v-if="qpfCardOpen" class="qpf-backdrop" @click.self="qpfCardOpen = false" @keydown.esc="qpfCardOpen = false">
        <section class="qpf-card" role="dialog" aria-modal="true" :aria-label="t('氣象署降雨預報圖', 'CWA rainfall forecast chart')">
          <header class="qpf-head">
            <h2>{{ t('氣象署降雨預報圖', 'CWA rainfall forecast') }}</h2>
            <button ref="qpfCloseBtn" type="button" class="layers-close" :aria-label="t('關閉', 'Close')" @click="qpfCardOpen = false">✕</button>
          </header>
          <div class="rain-mode" role="radiogroup" :aria-label="t('累積時距', 'Accumulation period')">
            <button v-for="h in [6, 12] as const" :key="h" type="button" role="radio" :aria-checked="qpfHours === h" @click="qpfHours = h">{{ t(`${h} 小時`, `${h} h`) }}</button>
          </div>
          <div class="rain-mode" role="radiogroup" :aria-label="t('預報時段', 'Forecast window')">
            <button v-for="p in [1, 2] as const" :key="p" type="button" role="radio" :aria-checked="qpfPart === p" @click="qpfPart = p">{{ t(`第 ${p} 時段`, `Window ${p}`) }}</button>
          </div>
          <img
            :key="qpfImage"
            class="qpf-img"
            :src="qpfImage"
            :alt="t(`中央氣象署 ${qpfHours} 小時定量降水預報圖，第 ${qpfPart} 時段`, `CWA ${qpfHours} h quantitative precipitation forecast, window ${qpfPart}`)"
            @error="qpfImgError = true"
            @load="qpfImgError = false"
          />
          <p v-if="qpfImgError" class="rain-legend-status" role="alert">{{ t('無法載入氣象署預報圖。', 'Could not load the CWA chart.') }}</p>
          <p class="qpf-note">
            {{ t('發布與有效時間標示於圖上方。', 'Issue and valid times are printed at the top of the chart.') }}
            <a href="https://www.cwa.gov.tw/V8/C/P/QPF.html" target="_blank" rel="noopener">{{ t('在氣象署網站查看', 'View on CWA') }}</a>
          </p>
        </section>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="selectedWp" class="wp-card" @click.stop>
        <div class="wp-card-top">
          <div class="wp-badge">
            {{
              selectedWp.seq != null
                ? String(selectedWp.seq).padStart(2, "0")
                : "·"
            }}
          </div>
          <button class="wp-close" :aria-label="locale === 'en' ? 'Close' : '關閉'" @click="selectedWpIndex = null">✕</button>
        </div>
        <div class="wp-name">
          <span v-if="selectedWp.time" class="wp-time"
            >{{ fmtTime(selectedWp.time) }} | </span
          >{{ selectedWp.name }}
        </div>
        <div class="wp-meta">
          <span v-if="selectedWp.ele != null">H {{ selectedWp.ele }} m</span>
          <span v-if="selectedWp.ele != null" class="wp-sep">|</span>
          <span class="wp-coords"
            >({{ selectedWp.lat.toFixed(5) }},
            {{ selectedWp.lon.toFixed(5) }})</span
          >
        </div>
        <div class="wp-footer">
          <button class="wp-copy-btn" @click="copyCoords">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path
                d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
              />
            </svg>
            {{ locale === "en" ? "Copy Coords" : "複製座標" }}
          </button>
          <div class="wp-nav">
            <button
              class="wp-nav-btn"
              :aria-label="locale === 'en' ? 'Previous waypoint' : '上一個航點'"
              :disabled="selectedWpIndex === 0"
              @click="goPrev"
            >
              &lt;
            </button>
            <button
              class="wp-nav-btn"
              :aria-label="locale === 'en' ? 'Next waypoint' : '下一個航點'"
              :disabled="selectedWpIndex === currentWaypoints.length - 1"
              @click="goNext"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, ref, computed, nextTick } from "vue";
import { separateClusters } from "../lib/clusterLayout";
import { locale, t } from "../lib/locale";
import {
  QPF_SCALE, RAINFALL_SCALE, bandIndex, fetchQpfGrid, fetchRainfallMap, gridToImage, toMercatorImage,
  type QpfGrid, type RainScale, type RainfallMap,
} from "../lib/rainfallMap";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { Canyon } from "../data/canyon";
import waterStations from "../data/water-stations.json";
import { nzWaterStations, type WaterStation } from "../lib/waterLevel";
import { nzRainfallStations, rainfallStations, type RainfallStation } from "../lib/rainfall";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface WaypointData {
  lat: number;
  lon: number;
  name: string;
  seq?: number;
  time?: string;
  ele?: number;
}
interface RouteTrack {
  track: [number, number][] | [number, number][][];
  waypoints: WaypointData[];
  pad?: {
    paddingTopLeft: [number, number];
    paddingBottomRight: [number, number];
  };
}

interface RouteMarker {
  id: string;
  lat: number;
  lon: number;
  name: string;
}

interface NearbyAnchor {
  lat: number
  lon: number
  pts?: [number, number][]
}

const props = withDefaults(
  defineProps<{
    canyons?: Canyon[];
    selectedId: string | null;
    focusPoint: [number, number] | null;
    routeTrack: RouteTrack | null;
    focusedWaypointIndex: number | null;
    canyonRouteMarkers: RouteMarker[];
    selectedRouteId: string | null;
    nearbyAnchor: NearbyAnchor | null;
    nzMode: boolean;
    hydrologyMode: boolean;
    stationSearch: { water: WaterStation[]; rainfall: RainfallStation[] } | null;
    searchPoints: [number, number][] | null;
    searchPanelOpen: boolean;
    pinnedStation?: { kind: "water" | "rainfall"; lat: number; lon: number } | null;
  }>(),
  { canyons: () => [], nearbyAnchor: null },
);

const emit = defineEmits<{
  selectRoute: [id: string];
  selectWaterStation: [station: WaterStation, pos: { x: number; y: number }, distance: number | undefined];
  selectRainfallStation: [
    station: RainfallStation,
    pos: { x: number; y: number },
    distance: number | undefined,
  ];
}>();

let map: L.Map | null = null;
let markers: L.Marker[] = [];
let focusMarker: L.Marker | null = null;
let trackLayer: L.Polyline | null = null;
let waypointMarkers: L.Marker[] = [];
let routeMarkerLayers: L.Marker[] = [];
let waterStationLayer: L.LayerGroup | null = null;
let rainfallStationLayer: L.LayerGroup | null = null;
let canyonCluster: L.MarkerClusterGroup | null = null;
let routeCluster: L.MarkerClusterGroup | null = null;
let clusterFrame = 0;
function layoutClusters() {
  cancelAnimationFrame(clusterFrame);
  clusterFrame = requestAnimationFrame(() => {
    if (!map) return;
    const badges = [...map.getContainer().querySelectorAll<HTMLElement>('.water-cluster, .rainfall-cluster, .route-cluster, .canyon-cluster')];
    const icons = badges.map(badge => badge.parentElement!);
    icons.forEach(icon => { icon.style.translate = ''; });
    const offsets = separateClusters(badges.map(badge => {
      const rect = badge.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, size: Math.max(rect.width, rect.height) };
    }));
    icons.forEach((icon, i) => { icon.style.translate = `${offsets[i].x}px ${offsets[i].y}px`; });
  });
}
onBeforeUnmount(() => {
  map?.remove();
  map = null;
  cancelAnimationFrame(clusterFrame);
  clearInterval(rainfallMapTimer);
});

const tileOptions = [
  {
    key: "carto",
    label: "清晰模式",
    labelEn: "Clear",
    url: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_KEY ?? ""}`,
    attribution: "© OpenStreetMap contributors © CARTO",
    maxZoom: 19,
  },
  {
    key: "osm",
    label: "標準模式",
    labelEn: "Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  },
  {
    key: "topo",
    label: "地形模式",
    labelEn: "Terrain",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "© OpenTopoMap contributors",
    maxZoom: 17,
  },
  {
    key: "satellite",
    label: "衛星模式",
    labelEn: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
  },
];

let currentTile: L.TileLayer | null = null;
const selectedTile = ref("topo");
const nzCountry = computed(() => props.nearbyAnchor ? props.nearbyAnchor.lat < 0 : props.nzMode);
const isStationSearch = computed(() => props.stationSearch !== null && !props.hydrologyMode);
// Hydrology is a temporary view; its toggles must not overwrite browsing preferences.
const hydrologyLayers = ref({ water: true, rainfall: true, routes: false });
watch(() => props.hydrologyMode, (active) => {
  if (active) hydrologyLayers.value = { water: true, rainfall: true, routes: false };
}, { flush: 'sync' });
const routeLayerPreference = ref(true);
const showLocationMarkers = computed({
  get: () => props.hydrologyMode ? hydrologyLayers.value.routes : routeLayerPreference.value,
  set: (value: boolean) => {
    if (props.hydrologyMode) hydrologyLayers.value.routes = value;
    else routeLayerPreference.value = value;
  },
});
const layerPreferences = ref<Record<string, boolean>>({});
for (const country of ['tw', 'nz']) {
  for (const layer of ['water', 'rainfall']) {
    const key = `hydrology-${country}-${layer}`;
    try { layerPreferences.value[key] = localStorage.getItem(key) === 'true'; } catch { /* Storage may be blocked. */ }
  }
}
const prefKey = (layer: string) => `hydrology-${nzCountry.value ? 'nz' : 'tw'}-${layer}`;
function stationLayer(layer: 'water' | 'rainfall') {
  return computed({
    get: () => isStationSearch.value
      ? props.stationSearch![layer].length > 0
      : props.hydrologyMode ? hydrologyLayers.value[layer]
      : layerPreferences.value[prefKey(layer)] === true,
    set: (value: boolean) => {
      if (props.hydrologyMode) {
        hydrologyLayers.value[layer] = value;
        return;
      }
      layerPreferences.value[prefKey(layer)] = value;
      try { localStorage.setItem(prefKey(layer), String(value)); } catch { /* Keep the choice for this session. */ }
    },
  });
}
const showWaterStations = stationLayer('water');
const showRainfallStations = stationLayer('rainfall');
const routeWaterStations = computed(() => nzCountry.value ? nzWaterStations : waterStations as WaterStation[]);
const showLayersPanel = ref(false);

type RainMode = 'off' | 'today' | 'qpf6' | 'qpf12';
const RAIN_MAP_KEY = 'rainfall-map-tw';
const rainMode = ref<RainMode>('off');
try {
  const saved = localStorage.getItem(RAIN_MAP_KEY);
  // 'true' is the stored value from the earlier on/off toggle.
  rainMode.value = saved === 'true' || saved === 'today' ? 'today' : saved === 'qpf6' || saved === 'qpf12' ? saved : 'off';
} catch { /* Storage may be blocked. */ }
watch(rainMode, (value) => {
  try { localStorage.setItem(RAIN_MAP_KEY, value); } catch { /* Keep the choice for this session. */ }
});
const rainModes = computed<{ value: RainMode; label: string; forecast?: boolean }[]>(() => [
  { value: 'off', label: t('關', 'Off') },
  { value: 'today', label: t('今日累積', 'Today') },
  { value: 'qpf6', label: t('預報 6h', '6 h fcst'), forecast: true },
  { value: 'qpf12', label: t('預報 12h', '12 h fcst'), forecast: true },
]);
const rainfallMapVisible = computed(() => rainMode.value !== 'off' && !nzCountry.value);

const qpfGrid = ref<QpfGrid | null>(null);
const qpfStatus = ref<'loading' | 'ready' | 'error'>('loading');
const qpfActive = computed(() => qpfGrid.value?.active === true);
async function checkQpf() {
  try {
    qpfGrid.value = await fetchQpfGrid();
    qpfStatus.value = 'ready';
  } catch {
    qpfStatus.value = 'error';
  }
}
watch(showLayersPanel, (open) => { if (open && !nzCountry.value) checkQpf(); });

interface RainLayer { from: string; to: string; maxIndex: number; scale: RainScale }
const rainLayer = ref<RainLayer | null>(null);
const rainLayerError = ref(false);
// At 00:00 CWA's "today" file is still yesterday's full-day total.
const rainIsYesterday = computed(() => !!rainLayer.value && rainLayer.value.from.slice(0, 10) !== rainLayer.value.to.slice(0, 10));
const rainTitle = computed(() => ({
  off: '',
  today: rainIsYesterday.value ? t('昨日累積雨量', "Yesterday's rainfall") : t('今日累積雨量', "Today's rainfall"),
  qpf6: t('未來 6 小時降雨預報', 'Next 6 h rainfall forecast'),
  qpf12: t('未來 12 小時降雨預報', 'Next 12 h rainfall forecast'),
})[rainMode.value]);
const rainSource = computed(() => rainMode.value === 'today'
  ? t('來源：中央氣象署 O-A0040-003', 'Source: CWA O-A0040-003')
  : t('來源：中央氣象署 F-C0041（颱風警報期間）', 'Source: CWA F-C0041 (typhoon warnings)'));
const rainRange = computed(() => {
  if (!rainLayer.value) return '';
  const { from, to } = rainLayer.value;
  const day = (iso: string) => iso.slice(0, 10).replace(/-/g, '/');
  const end = day(from) === day(to) ? to.slice(11, 16) : `${day(to).slice(5)} ${to.slice(11, 16)}`;
  return `${day(from)} ${from.slice(11, 16)}–${end} ${t('（台灣時間）', '(Taiwan time)')}`;
});
const rainSummary = computed(() => {
  if (rainLayerError.value) return t('無法取得雨量圖', 'Could not load rainfall map');
  if (!rainLayer.value) return t('載入中…', 'Loading…');
  const { maxIndex: i, scale } = rainLayer.value;
  const today = rainMode.value === 'today';
  const [dayZh, dayEn] = rainIsYesterday.value ? ['昨日', 'yesterday'] : ['今日', 'today'];
  if (i < 0) return today
    ? t(`${dayZh}尚未測得降雨，地圖上不會出現色塊`, `No rain recorded ${dayEn}, so the map stays clear`)
    : t(`預報時段內無明顯降雨（< ${scale[0].min} mm）`, `No notable rain forecast (< ${scale[0].min} mm)`);
  const next = scale[i + 1]?.min;
  const range = i === 0 && today ? `< ${next}` : next == null ? `≥ ${scale[i].min}` : `${scale[i].min}–${next}`;
  return today ? t(`${dayZh}最大累積 ${range} mm`, `Highest ${dayEn}: ${range} mm`) : t(`預報最大 ${range} mm`, `Forecast highest: ${range} mm`);
});
const rainStale = computed(() => rainMode.value === 'today' && !!rainLayer.value
  && Date.now() - Date.parse(rainLayer.value.to) > 3 * 3600_000);
let rainfallOverlay: L.ImageOverlay | null = null;
let rainfallMapTimer = 0;

async function loadRainLayer() {
  const mode = rainMode.value;
  rainLayerError.value = false;
  try {
    let bounds: RainfallMap['bounds'];
    let url: string;
    let layer: RainLayer;
    if (mode === 'today') {
      const data = await fetchRainfallMap();
      const img = await toMercatorImage(data);
      ({ bounds } = data);
      url = img.url;
      layer = { from: data.from, to: data.observedAt, maxIndex: img.maxIndex, scale: RAINFALL_SCALE };
    } else {
      const grid = await fetchQpfGrid();
      qpfGrid.value = grid;
      qpfStatus.value = 'ready';
      if (!grid.active) {
        if (rainMode.value === mode) rainMode.value = 'off';
        return;
      }
      const [first, second] = grid.windows;
      const values = mode === 'qpf6' ? first.values
        : first.values.map((v, i) => v == null || second.values[i] == null ? null : v + second.values[i]!);
      const max = values.reduce<number>((m, v) => (v != null && v > m ? v : m), -1);
      // ponytail: grid is TWD67 (~0.8 km from WGS84), under the 5 km cell size; add a datum shift if cells shrink.
      url = (await toMercatorImage({ image: gridToImage(values, grid.rows, grid.cols, QPF_SCALE), bounds: grid.bounds })).url;
      bounds = grid.bounds;
      layer = { from: first.start, to: mode === 'qpf6' ? first.end : second.end, maxIndex: bandIndex(max, QPF_SCALE), scale: QPF_SCALE };
    }
    if (rainMode.value !== mode) return;
    const overlay = L.imageOverlay(url, [[bounds.south, bounds.west], [bounds.north, bounds.east]], {
      opacity: 0.9,
      interactive: false,
      attribution: '雨量圖 © 中央氣象署',
    });
    rainfallOverlay?.remove();
    rainfallOverlay = overlay;
    rainLayer.value = layer;
    if (map && rainfallMapVisible.value) overlay.addTo(map);
  } catch {
    if (rainMode.value !== mode) return;
    // Never leave an old map on screen looking current.
    rainfallOverlay?.remove();
    rainfallOverlay = null;
    rainLayer.value = null;
    rainLayerError.value = true;
  }
}

function syncRainfallMap() {
  clearInterval(rainfallMapTimer);
  rainfallOverlay?.remove();
  rainfallOverlay = null;
  rainLayer.value = null;
  rainLayerError.value = false;
  map?.getContainer().classList.toggle("rain-dim", rainfallMapVisible.value);
  if (!map || !rainfallMapVisible.value) return;
  loadRainLayer();
  rainfallMapTimer = window.setInterval(loadRainLayer, 10 * 60_000);
}
watch([rainMode, rainfallMapVisible], syncRainfallMap);

const qpfCardOpen = ref(false);
const qpfHours = ref<6 | 12>(6);
const qpfPart = ref<1 | 2>(1);
const qpfStamp = ref(0);
const qpfImgError = ref(false);
const qpfCloseBtn = ref<HTMLButtonElement | null>(null);
// Official QPF charts: QPF_ChFcstPrecip_6_06 / 6_12 / 12_12 / 12_24.
const qpfImage = computed(() =>
  `https://www.cwa.gov.tw/Data/fcst_img/QPF_ChFcstPrecip_${qpfHours.value}_${String(qpfHours.value * qpfPart.value).padStart(2, '0')}.png?t=${qpfStamp.value}`);
async function openQpfCard() {
  qpfStamp.value = Math.floor(Date.now() / 600_000);
  qpfImgError.value = false;
  qpfCardOpen.value = true;
  await nextTick();
  qpfCloseBtn.value?.focus();
}

const selectedWpIndex = ref<number | null>(null);
const currentWaypoints = ref<WaypointData[]>([]);
const selectedWp = computed(() =>
  selectedWpIndex.value !== null
    ? (currentWaypoints.value[selectedWpIndex.value] ?? null)
    : null,
);

function fmtTime(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString("zh-TW", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
}
function copyCoords() {
  if (!selectedWp.value) return;
  navigator.clipboard.writeText(
    `${selectedWp.value.lat.toFixed(5)}, ${selectedWp.value.lon.toFixed(5)}`,
  );
}
function wpIcon(label: string, focused: boolean) {
  return L.divIcon({
    className: "",
    html: focused
      ? `<div style="width:26px;height:26px;border-radius:50%;background:#e63946;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 0 0 3px #e63946,0 2px 6px rgba(0,0,0,.5)">${label}</div>`
      : `<div style="width:22px;height:22px;border-radius:50%;background:#111;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.5)">${label}</div>`,
    iconSize: focused ? [26, 26] : [22, 22],
    iconAnchor: focused ? [13, 13] : [11, 11],
  });
}

function labelIcon(name: string, selected = false) {
  const escapedName = name.replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch]!,
  );
  return L.divIcon({
    className: "",
    html: `<div class="route-label${selected ? " route-label--selected" : ""}">${escapedName}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

watch(selectedWpIndex, (next, prev) => {
  if (prev !== null && waypointMarkers[prev]) {
    const wp = currentWaypoints.value[prev];
    const label =
      wp?.seq != null
        ? String(wp.seq).padStart(2, "0")
        : (wp?.name.match(/^\d+/)?.[0] ?? "·");
    waypointMarkers[prev].setIcon(wpIcon(label, false));
  }
  if (next !== null && waypointMarkers[next]) {
    const wp = currentWaypoints.value[next];
    const label =
      wp?.seq != null
        ? String(wp.seq).padStart(2, "0")
        : (wp?.name.match(/^\d+/)?.[0] ?? "·");
    waypointMarkers[next].setIcon(wpIcon(label, true));
  }
});

watch(() => props.focusedWaypointIndex, (index) => {
  selectedWpIndex.value = index;
  if (index !== null) panToWp(index);
});

function panToWp(index: number) {
  const wp = currentWaypoints.value[index];
  if (wp && map) map.panTo([wp.lat, wp.lon]);
}
function goPrev() {
  if (selectedWpIndex.value !== null && selectedWpIndex.value > 0) {
    selectedWpIndex.value--;
    panToWp(selectedWpIndex.value);
  }
}
function goNext() {
  if (
    selectedWpIndex.value !== null &&
    selectedWpIndex.value < currentWaypoints.value.length - 1
  ) {
    selectedWpIndex.value++;
    panToWp(selectedWpIndex.value);
  }
}

const waterStationIcon = L.divIcon({
  className: "",
  html: '<div class="water-station-marker"><img src="/water-level.svg" alt=""></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const rainfallStationIcon = L.divIcon({
  className: "",
  html: '<div class="rainfall-station-marker"><img src="/rainfall.svg" alt=""></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

function nearestDistKm(lat: number, lon: number, anchor: NearbyAnchor): number {
  // Always check the anchor GPS point itself (entry/exit point), then sampled GPX pts.
  // ponytail: linear scan over sampled track pts (≤200), fast enough
  const pts: [number, number][] = [[anchor.lat, anchor.lon], ...(anchor.pts ?? [])];
  const target = L.latLng(lat, lon);
  return pts.reduce((min, [pLat, pLon]) => Math.min(min, L.latLng(pLat, pLon).distanceTo(target) / 1000), Infinity);
}

function filterByAnchor<T extends { lat: number; lon: number }>(
  items: T[],
  anchor: NearbyAnchor | null,
  maxDistance?: number,
): { item: T; dist: number | undefined }[] {
  if (!anchor) return items.map(item => ({ item, dist: undefined }));
  const withDist = items.map(item => ({ item, dist: nearestDistKm(item.lat, item.lon, anchor) }));
  if (maxDistance != null) return withDist.filter(x => x.dist <= maxDistance);
  const in10 = withDist.filter(x => x.dist <= 10);
  return (in10.length ? in10 : withDist.filter(x => x.dist <= 20));
}

function renderWaterStations() {
  if (!map) return;
  waterStationLayer?.remove();
  waterStationLayer = props.nearbyAnchor && !props.stationSearch
    ? L.layerGroup()
    : L.markerClusterGroup({
        maxClusterRadius: 80,
        iconCreateFunction(cluster) {
          const count = cluster.getChildCount();
          return L.divIcon({
            className: "",
            html: `<div class="water-cluster">${count}</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          });
        },
      });
  filterByAnchor(props.stationSearch?.water ?? routeWaterStations.value, props.stationSearch ? null : props.nearbyAnchor, props.stationSearch ? undefined : 5).forEach(({ item: s, dist }) => {
    const label = dist != null ? `${s.name}（${s.river}） · ${dist.toFixed(1)} km` : `${s.name}（${s.river}）`;
    L.marker([s.lat, s.lon], { icon: waterStationIcon })
      .bindTooltip(
        Object.assign(document.createElement("span"), { textContent: label }),
        { direction: "top", offset: [0, -6] },
      )
      .on("click", (e: L.LeafletMouseEvent) => {
        const rect = document.getElementById("map")!.getBoundingClientRect();
        const pt = map!.latLngToContainerPoint(e.latlng);
        emit("selectWaterStation", s, { x: rect.left + pt.x, y: rect.top + pt.y }, dist);
      })
      .addTo(waterStationLayer!);
  });
}

watch(showWaterStations, (show) => {
  if (!map) return;
  if (show) {
    if (!waterStationLayer) renderWaterStations(); // lazy build; anchor re-renders are driven by nearbyAnchor watcher
    waterStationLayer?.addTo(map);
  } else {
    waterStationLayer?.remove();
  }
});

function renderRainfallStations() {
  if (!map) return;
  rainfallStationLayer?.remove();
  rainfallStationLayer = props.nearbyAnchor && !props.stationSearch
    ? L.layerGroup()
    : L.markerClusterGroup({
        maxClusterRadius: 80,
        iconCreateFunction(cluster) {
          const count = cluster.getChildCount();
          return L.divIcon({
            className: "",
            html: `<div class="rainfall-cluster">${count}</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          });
        },
      });
  const routeStations = nzCountry.value ? nzRainfallStations : rainfallStations;
  filterByAnchor(props.stationSearch?.rainfall ?? routeStations, props.stationSearch ? null : props.nearbyAnchor).forEach(({ item: s, dist }) => {
    const label = dist != null ? `${s.name}（${s.county}${s.town}） · ${dist.toFixed(1)} km` : `${s.name}（${s.county}${s.town}）`;
    L.marker([s.lat, s.lon], { icon: rainfallStationIcon })
      .bindTooltip(label, { direction: "top", offset: [0, -6] })
      .on("click", (e: L.LeafletMouseEvent) => {
        const rect = document.getElementById("map")!.getBoundingClientRect();
        const pt = map!.latLngToContainerPoint(e.latlng);
        emit("selectRainfallStation", s, { x: rect.left + pt.x, y: rect.top + pt.y }, dist);
      })
      .addTo(rainfallStationLayer!);
  });
}

watch(showRainfallStations, (show) => {
  if (!map) return;
  if (show) {
    if (!rainfallStationLayer) renderRainfallStations();
    rainfallStationLayer?.addTo(map);
  } else {
    rainfallStationLayer?.remove();
  }
});

// The station whose card is open stays on the map even with its layer switched off,
// so the card's arrow always points at a real icon.
let pinnedMarker: L.Marker | null = null;
watch(() => props.pinnedStation, (pin) => {
  pinnedMarker?.remove();
  pinnedMarker = null;
  if (!map || !pin) return;
  pinnedMarker = L.marker([pin.lat, pin.lon], {
    icon: pin.kind === "water" ? waterStationIcon : rainfallStationIcon,
    interactive: false,
    zIndexOffset: 1000,
  }).addTo(map);
}, { flush: "post" });

// Rebuild visible layers when the country, route, or station scope changes.
function syncNearbyAnchor() {
  if (!map) return;
  // Rebuild both layers to apply/remove the distance filter.
  // renderWaterStations/renderRainfallStations each call .remove() internally before rebuilding.
  if (showWaterStations.value) {
    renderWaterStations();
    waterStationLayer?.addTo(map);
  } else {
    waterStationLayer?.remove();
    waterStationLayer = null;
  }
  if (showRainfallStations.value) {
    renderRainfallStations();
    rainfallStationLayer?.addTo(map);
  } else {
    rainfallStationLayer?.remove();
    rainfallStationLayer = null;
  }
}
watch([() => props.nearbyAnchor, () => props.stationSearch, nzCountry], syncNearbyAnchor);

function focusSearchResults() {
  if (!map || !props.searchPoints?.length) return;
  const rightPadding = props.searchPanelOpen && map.getSize().x > 640 ? 328 : 48;
  map.stop();
  map.fitBounds(L.latLngBounds(props.searchPoints), {
    paddingTopLeft: [48, 48], paddingBottomRight: [rightPadding, 110], maxZoom: 14, animate: false,
  });
}

function focusCountry(country: 'route' | 'nz') {
  if (!map) return;
  const bounds: L.LatLngBoundsExpression = country === 'nz'
    ? [[-47.5, 166], [-34, 179.5]]
    : [[21.8, 119.8], [25.5, 122.1]];
  map.stop();
  map.fitBounds(bounds, { padding: [24, 24], animate: true, duration: 0.6 });
}
watch(() => props.searchPoints, focusSearchResults, { flush: 'post' });
function stationScreenPosition(lat: number, lon: number) {
  if (!map) return null;
  const rect = document.getElementById("map")!.getBoundingClientRect();
  const point = map.latLngToContainerPoint([lat, lon]);
  return { x: rect.left + point.x, y: rect.top + point.y };
}
// Pans (instantly) so the point lands at the given screen position; returns where it ended up.
function revealAt(lat: number, lon: number, screenX: number, screenY: number) {
  const current = stationScreenPosition(lat, lon);
  if (!map || !current) return current;
  map.stop();
  map.panBy([current.x - screenX, current.y - screenY], { animate: false });
  return stationScreenPosition(lat, lon);
}
function getView() {
  return map ? { center: map.getCenter(), zoom: map.getZoom() } : null;
}
function setView(view: { center: L.LatLng; zoom: number } | null) {
  if (!map || !view) return;
  map.stop();
  map.setView(view.center, view.zoom, { animate: false });
}
defineExpose({ focusSearchResults, focusCountry, stationScreenPosition, revealAt, getView, setView });

function onTileChange(e: Event) {
  if (!map) return;
  const key = (e.target as HTMLSelectElement).value;
  selectedTile.value = key;
  const opt = tileOptions.find((t) => t.key === key)!;
  currentTile?.remove();
  map.setMaxZoom(opt.maxZoom);
  currentTile = L.tileLayer(opt.url, {
    attribution: opt.attribution,
    maxZoom: opt.maxZoom,
  });
  currentTile.addTo(map);
}

function renderMarkers() {
  if (!map) return;
  markers.forEach((m) => m.remove());
  canyonCluster?.clearLayers();
  if (!canyonCluster) {
    canyonCluster = L.markerClusterGroup({
      maxClusterRadius: 60,
      iconCreateFunction(cluster) {
        return L.divIcon({
          className: "",
          html: `<div class="canyon-cluster">${cluster.getChildCount()}</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
      },
    });
  }
  markers = props.canyons.map((canyon) =>
    L.marker(canyon.coordinates, {
      icon: labelIcon(canyon.name, canyon.id === props.selectedId),
    }).bindPopup(`
        <div>
          <h3><strong>${canyon.name}</strong></h3>
          <p>地點：${canyon.location}</p>
          <p>難度：${"★".repeat(canyon.difficulty)}${"☆".repeat(5 - canyon.difficulty)}</p>
          <p>適合季節：${canyon.season.join("、")}</p>
          <p>${canyon.description}</p>
        </div>
      `),
  );
  if (showLocationMarkers.value) {
    markers.forEach((m) => canyonCluster!.addLayer(m));
    if (!map.hasLayer(canyonCluster!)) canyonCluster!.addTo(map);
  } else {
    canyonCluster.remove();
    const selIdx = props.canyons.findIndex((c) => c.id === props.selectedId);
    if (selIdx !== -1) markers[selIdx].addTo(map);
  }
}

onMounted(() => {
  const defaultTile = tileOptions.find((t) => t.key === "topo")!;
  map = L.map("map", {
    minZoom: 3,
    maxZoom: defaultTile.maxZoom,
    zoomControl: false,
  }).setView([23.9871, 121.6015], 5);

  currentTile = L.tileLayer(defaultTile.url, {
    attribution: defaultTile.attribution,
    maxZoom: defaultTile.maxZoom,
  });
  currentTile.addTo(map);

  map.on("click", () => {
    selectedWpIndex.value = null;
  });
  map.on('layeradd layerremove zoomend moveend', layoutClusters);
  map.on('layeradd', (event: L.LayerEvent) => {
    if (event.layer instanceof L.MarkerClusterGroup)
      event.layer.off('animationend', layoutClusters).on('animationend', layoutClusters);
  });

  renderMarkers();
  renderRouteMarkers(props.canyonRouteMarkers, props.selectedRouteId);
  // Handle routes restored from URL (?route=...) — watcher fires before map exists
  syncNearbyAnchor();
  syncRainfallMap();
  focusSearchResults();
});

watch(() => props.canyons, renderMarkers);

watch(showLocationMarkers, (show) => {
  if (!map) return;
  if (show) {
    markers.forEach((m) => m.remove());
    canyonCluster?.clearLayers();
    markers.forEach((m) => canyonCluster!.addLayer(m));
    if (!map.hasLayer(canyonCluster!)) canyonCluster?.addTo(map);
  } else {
    canyonCluster?.remove();
    const selIdx = props.canyons.findIndex((c) => c.id === props.selectedId);
    markers.forEach((m, i) => (i === selIdx ? m.addTo(map!) : m.remove()));
  }
  renderRouteMarkers(props.canyonRouteMarkers, props.selectedRouteId);
});

watch(
  () => props.selectedId,
  (id, prevId) => {
    if (!map) return;
    // Update icon highlight
    if (prevId) {
      const pi = props.canyons.findIndex((c) => c.id === prevId);
      if (pi !== -1)
        markers[pi]?.setIcon(labelIcon(props.canyons[pi].name, false));
    }
    if (id) {
      const ni = props.canyons.findIndex((c) => c.id === id);
      if (ni !== -1)
        markers[ni]?.setIcon(labelIcon(props.canyons[ni].name, true));
    }
    // When not showing all, swap visible individual markers
    if (!showLocationMarkers.value) {
      if (prevId) {
        const pi = props.canyons.findIndex((c) => c.id === prevId);
        if (pi !== -1) markers[pi]?.remove();
      }
      if (id) {
        const ni = props.canyons.findIndex((c) => c.id === id);
        if (ni !== -1) markers[ni]?.addTo(map!);
      }
    }
    if (!id) {
      map.closePopup();
      return;
    }
    const idx = props.canyons.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const canyon = props.canyons[idx];
    map.flyTo(canyon.coordinates, 13, { duration: 1 });
    map.once("moveend", () => markers[idx]?.openPopup());
  },
);

watch(
  () => props.focusPoint,
  (coords) => {
    focusMarker?.remove();
    focusMarker = null;
    if (!coords || !map) return;
    map.flyTo(coords, 14, { duration: 1.2 });
  },
);

// routeTrack is recomputed (new object) on panel resize, sidebar toggles, search open/close…
// Only a different track should move the map; otherwise the view — and any card anchored to it — stays put.
let lastTrackKey = "";
watch(
  () => props.routeTrack,
  (data) => {
    trackLayer?.remove();
    trackLayer = null;
    waypointMarkers.forEach((m) => m.remove());
    waypointMarkers = [];
    selectedWpIndex.value = null;
    currentWaypoints.value = [];
    if (!data || !map) {
      lastTrackKey = "";
      return;
    }
    currentWaypoints.value = data.waypoints;

    // Support both flat [lat,lon][] and segmented [lat,lon][][] formats
    const isPoint = (value: unknown): value is [number, number] =>
      Array.isArray(value) &&
      typeof value[0] === "number" &&
      typeof value[1] === "number";
    const rawTrack = data.track;
    const segments = Array.isArray(rawTrack)
      ? rawTrack.some(isPoint)
        ? [rawTrack as [number, number][]]
        : (rawTrack as [number, number][][])
      : [];
    if (segments.some((segment) => segment.some(isPoint))) {
      trackLayer = L.polyline(segments, {
        color: "#e63946",
        weight: 3,
        opacity: 0.85,
      }).addTo(map);
      const trackKey = trackLayer.getBounds().toBBoxString();
      if (trackKey !== lastTrackKey)
        map.flyToBounds(trackLayer.getBounds(), {
          ...(data.pad ?? { padding: [40, 40] }),
          maxZoom: 15,
          duration: 1.2,
        });
      lastTrackKey = trackKey;
    }

    waypointMarkers = data.waypoints.map((wp, i) => {
      const label =
        wp.seq != null
          ? String(wp.seq).padStart(2, "0")
          : (wp.name.match(/^\d+/)?.[0] ?? "·");
      return L.marker([wp.lat, wp.lon], { icon: wpIcon(label, false) })
        .addTo(map!)
        .bindTooltip(wp.name, {
          permanent: false,
          direction: "top",
          offset: [0, -12],
        })
        .on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          selectedWpIndex.value = i;
        });
    });
  },
);

function renderRouteMarkers(routeMarkers: RouteMarker[], selId: string | null) {
  routeMarkerLayers.forEach((m) => m.remove());
  routeCluster?.clearLayers();
  routeMarkerLayers = [];
  if (!map || !routeMarkers.length) {
    routeCluster?.remove();
    return;
  }
  if (!routeCluster) {
    routeCluster = L.markerClusterGroup({
      maxClusterRadius: 60,
      iconCreateFunction(cluster) {
        return L.divIcon({
          className: "",
          html: `<div class="route-cluster">${cluster.getChildCount()}</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
      },
    });
  }
  routeMarkerLayers = routeMarkers.map((r) => {
    const m = L.marker([r.lat, r.lon], {
      icon: labelIcon(r.name, r.id === selId),
    }).on("click", () => emit("selectRoute", r.id));
    if (r.id === selId) (m as any).setZIndexOffset(1000);
    return m;
  });
  if (showLocationMarkers.value) {
    routeMarkerLayers.forEach((m) => routeCluster!.addLayer(m));
    if (!map.hasLayer(routeCluster!)) routeCluster!.addTo(map);
  } else {
    routeCluster.remove();
    routeMarkerLayers.forEach((m, i) => {
      if (routeMarkers[i].id === selId) m.addTo(map!);
    });
  }
}

watch(
  () => [props.canyonRouteMarkers, props.selectedRouteId] as const,
  ([routeMarkers, selId]) => {
    renderRouteMarkers(routeMarkers, selId);
  },
  { deep: true },
);
</script>

<style scoped>
.map-wrapper {
  position: relative;
  flex: 1;
}

/* Gray out only the basemap so rainfall colours (incl. the gray <1 mm band) stand out. */
:global(#map .leaflet-tile-pane) {
  transition: filter 0.2s;
}
:global(#map.rain-dim .leaflet-tile-pane) {
  filter: grayscale(1) brightness(0.6);
}

:global(#map) {
  width: 100%;
  height: 100dvh;
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
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  outline: none;
}
.map-mode-select:focus-visible {
  outline: 2px solid #6c8ef5;
  outline-offset: 2px;
}

.panel-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
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
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  transition:
    background 0.15s,
    color 0.15s;
}
.layers-fab:hover {
  background: #f0f0f0;
}
.layers-fab.active {
  background: #1a1a2e;
  color: #fff;
}
.layers-fab:focus-visible {
  outline: 2px solid #6c8ef5;
  outline-offset: 2px;
}

.layers-panel {
  position: absolute;
  top: 56px;
  right: 56px;
  z-index: 1000;
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  min-width: 240px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
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
  font-size: 0.95rem;
  font-weight: 700;
  color: #fff;
}

.layers-close {
  background: none;
  border: none;
  color: #666;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 2px 5px;
  border-radius: 4px;
}
.layers-close:hover {
  background: #2a2a4a;
  color: #fff;
}
.layers-close:focus-visible {
  outline: 2px solid #6c8ef5;
  outline-offset: 2px;
}

.layers-list {
  padding: 6px 0;
}

.layer-note {
  margin: 6px 16px;
  color: var(--color-text);
  font-size: 0.8125rem;
}
.toggle-switch input:disabled + .toggle-track {
  opacity: 0.5;
  cursor: not-allowed;
}

.layer-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  transition: background 0.12s;
}
.layer-row:hover {
  background: #252545;
}

.layer-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: #6c8ef5;
}

.layer-label {
  flex: 1;
  font-size: 0.875rem;
  color: #ccc;
}

.rain-legend {
  /* Bottom-right, above the bottom toolbar, so it never sits under the layers panel. */
  position: absolute;
  bottom: 96px;
  right: 12px;
  z-index: 1000;
  width: min(248px, calc(100vw - 24px));
  box-sizing: border-box;
  padding: 10px 12px;
  background: rgba(26, 26, 46, 0.94);
  border: 1px solid #2a2a4a;
  border-radius: 10px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
  color: #ccc;
  font-size: 0.75rem;
  display: grid;
  gap: 6px;
}
.rain-legend p {
  margin: 0;
}
.rain-legend-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #fff;
}
.rain-legend-title span {
  font-weight: 400;
  color: #999;
}
.rain-legend-time {
  font-variant-numeric: tabular-nums;
}
.rain-legend-status {
  color: #f4c56a;
}
.rain-legend-summary {
  color: #fff;
  font-weight: 600;
}
.rain-legend-bar span.is-max {
  box-shadow: inset 0 0 0 2px #fff, inset 0 0 0 3px #1a1a2e;
}
.layer-sub {
  display: block;
  margin-top: 2px;
  font-size: 0.75rem;
  color: #999;
}
.layer-sub.warn {
  color: #f4c56a;
}
.layer-row--stack {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}
.layer-row-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.layer-row--stack > .layer-sub {
  margin: 0;
}
.rain-mode {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 2px;
  padding: 2px;
  background: #11112a;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
}
.rain-mode button {
  padding: 5px 4px;
  border: none;
  border-radius: 6px;
  background: none;
  color: #aaa;
  font: inherit;
  font-size: 0.75rem;
  white-space: nowrap;
  cursor: pointer;
}
.rain-mode button[aria-checked="true"] {
  background: #6c8ef5;
  color: #fff;
  font-weight: 600;
}
.rain-mode button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.rain-mode button:focus-visible,
.rain-link:focus-visible {
  outline: 2px solid #6c8ef5;
  outline-offset: 1px;
}
.rain-link {
  justify-self: start;
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  color: #8ea8ff;
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
}
.rain-link:hover {
  text-decoration: underline;
}
.qpf-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2200; /* above detail panels, station cards (2000), and settings (2100) */
  display: grid;
  place-items: center;
  padding: 12px;
  background: rgba(0, 0, 0, 0.55);
}
.qpf-card {
  width: min(460px, 100%);
  max-height: calc(100dvh - 24px);
  box-sizing: border-box;
  overflow-y: auto;
  display: grid;
  gap: 10px;
  padding: 14px 16px 16px;
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  color: #ccc;
  font-size: 0.8125rem;
}
.qpf-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.qpf-head h2 {
  margin: 0;
  font-size: 0.95rem;
  color: #fff;
}
.qpf-img {
  width: 100%;
  max-height: calc(100dvh - 230px);
  object-fit: contain;
  border-radius: 6px;
  background: #eef8ff;
}
.qpf-note {
  margin: 0;
  color: #999;
  font-size: 0.75rem;
}
.qpf-note a {
  color: #8ea8ff;
}
.rain-legend-retry {
  margin-left: 6px;
  padding: 2px 8px;
  border: 1px solid #6c8ef5;
  border-radius: 6px;
  background: none;
  color: #6c8ef5;
  font: inherit;
  cursor: pointer;
}
.rain-legend-retry:focus-visible {
  outline: 2px solid #6c8ef5;
  outline-offset: 2px;
}
.rain-legend-bar {
  display: flex;
  height: 10px;
  border-radius: 2px;
  overflow: hidden;
}
.rain-legend-bar span {
  flex: 1;
}
.rain-legend-labels {
  position: relative;
  height: 12px;
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
  color: #aaa;
}
.rain-legend-labels span {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
}
.rain-legend-source {
  color: #888;
  font-size: 0.6875rem;
}

.layer-divider {
  height: 1px;
  background: #2a2a4a;
  margin: 2px 0;
}

.toggle-switch {
  flex-shrink: 0;
  cursor: pointer;
}
.toggle-switch input {
  /* visually hidden but keyboard-accessible */
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
.toggle-switch input:focus-visible + .toggle-track {
  outline: 2px solid #6c8ef5;
  outline-offset: 2px;
  border-radius: 11px;
}

.toggle-track {
  display: block;
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: #3a3a5a;
  position: relative;
  transition: background 0.2s;
}
.toggle-track.on {
  background: #6c8ef5;
}

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: left 0.2s;
}
.toggle-track.on .toggle-thumb {
  left: 21px;
}

:global(.water-cluster) {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(14, 116, 144, 0.85);
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
  color: #fff;
}

:global(.water-station-marker),
:global(.rainfall-station-marker) {
  width: 28px;
  height: 28px;
  padding: 3px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
}

:global(.water-station-marker img),
:global(.rainfall-station-marker img) {
  display: block;
  width: 100%;
  height: 100%;
}

:global(.rainfall-cluster) {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(124, 58, 237, 0.85);
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
  color: #fff;
}

/* Canyon / route label chip — name shown directly on map */
:global(.route-label) {
  position: relative;
  display: inline-block;
  /* shift up so arrow tip lands on the coordinate */
  transform: translate(-50%, calc(-100% - 8px));
  background: rgba(255, 255, 255, 0.95);
  color: #1a1a2e;
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
  border: 1.5px solid #6c8ef5;
  line-height: 1.5;
  cursor: pointer;
  pointer-events: auto;
}
/* Outer (border-coloured) downward arrow */
:global(.route-label::before) {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -8px;
  transform: translateX(-50%);
  border: 7px solid transparent;
  border-top: 7px solid #6c8ef5;
  border-bottom: 0;
}
/* Inner (white fill) downward arrow — sits on top of ::before */
:global(.route-label::after) {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -5px;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top: 5px solid rgba(255, 255, 255, 0.95);
  border-bottom: 0;
}

/* Selected: same white+blue, slightly stronger glow to hint at focus */
:global(.route-label--selected) {
  border-width: 2px;
  box-shadow:
    0 0 0 2px rgba(108, 142, 245, 0.25),
    0 2px 8px rgba(0, 0, 0, 0.28);
}

:global(.canyon-cluster) {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(156, 83, 13, 0.88);
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
  color: #fff;
}
:global(.route-cluster) {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(54, 81, 184, 0.88);
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
  color: #fff;
}


.wp-card {
  position: fixed;
  bottom: max(32px, env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  background: var(--color-panel);
  border: 1px solid var(--color-line);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  padding: 14px 16px 12px;
  min-width: 260px;
  max-width: 340px;
  color: var(--color-text);
  font-family: inherit;
}
.wp-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.wp-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-raised);
  color: var(--color-text-strong);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wp-close {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 14px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  line-height: 1;
}
.wp-close:hover {
  color: var(--color-text-strong);
}
.wp-close:focus-visible {
  outline: 2px solid #6c8ef5;
  outline-offset: 2px;
}
.wp-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-strong);
  margin-bottom: 5px;
  line-height: 1.3;
}
.wp-time {
  color: var(--color-text-muted);
  font-weight: 400;
}
.wp-meta {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.wp-sep {
  color: var(--color-line);
}
.wp-coords {
  color: var(--color-text-muted);
}
.wp-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.wp-copy-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--color-raised);
  border: 1px solid var(--color-line);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
}
.wp-copy-btn:hover {
  background: var(--color-surface);
}
.wp-copy-btn:focus-visible {
  outline: 2px solid #6c8ef5;
  outline-offset: 2px;
}
.wp-nav {
  display: flex;
  gap: 4px;
}
.wp-nav-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--color-line);
  background: var(--color-raised);
  color: var(--color-text);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wp-nav-btn:hover:not(:disabled) {
  background: var(--color-surface);
}
.wp-nav-btn:disabled {
  color: var(--color-text-muted);
  cursor: default;
}
.wp-nav-btn:focus-visible {
  outline: 2px solid #6c8ef5;
  outline-offset: 2px;
}
</style>

<style src="leaflet/dist/leaflet.css"></style>
