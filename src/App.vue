<template>
  <div class="app-layout" :data-theme="theme">
    <div v-if="loading" class="loading-overlay">
      <span>{{ locale === "en" ? "Loading..." : "載入資料中..." }}</span>
    </div>
    <div v-else-if="loadError" class="loading-overlay error">
      <span>{{
        locale === "en" ? "Unable to load data" : "資料暫時無法載入"
      }}</span>
      <button class="retry-btn" @click="fetchRoutes(true)">
        {{ locale === "en" ? "Retry" : "重試" }}
      </button>
    </div>
    <template v-else>
      <div
        :class="[
          'sidebar-wrap',
          { closed: !sidebarOpen || searchCoversSidebar, resizing: isResizing },
        ]"
        :inert="!sidebarOpen || searchCoversSidebar"
        :style="{ width: sidebarWidth + 'px', minWidth: sidebarWidth + 'px' }"
      >
        <CanyonList
          :canyon-routes="sidebarRoutes"
          :nz-routes="nzRoutes"
          :routes-loading="routesLoading"
          :selected-id="selectedId"
          :selected-route-id="selectedRouteId"
          :selected-station-key="selectedStationKey"
          :sort-descending="routeSortDescending"
          :browse-mode="browseMode"
          :hydrology-country="hydrologyCountry"
          @change-hydrology-country="changeHydrologyCountry"
          :search-query="searchQuery"
          :water-stations="sidebarWaterStations"
          :rainfall-stations="sidebarRainfallStations"
          :route-water-tones="routeWaterTones"
          @select="selectedId = $event"
          @close="sidebarOpen = false"
          @change-browse-mode="changeBrowseMode"
          @toggle-sort="routeSortDescending = !routeSortDescending"
          @show-detail="openRouteDetail"
          @select-water-station="selectWaterStationFromSearch"
          @select-rainfall-station="selectRainfallStationFromSearch"
          @update-search-query="searchQuery = $event"
          @open-search="openSearch"
        />
        <div
          v-if="sidebarOpen && activePanel !== 'search'"
          class="resize-handle"
          @mousedown="startResize"
        />
      </div>
      <div class="map-container">
        <button
          v-if="!sidebarOpen && activePanel !== 'search'"
          class="sidebar-open-btn"
          :aria-label="locale === 'en' ? 'Expand' : '展開'"
          @click="sidebarOpen = true"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <Map
          ref="mapRef"
          :selected-id="selectedId"
          :focus-point="mapFocusPoint"
          :route-track="routeTrack"
          :focused-waypoint-index="focusedWaypointIndex"
          :canyon-route-markers="canyonRouteMarkers"
          :selected-route-id="selectedRouteId"
          :nearby-anchor="nearbyAnchor"
          :nz-mode="hydrologyCountry === 'nz'"
          :hydrology-mode="browseMode === 'hydrology' && activePanel !== 'search'"
          :station-search="mapStationScope"
          :search-points="searchPoints"
          :search-panel-open="activePanel === 'search'"
          :pinned-station="pinnedStation"
          :left-inset="mapLeftInset"
          @select-route="onSelectRoute"
          @select-water-station="openWaterStation"
          @select-rainfall-station="openRainfallStation"
        />
      </div>
      <NzRouteDetail
        ref="nzDetailRef"
        v-if="detailItem && detailItem.kind === 'nz' && activePanel !== 'search'"
        :item="detailItem"
        :nearby-water="nearbyWater"
        @select-water-station="openNearbyWaterStation"
        @close="detailItem = null"
        @focus-waypoint="focusedWaypointIndex = $event"
      />
      <RouteDetail
        ref="routeDetailRef"
        v-if="twDetailItem && activePanel !== 'search'"
        :item="twDetailItem"
        :nearby-water="nearbyWater"
        :nearby-rainfall="nearbyRainfall"
        @close="detailItem = null"
        @select-water-station="openNearbyWaterStation"
        @select-rainfall-station="openNearbyRainfallStation"
        @focus-waypoint="focusedWaypointIndex = $event"
      />
      <!-- One floating card at a time: search or settings hides (not closes) the station card,
           so it comes back where it was when that tool closes. -->
      <WaterStationDetail
        v-if="waterStationDetail && !activePanel"
        :station="waterStationDetail.station"
        :pos="waterStationDetail.pos"
        :days="waterStationDetail.days"
        :distance="waterStationDetail.distance"
        :left-inset="mapLeftInset"
        @close="waterStationDetail = null"
      />
      <RainfallStationDetail
        v-if="rainfallStationDetail && !activePanel"
        :station="rainfallStationDetail.station"
        :pos="rainfallStationDetail.pos"
        :distance="rainfallStationDetail.distance"
        :left-inset="mapLeftInset"
        @close="rainfallStationDetail = null"
      />

      <!-- Search card (top-right floating) -->
      <SearchCard
        v-if="activePanel === 'search'"
        v-model:search-query="searchQuery"
        v-model:v="routeFilter.v"
        v-model:a="routeFilter.a"
        v-model:t="routeFilter.t"
        v-model:drop="routeFilter.drop"
        v-model:gpx="filterGpx"
        v-model:search-types="searchTypes"
        :country="hydrologyCountry"
        @change-country="changeSearchCountry"
        :selected-region="selectedRegion"
        :suggestions="searchSuggestions"
        :result-count="searchResultCount"
        @close="closeSearch"
        @confirm="confirmSearch"
        @select-suggestion="selectSearchSuggestion"
        @filter-region="toggleRegion($event)"
        @clear-region="selectedRegion = []"
        @clear-all="clearAllFilters"
      />

      <!-- Settings panel -->
      <SettingsPanel
        v-if="activePanel === 'settings'"
        :initial-view="settingsInitialView"
        @features-opened="dismissFeatureInvite"
        @close="activePanel = null"
      />
      <aside v-if="showFeatureInvite && !activePanel && !detailItem && !waterStationDetail && !rainfallStationDetail && !activeFilters.length" class="feature-invite" :aria-label="t('網站功能提示', 'Website features hint')">
        <div>
          <p>{{ t('路線、水文、雨量圖，去哪裡看？', 'Where to find routes, water levels and rainfall?') }}</p>
          <button class="feature-invite-link" @click="openWebsiteFeatures">{{ t('認識網站功能', 'Explore website features') }}</button>
        </div>
        <button class="feature-invite-close" :aria-label="t('關閉功能提示', 'Dismiss feature hint')" @click="dismissFeatureInvite">✕</button>
      </aside>

      <!-- Active filter chips — visible when card is closed and filters are on -->
      <transition name="chips">
        <div
          v-if="activeFilters.length && activePanel !== 'search'"
          class="filter-chips"
        >
          <div
            v-for="f in activeFilters"
            :key="f.label"
            class="filter-chip"
          >
            <button class="filter-chip-label" @click="openSearch">
              {{ f.label }}
            </button>
            <button
              class="filter-chip-remove"
              :aria-label="`${locale === 'en' ? 'Clear' : '清除'} ${f.label}`"
              @click="removeActiveFilter(f)"
            >✕</button>
          </div>
          <button
            v-if="activeFilters.length > 1"
            class="filter-chip filter-chip--clear"
            @click="clearAllFilters"
          >
            {{ locale === "en" ? "Clear all" : "全部清除" }}
          </button>
        </div>
      </transition>

      <!-- Bottom toolbar -->
      <div class="bottom-bar">
        <button
          :class="[
            'bar-btn',
            { active: activePanel === 'search' || activeFilters.length > 0 },
          ]"
          @click="activePanel === 'search' ? closeSearch() : openSearch()"
          :title="locale === 'en' ? 'Search' : '搜尋'"
        >
          <div class="bar-btn-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span
              v-if="activeFilters.length && activePanel !== 'search'"
              class="filter-badge"
              >{{ activeFilters.length }}</span
            >
          </div>
          <span>{{ locale === "en" ? "Search" : "搜尋" }}</span>
        </button>
        <button
          :class="['bar-btn', { active: activePanel === 'settings' }]"
          @click="toggleSettings"
          :title="locale === 'en' ? 'Settings' : '設定'"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
            />
          </svg>
          <span>{{ locale === "en" ? "Settings" : "設定" }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent, onMounted, watch, nextTick } from "vue";
import { locale, localeRegion, t } from "./lib/locale";
import Map from "./components/Map.vue";
import CanyonList from "./components/CanyonList.vue";
import SearchCard from "./components/SearchCard.vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import { pb } from "./lib/pb";
import { fetchElevation } from "./lib/elevation";
import { fetchAllWaterLevels, waterTone, nzWaterStations, type WaterStation, type WaterTone } from "./lib/waterLevel";
import { haversineKm } from "./lib/geo";
import { useResizableWidth } from "./lib/useResizableWidth";
import { rainfallStations, nzRainfallStations, type RainfallStation } from "./lib/rainfall";
import waterStations from "./data/water-stations.json";
import { theme } from "./lib/theme";

const RouteDetail = defineAsyncComponent(() => import("./components/RouteDetail.vue"));
const NzRouteDetail = defineAsyncComponent(() => import("./components/NzRouteDetail.vue"));
const WaterStationDetail = defineAsyncComponent(() => import("./components/WaterStationDetail.vue"));
const RainfallStationDetail = defineAsyncComponent(() => import("./components/RainfallStationDetail.vue"));

const sidebarOpen = ref(window.innerWidth > 640);
const activePanel = ref<"search" | "settings" | null>(null);
const settingsInitialView = ref<'main' | 'features'>('main');
const showFeatureInvite = ref(true);
try { showFeatureInvite.value = localStorage.getItem('website-features-seen') !== 'true'; } catch { /* Keep this session usable without storage. */ }
function dismissFeatureInvite() {
  showFeatureInvite.value = false;
  try { localStorage.setItem('website-features-seen', 'true'); } catch { /* Remember for this session only. */ }
}
function openWebsiteFeatures() {
  dismissFeatureInvite();
  settingsInitialView.value = 'features';
  activePanel.value = 'settings';
}
const mapRef = ref<InstanceType<typeof Map> | null>(null);
const routeDetailRef = ref<{ panelBounds: DOMRect | null } | null>(null);
const nzDetailRef = ref<{ panelWidth: number } | null>(null);
const pinnedStation = computed(() => {
  if (activePanel.value === "search") return null;
  const water = waterStationDetail.value?.station;
  if (water) return { kind: "water" as const, lat: water.lat, lon: water.lon };
  const rain = rainfallStationDetail.value?.station;
  return rain ? { kind: "rainfall" as const, lat: rain.lat, lon: rain.lon } : null;
});

// Search edits filters live, so opening it snapshots them and cancelling restores them.
// Open details are only hidden while the card is up — cancelling brings them back.
let searchSnapshot: {
  browseMode: typeof browseMode.value;
  hydrologyCountry: 'tw' | 'nz';
  searchQuery: string;
  routeFilter: typeof routeFilter.value;
  filterGpx: boolean;
  searchTypes: SearchType[];
  selectedRegion: string[];
  selectedId: string | null;
  // Live filtering re-fits the map; cancelling puts the view back so restored cards still point at their icons.
  view: ReturnType<NonNullable<typeof mapRef.value>['getView']> | null;
} | null = null;
function openSearch() {
  searchSnapshot = {
    browseMode: browseMode.value,
    hydrologyCountry: hydrologyCountry.value,
    searchQuery: searchQuery.value,
    routeFilter: { ...routeFilter.value },
    filterGpx: filterGpx.value,
    searchTypes: [...searchTypes.value],
    selectedRegion: [...selectedRegion.value],
    selectedId: selectedId.value,
    view: mapRef.value?.getView() ?? null,
  };
  activePanel.value = "search";
  browseMode.value = "search";
}

function changeSearchCountry(country: 'tw' | 'nz') {
  if (country === hydrologyCountry.value) return;
  hydrologyCountry.value = country;
  selectedRegion.value = [];
  routeFilter.value = { v: '', a: '', t: '', drop: '' };
  filterGpx.value = false;
  nextTick(() => {
    if (searchResultCount.value) mapRef.value?.focusSearchResults();
    else mapRef.value?.focusCountry(country === 'nz' ? 'nz' : 'route');
  });
}

// Where the visible map starts: the open sidebar overlays its left edge.
const mapLeftInset = computed(() => (sidebarOpen.value && !searchCoversSidebar.value ? sidebarWidth.value : 0));

// On phones the sidebar is full-width, so it must give way to the search card.
const searchCoversSidebar = computed(
  () => activePanel.value === "search" && window.innerWidth <= 640,
);

function changeBrowseMode(mode: "route" | "nz" | "hydrology") {
  const country = mode === 'hydrology' ? hydrologyCountry.value : mode === 'nz' ? 'nz' : 'tw';
  clearAllFilters();
  hydrologyCountry.value = country;
  browseMode.value = mode;
  activePanel.value = null;
  changeHydrologyCountry(country);
}

function changeHydrologyCountry(country: 'tw' | 'nz') {
  hydrologyCountry.value = country;
  detailItem.value = null;
  waterStationDetail.value = null;
  rainfallStationDetail.value = null;
  searchStationPoint.value = null;
  nextTick(() => mapRef.value?.focusCountry(country === 'nz' ? 'nz' : 'route'));
}

// Picking a result from the live list or map while editing keeps those filters.
function acceptSearchSelection() {
  if (activePanel.value !== "search") return;
  searchSnapshot = null;
  activePanel.value = null;
}

function onEscape(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  if (activePanel.value === "search") closeSearch();
  else if (activePanel.value === "settings") activePanel.value = null;
}
onMounted(() => window.addEventListener("keydown", onEscape));

function closeSearch() {
  const saved = searchSnapshot;
  searchSnapshot = null;
  activePanel.value = null;
  if (!saved) return;
  browseMode.value = saved.browseMode;
  hydrologyCountry.value = saved.hydrologyCountry;
  searchQuery.value = saved.searchQuery;
  routeFilter.value = saved.routeFilter;
  filterGpx.value = saved.filterGpx;
  searchTypes.value = saved.searchTypes;
  selectedRegion.value = saved.selectedRegion;
  // After the flush, so neither the searchQuery watcher nor a live re-fit undoes these.
  nextTick(() => {
    selectedId.value = saved.selectedId;
    mapRef.value?.setView(saved.view);
  });
}

async function confirmSearch() {
  searchSnapshot = null;
  // New result set: details from before the search no longer belong to it.
  detailItem.value = null;
  waterStationDetail.value = null;
  rainfallStationDetail.value = null;
  browseMode.value = "search";
  activePanel.value = null;
  sidebarOpen.value = true;
  await nextTick();
  mapRef.value?.focusSearchResults();
}

function toggleSettings() {
  settingsInitialView.value = 'main';
  if (activePanel.value === "search") closeSearch();
  activePanel.value = activePanel.value === "settings" ? null : "settings";
}
const detailItem = ref<{ kind: "canyon" | "route" | "nz"; data: any } | null>(null);
const focusedWaypointIndex = ref<number | null>(null);
const twDetailItem = computed<{ kind: "canyon" | "route"; data: any } | null>(() => {
  const item = detailItem.value;
  return item && item.kind !== "nz" ? { kind: item.kind, data: item.data } : null;
});
const waterStationDetail = ref<{ station: WaterStation; pos: { x: number; y: number }; days: number; distance?: number } | null>(
  null,
);
const rainfallStationDetail = ref<{
  station: RainfallStation;
  pos: { x: number; y: number };
  distance?: number;
} | null>(null);
const selectedStationKey = computed(() =>
  waterStationDetail.value
    ? `water-${waterStationDetail.value.station.id}`
    : rainfallStationDetail.value
      ? `rain-${rainfallStationDetail.value.station.station_id}`
      : null,
);
const searchStationPoint = ref<[number, number] | null>(null);

function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

const routeFocusPoint = computed((): [number, number] | null => {
  if (!detailItem.value || (detailItem.value.kind !== "route" && detailItem.value.kind !== "nz")) return null;
  const gps = detailItem.value.data.gps?.trim();
  if (!gps) return null;
  const parts = gps.split(/[,\s]+/).map(Number);
  if (parts.length >= 2 && isValidLatLng(parts[0], parts[1]))
    return [parts[0], parts[1]];
  return null;
});

const mapFocusPoint = computed(() => searchStationPoint.value ?? routeFocusPoint.value);

const { width: sidebarWidth, isResizing, start: startResize } = useResizableWidth(
  280,
  e => e.clientX,
  200,
  () => window.innerWidth / 2,
);

const loading = ref(true);
const loadError = ref(false);

const canyonRoutes = ref<any[]>([]);   // Taiwan routes only
const nzRoutes = ref<any[]>([]);        // NZ routes only
const routesLoaded = ref(false);
const routesLoading = ref(false);
const browseMode = ref<'route' | 'nz' | 'hydrology' | 'search'>('route');
const hydrologyCountry = ref<'tw' | 'nz'>('tw');
const routeFilter = ref({ v: "", a: "", t: "", drop: "" });
const filterGpx = ref(false);
const routeSortDescending = ref(false);
type SearchType = "route" | "water" | "rainfall";
const searchTypes = ref<SearchType[]>(["route"]);
const routeOnlySearch = computed(() => searchTypes.value.length === 1 && searchTypes.value[0] === "route");

const selectedId = ref<string | null>(null);
const searchQuery = ref("");
const selectedRegion = ref<string[]>([]);

let lastPanelBounds: DOMRect | null = null;
const routeTrack = computed(() => {
  if (detailItem.value?.kind !== "route" && detailItem.value?.kind !== "nz") return null;
  const d = detailItem.value.data;

  const mapLeft = mapLeftInset.value;
  const mapCenterX = mapLeft + (window.innerWidth - mapLeft) / 2;
  const cardW = 380;
  const gap = 24;
  const cardOnRight = mapCenterX + gap + cardW <= window.innerWidth;
  // While the panel is hidden (search) or remounting, reuse its last measured bounds:
  // a momentary null would drop the track and re-fly the map, detaching any open station card.
  const livePanel = detailItem.value.kind === 'route' ? routeDetailRef.value?.panelBounds : null;
  if (livePanel) lastPanelBounds = livePanel;
  const panel = detailItem.value.kind === 'route' ? (livePanel ?? lastPanelBounds) : null;
  if (detailItem.value.kind === 'route' && !panel) return null;
  const pad = panel
    ? {
      paddingTopLeft: [mapLeft + 40, 40] as [number, number],
      paddingBottomRight: [
        panel.left > 0 ? window.innerWidth - panel.left + 40 : 40,
        panel.left > 0 ? 40 : window.innerHeight - panel.top + 40,
      ] as [number, number],
    }
    : cardOnRight
    ? { paddingTopLeft: [mapLeft + 40, 40] as [number, number], paddingBottomRight: [cardW + gap * 2, 40] as [number, number] }
    : { paddingTopLeft: [mapLeft + cardW + gap * 2, 40] as [number, number], paddingBottomRight: [40, 40] as [number, number] };

  // 無 GPX track：若有 DB 內的 waypoints（nz_routes）則顯示航點
  if (!d.gpx_track) {
    const wps = d.gpx_waypoints ? JSON.parse(d.gpx_waypoints) : [];
    return wps.length ? { track: [], waypoints: wps, pad } : null;
  }

  try {
    return {
      track: JSON.parse(d.gpx_track),
      waypoints: d.gpx_waypoints ? JSON.parse(d.gpx_waypoints) : [],
      pad,
    };
  } catch (e) {
    console.warn("[routeTrack] failed to parse gpx data for route", d.id, e);
    return null;
  }
});

// Anchor for nearby-station filtering: route GPS + sampled GPX track points
const nearbyAnchor = computed((): { lat: number; lon: number; pts?: [number, number][] } | null => {
  if (detailItem.value?.kind !== "route" && detailItem.value?.kind !== "nz") return null;
  const d = detailItem.value.data;
  const gps = d.gps?.trim();
  if (!gps) return null;
  const parts = gps.split(/[,\s]+/).map(Number);
  if (parts.length < 2 || !isValidLatLng(parts[0], parts[1])) return null;
  let pts: [number, number][] | undefined;
  if (d.gpx_track) {
    try {
      const parsed = JSON.parse(d.gpx_track);
      const isSegmented = parsed.length > 0 && Array.isArray(parsed[0][0]);
      const allPts: number[][] = isSegmented ? (parsed as number[][][]).flat() : parsed;
      // Sample every 20 pts (~100-200 points). nearestDistKm always checks anchor.lat/lon first,
      // but we also include the first/last GPX point so endpoints are never skipped.
      const sampled = allPts.filter((_: number[], i: number) => i % 20 === 0);
      if (allPts.length > 0 && !sampled.includes(allPts[allPts.length - 1]))
        sampled.push(allPts[allPts.length - 1]);
      pts = sampled.map((p: number[]) => [p[0], p[1]] as [number, number]);
    } catch {}
  }
  return { lat: parts[0], lon: parts[1], pts };
});

function nearestDistanceKm(lat: number, lon: number): number {
  const anchor = nearbyAnchor.value;
  if (!anchor) return Infinity;
  return [[anchor.lat, anchor.lon], ...(anchor.pts ?? [])].reduce(
    (min, [pLat, pLon]) => Math.min(min, haversineKm(lat, lon, pLat, pLon)),
    Infinity,
  );
}

function nearestStation<T extends { lat: number; lon: number }>(stations: T[], maxDistance = 20) {
  const nearest = stations
    .map(station => ({ station, distance: nearestDistanceKm(station.lat, station.lon) }))
    .sort((a, b) => a.distance - b.distance)[0];
  return nearest?.distance <= maxDistance ? nearest : null;
}

const nearbyWater = computed(() => nearestStation(detailItem.value?.kind === 'nz' ? nzWaterStations : waterStations as WaterStation[], 5));
const nearbyRainfall = computed(() => nearestStation(rainfallStations));

// Live water-level dot on each list row — bulk-fetched once (one WRA call covers every station),
// so scanning the list starts answering "safe today" without opening each route.
// ponytail: water only, rainfall needs a per-station API call; add once a bulk rainfall endpoint exists.
const waterLevels = ref<globalThis.Map<string, number>>(new globalThis.Map());

function nearestWaterStationTo(lat: number, lon: number, maxDistance = 5): WaterStation | null {
  const nearest = (waterStations as WaterStation[])
    .map(station => ({ station, distance: haversineKm(lat, lon, station.lat, station.lon) }))
    .sort((a, b) => a.distance - b.distance)[0];
  return nearest && nearest.distance <= maxDistance ? nearest.station : null;
}

const routeWaterTones = computed<Map<string, WaterTone>>(() => {
  const tones = new globalThis.Map<string, WaterTone>();
  for (const route of canyonRoutes.value) {
    const marker = routeToMarker(route);
    if (!marker) continue;
    const station = nearestWaterStationTo(marker.lat, marker.lon);
    if (!station) continue;
    tones.set(route.id, waterTone(station, waterLevels.value.get(station.id)));
  }
  return tones;
});

function routeToMarker(r: any) {
  const gps = r["gps"]?.trim();
  if (!gps) return null;
  const parts = gps.split(/[,\s]+/).map(Number);
  if (parts.length < 2 || !isValidLatLng(parts[0], parts[1])) return null;
  return { id: r["id"], lat: parts[0], lon: parts[1], name: r["name"] };
}

const filteredRouteMarkers = computed(() =>
  filteredRoutes.value.map(routeToMarker).filter((marker) => marker !== null),
);

const canyonRouteMarkers = computed(() => {
  if (activePanel.value === 'search' || browseMode.value === 'search') return filteredRouteMarkers.value;
  return [
    ...filteredRouteMarkers.value,
    ...nzRoutes.value.map(routeToMarker),
  ].filter(Boolean) as { id: string; lat: number; lon: number; name: string }[];
});

function onSelectRoute(id: string) {
  const twRoute = canyonRoutes.value.find((r) => r.id === id);
  if (twRoute) { openRouteDetail({ kind: "route", data: twRoute }); return; }
  const nzRoute = nzRoutes.value.find((r) => r.id === id);
  if (nzRoute) openRouteDetail({ kind: "nz", data: nzRoute });
}

function openRouteDetail(item: { kind: "canyon" | "route" | "nz"; data: any }) {
  acceptSearchSelection();
  hydrologyCountry.value = item.kind === 'nz' ? 'nz' : 'tw';
  searchStationPoint.value = null;
  waterStationDetail.value = null;
  rainfallStationDetail.value = null;
  detailItem.value = item;
  if (window.innerWidth <= 640) sidebarOpen.value = false;
}

function selectWaterStationFromSearch(station: WaterStation) {
  activePanel.value = null;
  searchStationPoint.value = [station.lat, station.lon];
  if (window.innerWidth <= 640) sidebarOpen.value = false;
  openWaterStation(station, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
}

function selectRainfallStationFromSearch(station: RainfallStation) {
  activePanel.value = null;
  searchStationPoint.value = [station.lat, station.lon];
  if (window.innerWidth <= 640) sidebarOpen.value = false;
  openRainfallStation(station, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
}

function openWaterStation(station: WaterStation, pos: { x: number; y: number }, distance?: number) {
  acceptSearchSelection();
  if (distance == null) detailItem.value = null;
  rainfallStationDetail.value = null;
  waterStationDetail.value = { station, pos, days: 7, distance };
}

function openRainfallStation(station: RainfallStation, pos: { x: number; y: number }, distance?: number) {
  acceptSearchSelection();
  if (distance == null) detailItem.value = null;
  waterStationDetail.value = null;
  rainfallStationDetail.value = {
    station,
    pos,
    distance,
  };
}

function stationScreenPosition(station: { lat: number; lon: number }) {
  return mapRef.value?.stationScreenPosition(station.lat, station.lon)
    ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

// Cards opened from a route open to the LEFT of their icon (the route panel is on the right).
// If the station sits off-screen or too close to the sidebar, the card detaches from its icon —
// so first pan the station to where the card fits between the sidebar and the route panel.
function revealNearbyStation(station: { lat: number; lon: number }, cardWidth: number) {
  const pos = stationScreenPosition(station);
  if (window.innerWidth <= 640) return pos; // phone cards are fixed, not anchored
  const freeLeft = mapLeftInset.value;
  const panel = routeDetailRef.value?.panelBounds;
  const freeRight = panel && panel.left > 0
    ? panel.left
    : window.innerWidth - (nzDetailRef.value?.panelWidth ?? 0);
  const minX = freeLeft + 28 + cardWidth + 16; // CARD_OFFSET + card + MARGIN, as in the cards
  const maxX = freeRight - 40;
  const fits = pos.x >= minX && pos.x <= maxX && pos.y >= 80 && pos.y <= window.innerHeight - 80;
  if (fits) return pos;
  return mapRef.value?.revealAt(station.lat, station.lon, Math.min(minX, maxX), window.innerHeight / 2) ?? pos;
}

function openNearbyWaterStation(station: WaterStation, distance: number) {
  openWaterStation(station, revealNearbyStation(station, 480), distance);
}

function openNearbyRainfallStation(station: RainfallStation, distance: number) {
  openRainfallStation(station, revealNearbyStation(station, 480), distance);
}

const REGION_KEYWORDS: Record<string, string[]> = {
  北部: [
    "台北",
    "臺北",
    "新北",
    "基隆",
    "桃園",
    "新竹",
    "宜蘭",
    "Taipei",
    "New Taipei",
    "Keelung",
    "Taoyuan",
    "Hsinchu",
    "Yilan",
  ],
  中部: [
    "苗栗",
    "台中",
    "臺中",
    "彰化",
    "南投",
    "雲林",
    "Miaoli",
    "Taichung",
    "Changhua",
    "Nantou",
    "Yunlin",
  ],
  南部: [
    "嘉義",
    "台南",
    "臺南",
    "高雄",
    "屏東",
    "澎湖",
    "Chiayi",
    "Tainan",
    "Kaohsiung",
    "Pingtung",
    "Penghu",
  ],
  東部: ["花蓮", "台東", "臺東", "Hualien", "Taitung"],
};

// 臺/台-insensitive lowercase compare, used by both the station and route search below.
function normalize(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/臺/g, '台');
}

const stationSearch = computed(() => {
  const q = normalize(searchQuery.value.trim());
  const hasWater = searchTypes.value.includes('water');
  const hasRainfall = searchTypes.value.includes('rainfall');
  if (!hasWater && !hasRainfall) return null;
  const matches = (fields: string[], region: string) =>
    (hydrologyCountry.value === 'nz' || matchRegion(region, selectedRegion.value)) && fields.some(value => normalize(value).includes(q));
  return {
    water: hasWater ? allHydrologyStations.value.water.filter(s =>
      matches([s.id, s.name, s.river, s.address], s.address)) : [],
    rainfall: hasRainfall ? allHydrologyStations.value.rainfall.filter(s =>
      matches([s.station_id, s.name, s.county, s.town], s.county)) : [],
  };
});

const allHydrologyStations = computed(() => ({
  water: hydrologyCountry.value === 'nz' ? nzWaterStations : waterStations as WaterStation[],
  rainfall: hydrologyCountry.value === 'nz' ? nzRainfallStations : rainfallStations,
}));

const sidebarRoutes = computed(() =>
  browseMode.value === "hydrology" ? [] : filteredRoutes.value,
);
const sidebarWaterStations = computed(() =>
  browseMode.value === "hydrology"
    ? allHydrologyStations.value.water
    : browseMode.value === "search" ? (stationSearch.value?.water ?? []) : [],
);
const sidebarRainfallStations = computed(() =>
  browseMode.value === "hydrology"
    ? allHydrologyStations.value.rainfall
    : browseMode.value === "search" ? (stationSearch.value?.rainfall ?? []) : [],
);
const mapStationScope = computed(() => {
  if (activePanel.value === "search") return stationSearch.value;
  if (browseMode.value === "hydrology") return allHydrologyStations.value;
  if (browseMode.value === "search") return stationSearch.value;
  return null;
});

const searchPoints = computed(() => {
  if (activePanel.value !== "search" && browseMode.value !== "search") return null;
  return [...filteredRouteMarkers.value, ...(stationSearch.value?.water ?? []), ...(stationSearch.value?.rainfall ?? [])]
    .map(s => [s.lat, s.lon] as [number, number]);
});

function toggleRegion(region: string) {
  const i = selectedRegion.value.indexOf(region);
  if (i === -1) selectedRegion.value.push(region);
  else selectedRegion.value.splice(i, 1);
}

function matchRegion(text: string, regions: string[]): boolean {
  if (regions.length === 0) return true;
  return regions.some((r) =>
    (REGION_KEYWORDS[r] ?? []).some((k) => text.includes(k)),
  );
}

const selectedRouteId = computed(() =>
  detailItem.value?.kind === "route" || detailItem.value?.kind === "nz" ? detailItem.value.data.id : null,
);

watch(detailItem, (item) => {
  focusedWaypointIndex.value = null;
  if (!item) selectedId.value = null;
});

// Sync route/search/filter state to URL so results are shareable
watch(
  [detailItem, searchQuery, routeFilter, selectedRegion, filterGpx, searchTypes, browseMode, hydrologyCountry],
  ([item]) => {
    const url = new URL(location.href);
    if (browseMode.value === "route") url.searchParams.delete("view");
    else url.searchParams.set("view", browseMode.value);
    if (browseMode.value === 'hydrology' || browseMode.value === 'search') url.searchParams.set('country', hydrologyCountry.value);
    else url.searchParams.delete('country');
    if (item?.kind === "route" || item?.kind === "nz") url.searchParams.set("route", item.data.id);
    else url.searchParams.delete("route");
    if (searchQuery.value.trim())
      url.searchParams.set("q", searchQuery.value.trim());
    else url.searchParams.delete("q");
    const defaultTypes = ["route"];
    const isDefault = searchTypes.value.length === defaultTypes.length && searchTypes.value.every(t => defaultTypes.includes(t));
    if (!isDefault) url.searchParams.set("type", searchTypes.value.join(","));
    else url.searchParams.delete("type");
    for (const k of ["v", "a", "t", "drop"] as const) {
      if (routeFilter.value[k]) url.searchParams.set(k, routeFilter.value[k]);
      else url.searchParams.delete(k);
    }
    if (filterGpx.value) url.searchParams.set("gpx", "1");
    else url.searchParams.delete("gpx");
    url.searchParams.delete("region");
    for (const r of selectedRegion.value) url.searchParams.append("region", r);
    history.replaceState(null, "", url);
  },
  { deep: true },
);

// Auto-fetch elevation for routes that have a GPS coord but no usable elevation data.
watch(detailItem, async (item) => {
  if (item?.kind !== "route" && item?.kind !== "nz") return;
  const route = item.data;
  if (route.elevation > 0) return; // already stored in PocketBase (0 = default unset)

  // Check whether GPX track already carries elevation (third coord)
  if (route.gpx_track) {
    try {
      const parsed = JSON.parse(route.gpx_track);
      const isSegmented = parsed.length > 0 && Array.isArray(parsed[0][0]);
      const allPts: number[][] = isSegmented
        ? (parsed as number[][][]).flat()
        : parsed;
      const eles = allPts
        .map((p) => p[2])
        .filter((e) => e != null && !isNaN(e));
      if (eles.length >= 2) return; // track has elevation → computed locally
    } catch {}
  }

  // Check whether waypoints carry elevation
  if (route.gpx_waypoints) {
    try {
      const wps = JSON.parse(route.gpx_waypoints);
      const eles = (wps as any[])
        .map((p) => p.ele)
        .filter((e) => typeof e === "number");
      if (eles.length > 0) return; // waypoints have elevation
    } catch {}
  }

  const gps = route.gps?.trim();
  if (!gps) return;
  const parts = gps.split(/[,\s]+/).map(Number);
  if (parts.length < 2 || !isValidLatLng(parts[0], parts[1])) return;
  const [lat, lon] = parts;
  const ele = await fetchElevation(lat, lon);
  if (ele == null) return;
  const isNz = item.kind === "nz";
  // Display only. Persisting is admin work (scripts/backfill-elevation.mjs); the browser never writes to PocketBase.
  // Patch in-memory record so it survives card close/reopen within the session
  const routes = isNz ? nzRoutes.value : canyonRoutes.value;
  const idx = routes.findIndex((r) => r.id === route.id);
  if (idx !== -1) routes[idx]["elevation"] = ele;
  // Patch the open card so RouteDetail renders it immediately
  if (
    detailItem.value?.kind === item.kind &&
    detailItem.value.data.id === route.id
  ) {
    detailItem.value.data.elevation = ele;
  }
});

function normaliseRoute(r: any, isEn: boolean) {
  return {
    ...r,
    name_zh:   r.name    ?? "",
    region_zh: r.region  ?? "",
    name:   (isEn && r.name_en)   || r.name   || "",
    region: (isEn && r.region_en) || r.region || "",
    // nz_routes stores gpx_waypoints as a parsed JSON object; stringify so the
    // rest of the codebase (which expects a string) can JSON.parse it unchanged.
    gpx_waypoints: typeof r.gpx_waypoints === "string"
      ? r.gpx_waypoints
      : r.gpx_waypoints
        ? JSON.stringify(r.gpx_waypoints)
        : "",
  };
}

async function fetchRoutes(showOverlay: boolean) {
  if (showOverlay) {
    loading.value = true;
    loadError.value = false;
  }
  routesLoading.value = true;
  try {
    const isEn = locale.value === "en";
    const nameF = isEn ? "name_en" : "name";
    const twFields = 'id,name,name_en,region,region_en,grading,max_drop,approach,total_time,gps,gpx_track,gpx_waypoints,elevation,catchment_km2,catchment_sampled,catchment_gps,deep_pool,ab_shuttle,note';
    const [twRecords, nzRecords] = await Promise.all([
      pb.collection("canyon_routes").getFullList({
        sort: nameF,
        filter: "type = '溪降'",
        fields: twFields,
      }),
      pb.collection("nz_routes").getFullList({ sort: nameF })
        .catch(() => [] as any[]), // collection may not exist yet
    ]);

    canyonRoutes.value = twRecords.map((r) => normaliseRoute(r, isEn));
    nzRoutes.value     = nzRecords.map((r)  => normaliseRoute(r, isEn));
    routesLoaded.value = true;
  } catch {
    if (showOverlay) loadError.value = true;
  } finally {
    routesLoading.value = false;
    if (showOverlay) loading.value = false;
  }
}

// Re-fetch with new locale when language is switched; update open card data
watch(locale, async () => {
  await fetchRoutes(false);
  if (detailItem.value?.kind === "route" || detailItem.value?.kind === "nz") {
    const id = detailItem.value.data.id;
    const twRoute = canyonRoutes.value.find((r) => r.id === id);
    const nzRoute = nzRoutes.value.find((r) => r.id === id);
    if (twRoute) detailItem.value = { kind: "route", data: twRoute };
    else if (nzRoute) detailItem.value = { kind: "nz", data: nzRoute };
  }
});

onMounted(async () => {
  // Restore filter state from URL before loading
  const sp = new URLSearchParams(location.search);
  const view = sp.get("view");
  if (view === "nz" || view === "hydrology" || view === "search") {
    browseMode.value = view;
  }
  hydrologyCountry.value = view === 'nz' || ((view === 'hydrology' || view === 'search') && sp.get('country') === 'nz') ? 'nz' : 'tw';
  if (sp.get("q")) searchQuery.value = sp.get("q")!;
  if (sp.get("type")) {
    const valid: SearchType[] = ["route", "water", "rainfall"];
    const parsed = sp.get("type")!.split(",").filter(t => valid.includes(t as SearchType)) as SearchType[];
    if (parsed.length) searchTypes.value = parsed;
  }
  for (const k of ["v", "a", "t", "drop"] as const)
    if (sp.get(k)) routeFilter.value[k] = sp.get(k)!;
  if (sp.get("gpx") === "1") filterGpx.value = true;
  const regions = sp.getAll("region");
  if (regions.length) selectedRegion.value = regions;

  await fetchRoutes(true);
  fetchAllWaterLevels().then(levels => { waterLevels.value = levels; }).catch(() => {});

  // Restore selected route from URL
  const routeId = sp.get("route");
  if (routeId) {
    const route = canyonRoutes.value.find((r) => r.id === routeId);
    const nzRoute = nzRoutes.value.find((r) => r.id === routeId);
    if (route) detailItem.value = { kind: "route", data: route };
    else if (nzRoute) {
      if (browseMode.value !== 'search') browseMode.value = "nz";
      hydrologyCountry.value = 'nz';
      detailItem.value = { kind: "nz", data: nzRoute };
    }
  }
  await nextTick();
  if (!selectedRouteId.value && !sp.has("q") && !sp.has("region") && !sp.has("station")) {
    mapRef.value?.focusCountry(hydrologyCountry.value === "nz" ? "nz" : "route");
  }
});

function parseMeters(val: string): number {
  const m = (val ?? "").match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

const filteredRoutes = computed(() => {
  if (!searchTypes.value.includes("route")) return [];
  const q = normalize(searchQuery.value.trim());
  const { v, a, t, drop } = routeFilter.value;
  const direction = routeSortDescending.value ? -1 : 1;
  const compareGrade = (a: number, b: number) =>
    a === 999 ? (b === 999 ? 0 : 1) : b === 999 ? -1 : (a - b) * direction;
  const isNz = browseMode.value === 'search' && hydrologyCountry.value === 'nz';
  return (isNz ? nzRoutes.value : canyonRoutes.value)
    .filter((r) => {
      const hasGps = r["gps"]?.trim();
      if (!hasGps) return false;
      if (!isNz && !matchRegion(r["region_zh"] || r["region"] || "", selectedRegion.value)) return false;
      const matchSearch =
        !q ||
        [r.name, r.name_zh, r.name_en, r.region, r.region_zh, r.region_en, r.river, r.location].some(value => normalize(value).includes(q));
      const grading = (r["grading"] ?? "").split(/\s+/);
      const matchV = !v || grading.some((p: string) => p === v);
      const matchA = !a || grading.some((p: string) => p === a);
      const matchT = !t || grading.some((p: string) => p === t);
      const d = parseMeters(r["max_drop"]);
      const matchDrop =
        !drop ||
        (drop === "≤20" && d > 0 && d <= 20) ||
        (drop === "21-40" && d > 20 && d <= 40) ||
        (drop === "41-60" && d > 40 && d <= 60) ||
        (drop === ">60" && d > 60);
      const matchGpx = !filterGpx.value || !!r["gpx_track"];
      return matchSearch && matchV && matchA && matchT && matchDrop && matchGpx;
    })
    .sort((a, b) => {
      const ag = a["grading"] ?? "";
      const bg = b["grading"] ?? "";
      const vA = parseInt(ag.match(/V(\d+)/)?.[1] ?? "999");
      const vB = parseInt(bg.match(/V(\d+)/)?.[1] ?? "999");
      if (vA !== vB) return compareGrade(vA, vB);
      const aA = parseInt(ag.match(/A(\d+)/)?.[1] ?? "999");
      const aB = parseInt(bg.match(/A(\d+)/)?.[1] ?? "999");
      if (aA !== aB) return compareGrade(aA, aB);
      const T_ORDER: Record<string, number> = {
        I: 1,
        II: 2,
        III: 3,
        IV: 4,
        V: 5,
        VI: 6,
      };
      const findT = (g: string) =>
        T_ORDER[
          g.split(/\s+/).find((p) => /^(I{1,3}|IV|VI?)$/.test(p)) ?? ""
        ] ?? 999;
      return compareGrade(findT(ag), findT(bg));
    });
});

type SearchSuggestion = {
  kind: SearchType;
  id: string;
  name: string;
  location: string;
};

const searchSuggestions = computed<SearchSuggestion[]>(() => {
  if (!searchQuery.value.trim()) return [];
  return [
    ...filteredRoutes.value.map(route => ({
      kind: "route" as const,
      id: route.id,
      name: route.name,
      location: route.region ?? "",
    })),
    ...(stationSearch.value?.water ?? []).map(station => ({
      kind: "water" as const,
      id: station.id,
      name: station.name,
      location: [station.river, station.address].filter(Boolean).join(" · "),
    })),
    ...(stationSearch.value?.rainfall ?? []).map(station => ({
      kind: "rainfall" as const,
      id: station.station_id,
      name: station.name,
      location: `${station.county} ${station.town}`,
    })),
  ].slice(0, 5);
});

const searchResultCount = computed(() =>
  filteredRoutes.value.length
  + (stationSearch.value?.water.length ?? 0)
  + (stationSearch.value?.rainfall.length ?? 0),
);

function selectSearchSuggestion(suggestion: SearchSuggestion) {
  acceptSearchSelection();
  sidebarOpen.value = true;
  if (suggestion.kind === "route") return onSelectRoute(suggestion.id);
  if (suggestion.kind === "water") {
    const station = allHydrologyStations.value.water.find(item => item.id === suggestion.id);
    if (station) selectWaterStationFromSearch(station);
    return;
  }
  const station = allHydrologyStations.value.rainfall.find(item => item.station_id === suggestion.id);
  if (station) selectRainfallStationFromSearch(station);
}

watch(searchQuery, () => {
  selectedId.value = null;
});

function clearAllFilters() {
  browseMode.value = activePanel.value === 'search' ? 'search' : hydrologyCountry.value === 'nz' ? 'nz' : 'route';
  searchQuery.value = "";
  routeFilter.value = { v: "", a: "", t: "", drop: "" };
  filterGpx.value = false;
  searchTypes.value = ["route"];
  selectedRegion.value = [];
  selectedId.value = null;
  searchStationPoint.value = null;
  waterStationDetail.value = null;
  rainfallStationDetail.value = null;
}

function removeActiveFilter(filter: { clear: () => void }) {
  filter.clear();
  if (browseMode.value === "search" && !activeFilters.value.length) clearAllFilters();
}

// Active filter chips — each entry can clear itself
type FilterKey = "v" | "a" | "t" | "drop";
const FILTER_KEYS: [FilterKey, string][] = [
  ["v", ""],
  ["a", ""],
  ["t", ""],
  ["drop", "m"],
];

const activeFilters = computed(() => {
  const items: { label: string; clear: () => void }[] = [];
  if (!routeOnlySearch.value) {
    const labels = locale.value === "en"
      ? { route: "Routes", water: "Water stations", rainfall: "Rainfall stations" }
      : { route: "路線", water: "水位站", rainfall: "雨量站" };
    items.push({
      label: searchTypes.value.map(type => labels[type]).join(locale.value === "en" ? " + " : "、"),
      clear: () => (searchTypes.value = ["route"]),
    });
  }
  if (searchQuery.value.trim())
    items.push({
      label: `"${searchQuery.value.trim()}"`,
      clear: () => {
        searchQuery.value = "";
        selectedId.value = null;
      },
    });
  for (const [k, suffix] of FILTER_KEYS)
    if (routeFilter.value[k])
      items.push({
        label: routeFilter.value[k] + suffix,
        clear: () => (routeFilter.value = { ...routeFilter.value, [k]: "" }),
      });
  if (filterGpx.value)
    items.push({ label: locale.value === "en" ? "Has GPX" : "有 GPX", clear: () => (filterGpx.value = false) });
  for (const r of selectedRegion.value)
    items.push({ label: localeRegion(r), clear: () => toggleRegion(r) });
  return items;
});

</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100dvh;
  overflow: hidden;
}

.sidebar-wrap {
  /* ponytail: overlay instead of push — compositor-only transform, no layout reflow on open/close */
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1200; /* above Leaflet and bottom toolbar while open */
  height: 100%;
  width: 280px;
  min-width: 280px;
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
  overflow: visible;
}

.sidebar-wrap.closed {
  transform: translateX(-100%);
  opacity: 0;
  pointer-events: none;
}

.sidebar-wrap.resizing {
  transition: none;
  user-select: none;
}

@media (max-width: 640px) {
  .sidebar-wrap {
    width: 100% !important;
    min-width: 100% !important;
  }
}

.resize-handle {
  position: absolute;
  top: 0;
  right: -4px;
  width: 8px;
  height: 100%;
  cursor: col-resize;
  z-index: 100;
  background: transparent;
  transition: background 0.15s;
}
.resize-handle:hover,
.sidebar-wrap.resizing .resize-handle {
  background: rgba(108, 142, 245, 0.25);
}
.resize-handle::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #6c8ef5;
  box-shadow: 0 -8px 0 #6c8ef5, 0 8px 0 #6c8ef5;
  opacity: 0;
  transition: opacity 0.15s;
}
.resize-handle:hover::after,
.sidebar-wrap.resizing .resize-handle::after {
  opacity: 1;
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
  display: flex;
  align-items: center;
  background: #1a1a2e;
  color: #6c8ef5;
  border: none;
  border-radius: 0 8px 8px 0;
  padding: 16px 8px;
  cursor: pointer;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3);
  transition: background 0.15s;
}

.sidebar-open-btn:hover {
  background: #252545;
}
.sidebar-open-btn:focus-visible {
  outline: 2px solid #6c8ef5;
  outline-offset: 2px;
}

.loading-overlay {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 1rem;
  color: #888;
  background: #0f172a;
}

.loading-overlay.error {
  color: #e05c5c;
}

/* ── Active filter chips ────────────────────────────────────────────── */
.filter-chips {
  position: fixed;
  bottom: 92px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  z-index: 1049;
  max-width: calc(100vw - 32px);
  overflow-x: auto;
  padding: 2px 4px;
  /* hide scrollbar */
  scrollbar-width: none;
}
.filter-chips::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  background: #1a1a2e;
  border: 1px solid #6c8ef5;
  border-radius: 20px;
  color: #6c8ef5;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}
.filter-chip:hover {
  background: #6c8ef5;
  color: #fff;
}

.filter-chip-label,
.filter-chip-remove {
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.filter-chip-label { padding: 0; }
.filter-chip-remove { padding: 0 0 0 2px; }
.filter-chip-label:focus-visible,
.filter-chip-remove:focus-visible {
  outline: 2px solid #b5c6ff;
  outline-offset: 2px;
  border-radius: 3px;
}

.filter-chip--clear {
  border-color: #e05c5c;
  color: #e05c5c;
}
.filter-chip--clear:hover {
  background: #e05c5c;
  color: #fff;
}

/* slide-up transition */
.chips-enter-active,
.chips-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.chips-enter-from,
.chips-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}

/* ── Bottom toolbar ─────────────────────────────────────────────────── */
.feature-invite {
  position: fixed; bottom: 108px; left: 50%; transform: translateX(-50%);
  z-index: 1050; width: min(320px, calc(100vw - 32px)); box-sizing: border-box;
  display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px;
  background: var(--color-panel); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 12px;
}
.feature-invite p { margin: 0 0 8px; font-size: 0.8125rem; line-height: 1.5; }
.feature-invite button { font: inherit; font-size: 0.8125rem; cursor: pointer; }
.feature-invite-link { padding: 0; border: 0; background: none; color: var(--color-primary-hover); text-decoration: underline; text-underline-offset: 3px; }
.feature-invite-link:hover { color: var(--color-text-strong); }
.feature-invite-close { margin-left: auto; padding: 4px; border: 0; background: none; color: var(--color-text); }
.feature-invite button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
@media (max-width: 640px) {
  .sidebar-wrap:not(.closed) ~ .feature-invite { display: none; }
}
.bottom-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  background: var(--color-panel);
  border: 1px solid rgba(42, 42, 74, 0.8);
  border-radius: 50px;
  padding: 8px 20px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.45);
  z-index: 1050;
}

.bar-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  background: none;
  border: none;
  color: #888;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 16px;
  border-radius: 40px;
  transition: background-color 0.15s, color 0.15s;
  letter-spacing: 0.3px;
}
.bar-btn:hover {
  color: #d0d0e8;
  background: rgba(255, 255, 255, 0.08);
}
.bar-btn.active {
  color: #6c8ef5;
  background: rgba(108, 142, 245, 0.15);
}
.bar-btn-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.filter-badge {
  position: absolute;
  top: -6px;
  right: -8px;
  background: #6c8ef5;
  color: #fff;
  font-size: 0.6rem;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  border: 2px solid rgba(18, 18, 42, 0.92);
}
</style>
