<template>
  <Teleport to="body">
    <div
      ref="panelRef"
      class="panel"
      :class="{ resizing: isResizing }"
      :style="{ width: panelWidth + 'px' }"
      @click.stop
    >
      <div class="resize-handle" @mousedown.prevent="startResize" />

      <!-- ── Header ── -->
      <div class="panel-header">
        <div class="header-content">
          <!-- eyebrow -->
          <span v-if="eyebrow" class="eyebrow">{{ eyebrow }}</span>
          <!-- route name -->
          <span class="route-title">{{ title }}</span>
          <!-- subtitle (NZ routes) -->
          <span v-if="subtitle" class="route-subtitle">{{ subtitle }}</span>
          <!-- grade row -->
          <div v-if="d.grading" class="grade-row">
            <span
              v-if="ropeGrade !== '—'"
              :class="['grade-tag', 'rope', ropeGradeClass]"
              :data-tooltip="
                (locale === 'en' ? ROPE_TIPS_EN : ROPE_TIPS)[ropeGrade]
              "
              :aria-label="`${ropeGrade}: ${(locale === 'en' ? ROPE_TIPS_EN : ROPE_TIPS)[ropeGrade]}`"
              tabindex="0"
              >{{ ropeGrade }}</span
            >
            <span
              v-if="waterGrade !== '—'"
              class="grade-tag water"
              :data-tooltip="
                (locale === 'en' ? WATER_TIPS_EN : WATER_TIPS)[waterGrade]
              "
              :aria-label="`${waterGrade}: ${(locale === 'en' ? WATER_TIPS_EN : WATER_TIPS)[waterGrade]}`"
              tabindex="0"
              >{{ waterGrade }}</span
            >
            <span
              v-if="timeGrade !== '—'"
              class="grade-tag time"
              :data-tooltip="
                (locale === 'en' ? TIME_TIPS_EN : TIME_TIPS)[timeGrade]
              "
              :aria-label="`${timeGrade}: ${(locale === 'en' ? TIME_TIPS_EN : TIME_TIPS)[timeGrade]}`"
              tabindex="0"
              >{{ timeGrade }}</span
            >
            <span
              v-if="gradingStars"
              class="grade-stars"
              :data-tooltip="starTip ?? undefined"
              :aria-label="starTip ?? undefined"
              tabindex="0"
              >{{ gradingStars }}</span
            >
            <span
              v-if="item.kind === 'canyon'"
              :class="['kind-badge', item.kind]"
              >{{ kindLabel }}</span
            >
          </div>
          <!-- status strip: water level + rainfall at a glance, no tab switch needed.
               Always rendered — silence here reads as "conditions fine", so an explicit
               no-coverage message replaces the old no-op when there's simply no nearby station. -->
          <button
            :class="[
              'status-strip',
              `tone-strip-${nearbyWater || nearbyRainfall ? statusStripTone : 'muted'}`,
            ]"
            @click="activeTab = 'hydrology'"
          >
            <template v-if="nearbyWater || nearbyRainfall">
              <span v-if="nearbyWater" :class="`tone-${waterSummary.tone}`"
                >{{ waterSummary.text }}</span
              >
              <span v-if="nearbyWater && nearbyRainfall" class="status-sep"
                >·</span
              >
              <span
                v-if="nearbyRainfall"
                :class="`tone-${rainfallSummary.tone}`"
                >{{ rainfallSummary.text }}</span
              >
            </template>
            <span v-else class="tone-muted">{{
              locale === "en"
                ? "No hydrology data within range"
                : "範圍內沒有水文資料"
            }}</span>
          </button>
          <!-- hazard banner: hazards live in the Hydrology tab body, but must stay
               visible from whichever tab is open — a "should I go" read must never
               close without seeing documented hazards. -->
          <button
            v-if="d.hazards_zh || d.hazards"
            class="status-strip hazard-strip tone-strip-danger"
            @click="activeTab = 'hydrology'"
          >
            <span class="tone-danger hazard-text">{{
              locale === "en" ? d.hazards : d.hazards_zh || d.hazards
            }}</span>
          </button>
        </div>
        <button
          class="close-btn"
          :aria-label="locale === 'en' ? 'Close' : '關閉'"
          @click="$emit('close')"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <!-- ── Tabs ── -->
      <div class="tab-bar" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          role="tab"
          :aria-selected="activeTab === tab.id"
          :class="['tab-btn', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          {{ locale === "en" ? tab.en : tab.zh }}
        </button>
      </div>

      <!-- ── Body ── -->
      <div class="panel-body">
        <!-- TAB: 快速資訊 -->
        <template v-if="activeTab === 'info'">
          <div class="section-label">
            {{ locale === "en" ? "QUICK INFO" : "快速資訊 QUICK INFO" }}
          </div>

          <div
            v-if="d.location_zh || d.location || d.region"
            class="info-block"
          >
            <div class="info-key">
              {{ locale === "en" ? "Location" : "地點" }}
            </div>
            <div class="info-val">
              {{
                locale === "en"
                  ? d.location || d.region
                  : d.location_zh || d.region
              }}
            </div>
            <div
              v-if="d.location && d.location_zh && locale !== 'en'"
              class="info-sub"
            >
              {{ d.location }}
            </div>
          </div>

          <div v-if="d.character_zh || d.character" class="info-block">
            <div class="info-key">
              {{ locale === "en" ? "Character" : "性質" }}
            </div>
            <div class="info-val">
              {{
                locale === "en" ? d.character : d.character_zh || d.character
              }}
            </div>
          </div>

          <div v-if="d.grading" class="info-block">
            <div class="info-key">
              {{ locale === "en" ? "Grade" : "分級" }}
            </div>
            <div class="info-val grade-desc-row">
              <span
                v-if="ropeGrade !== '—'"
                :class="['grade-tag', 'rope', ropeGradeClass]"
                >{{ ropeGrade }}</span
              >
              <span v-if="waterGrade !== '—'" class="grade-tag water">{{
                waterGrade
              }}</span>
              <span v-if="timeGrade !== '—'" class="grade-tag time">{{
                timeGrade
              }}</span>
              <span v-if="gradingStars" class="grade-stars">{{
                gradingStars
              }}</span>
            </div>
            <div v-if="ropeGrade !== '—'" class="info-sub">
              {{ (locale === "en" ? ROPE_TIPS_EN : ROPE_TIPS)[ropeGrade] }}
            </div>
            <div v-if="waterGrade !== '—'" class="info-sub">
              {{ (locale === "en" ? WATER_TIPS_EN : WATER_TIPS)[waterGrade] }}
            </div>
            <div v-if="timeGrade !== '—'" class="info-sub">
              {{ (locale === "en" ? TIME_TIPS_EN : TIME_TIPS)[timeGrade] }}
            </div>
          </div>

          <div v-if="d.gear_zh || d.gear" class="info-block">
            <div class="info-key">
              {{ locale === "en" ? "Gear" : "裝備" }}
            </div>
            <div class="info-val">
              {{ locale === "en" ? d.gear : d.gear_zh || d.gear }}
            </div>
          </div>

          <!-- Taiwan-style tags when no extended data -->
          <template v-if="!d.location && !d.character">
            <div
              v-if="
                d.deep_pool ||
                (d.ab_shuttle && d.ab_shuttle !== '不需要') ||
                maxEle != null
              "
              class="tag-row"
            >
              <span v-if="d.deep_pool" class="info-tag pool">{{
                d.deep_pool === "有"
                  ? locale === "en"
                    ? "Deep Pool"
                    : "有深潭"
                  : d.deep_pool === "無"
                    ? locale === "en"
                      ? "No Deep Pool"
                      : "無深潭"
                    : d.deep_pool
              }}</span>
              <span
                v-if="d.ab_shuttle && d.ab_shuttle !== '不需要'"
                class="info-tag shuttle"
                >{{ locale === "en" ? "A-B Shuttle" : "需要 AB 車" }}</span
              >
              <span v-if="maxEle != null" class="info-tag ele"
                >{{ locale === "en" ? "Elevation" : "海拔高度" }}
                {{ maxEle }}m</span
              >
            </div>
            <div v-if="d.region" class="row">
              <span class="row-label">{{
                locale === "en" ? "Region" : "地區"
              }}</span>
              <span class="row-value">{{ d.region }}</span>
            </div>
            <div v-if="d.max_drop" class="row">
              <span class="row-label">{{
                locale === "en" ? "Max Rappel" : "最高瀑高"
              }}</span>
              <span class="row-value">{{ d.max_drop }}</span>
            </div>
            <div v-if="d.catchment_sampled && catchmentObserverUrl" class="row">
              <span class="row-label">{{
                locale === "en" ? "Catchment" : "集水區"
              }}</span>
              <a
                class="catchment-link"
                :href="catchmentObserverUrl"
                target="_blank"
                rel="noopener"
                :title="
                  locale === 'en'
                    ? 'Open this point in Catchment Observer'
                    : '在集水區觀察員開啟此點'
                "
                >~ {{ d.catchment_km2 > 0 ? d.catchment_km2 : "< 0.1" }} km²
                ↗</a
              >
            </div>
          </template>

          <!-- Max drop for NZ routes -->
          <div v-if="d.location && d.max_drop" class="info-block">
            <div class="info-key">
              {{ locale === "en" ? "Max Drop" : "最高落差" }}
            </div>
            <div class="info-val">{{ d.max_drop }}</div>
          </div>

          <!-- Source link -->
          <div v-if="d.source_url" class="info-block">
            <div class="info-key">
              {{ locale === "en" ? "Source" : "資料來源" }}
            </div>
            <a
              :href="d.source_url"
              target="_blank"
              rel="noopener"
              class="info-link"
              >KiwiCanyons ↗</a
            >
          </div>

          <div v-if="d.gpx_track || noteGpxLinks.length" class="row">
            <span class="row-label">GPX</span>
            <span class="row-value gpx-row-value">
              <button
                v-if="d.gpx_track"
                class="gpx-dl-btn"
                @click="downloadGpx"
              >
                {{ locale === "en" ? "Download GPX" : "下載 GPX" }}
              </button>
              <span
                v-if="gpxError"
                class="gpx-error tone-danger"
                role="alert"
              >
                {{
                  locale === "en"
                    ? "GPX data is invalid — contact the route maintainer"
                    : "GPX 資料格式有誤，請聯絡路線維護者"
                }}
              </span>
              <a
                v-for="link in noteGpxLinks"
                :key="link"
                :href="link"
                target="_blank"
                rel="noopener"
                class="note-link"
                >{{ locale === "en" ? "Route GPX" : "路線 gpx" }} ↗</a
              >
            </span>
          </div>

          <div
            v-if="noteHasVideo || (noteHasText && !d.source_url)"
            class="row"
          >
            <span class="row-label">{{
              locale === "en" ? "Notes" : "附註"
            }}</span>
            <span class="row-value">
              <template v-for="(seg, i) in parseNote(d.note)" :key="i">
                <a
                  v-if="seg.isUrl && seg.isYoutube"
                  :href="seg.text"
                  target="_blank"
                  rel="noopener"
                  class="note-link"
                  >{{ locale === "en" ? "Route Video" : "路線影片" }} ↗</a
                >
                <span v-else-if="!seg.isUrl">{{ seg.text }}</span>
              </template>
            </span>
          </div>

          <!-- Elevation profile -->
          <div v-if="elevationData" class="elevation-section">
            <div class="ele-header">
              <span class="ele-title">{{
                locale === "en" ? "Elevation Profile" : "海拔高度變化"
              }}</span>
              <div class="ele-stats">
                <span class="ele-up">↑ {{ elevationData.gain }}m</span>
                <span class="ele-down">↓ {{ elevationData.loss }}m</span>
              </div>
            </div>
            <div class="ele-chart-wrap">
              <div class="ele-y-labels">
                <span>{{ elevationData.maxEle }}m</span>
                <span>{{ elevationData.minEle }}m</span>
              </div>
              <svg
                class="ele-svg"
                viewBox="0 0 280 60"
                preserveAspectRatio="none"
              >
                <polygon :points="elePolygon" fill="rgba(230,57,70,0.18)" />
                <polyline
                  :points="elePolyline"
                  fill="none"
                  stroke="#e63946"
                  stroke-width="1.5"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
          </div>
        </template>

        <!-- TAB: 行程規畫 -->
        <template v-else-if="activeTab === 'itinerary'">
          <!-- 時間規劃 section -->
          <div class="section-label">
            {{ locale === "en" ? "TIMING" : "時間規劃 TIMING" }}
          </div>
          <div v-if="d.approach_time" class="info-block">
            <div class="info-key">
              {{ locale === "en" ? "Approach" : "進場時間" }}
            </div>
            <div class="info-val">{{ d.approach_time }}</div>
          </div>
          <div v-if="d.descent_time" class="info-block">
            <div class="info-key">
              {{ locale === "en" ? "Descent" : "峽谷時間" }}
            </div>
            <div class="info-val">{{ d.descent_time }}</div>
          </div>
          <div v-if="d.total_time" class="info-block">
            <div class="info-key">
              {{ locale === "en" ? "Total" : "全程時間" }}
            </div>
            <div class="info-val">{{ d.total_time }}</div>
          </div>
          <div v-if="d.first_descent" class="info-block">
            <div class="info-key">
              {{ locale === "en" ? "First Descent" : "首降" }}
            </div>
            <div class="info-val">{{ d.first_descent }}</div>
          </div>
          <!-- 進場路線 section -->
          <div class="section-label" style="padding-top: 14px">
            {{ locale === "en" ? "APPROACH" : "進場路線 APPROACH" }}
          </div>
          <div v-if="d.approach" class="info-block">
            <div class="info-key">
              {{ locale === "en" ? "Route" : "主要進場" }}
            </div>
            <div class="info-val approach-text">{{ d.approach }}</div>
          </div>
          <div
            v-if="d.ab_shuttle && d.ab_shuttle !== '不需要'"
            class="info-block"
          >
            <div class="info-key">
              {{ locale === "en" ? "Shuttle" : "接駁" }}
            </div>
            <div class="info-val">{{ d.ab_shuttle }}</div>
          </div>
          <div v-if="d.gps" class="info-block">
            <div class="info-key">
              {{
                d.gpx_track
                  ? locale === "en"
                    ? "Parking GPS"
                    : "停車點 GPS"
                  : "GPS"
              }}
            </div>
            <a
              v-if="d.gpx_track"
              class="info-link coord"
              :href="mapsUrl(d.gps.trim())"
              target="_blank"
              rel="noopener"
              >{{ d.gps }} ↗</a
            >
            <span v-else class="info-val coord">{{ d.gps }}</span>
          </div>
          <!-- GPX waypoints -->
          <template v-if="waypoints.length">
            <div class="section-label" style="padding-top: 14px">
              {{ locale === "en" ? "WAYPOINTS" : "路線航點 WAYPOINTS" }}
            </div>
            <div class="wpt-list">
              <div v-for="(w, i) in waypoints" :key="i" class="wpt-item">
                <button
                  class="wpt-row"
                  :class="{ active: activeWptIndex === i }"
                  @click="toggleWpt(i)"
                >
                  <span
                    class="wpt-num"
                    :class="{ active: activeWptIndex === i }"
                    >{{ i + 1 }}</span
                  >
                  <span
                    class="wpt-name"
                    :title="
                      w.name ||
                      (locale === 'en' ? `Point ${i + 1}` : `點位 ${i + 1}`)
                    "
                    >{{
                      w.name ||
                      (locale === "en" ? `Point ${i + 1}` : `點位 ${i + 1}`)
                    }}</span
                  >
                  <span v-if="w.ele != null" class="wpt-ele"
                    >{{ Math.round(w.ele) }}m</span
                  >
                  <svg
                    class="wpt-chevron"
                    :class="{ open: activeWptIndex === i }"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div v-if="activeWptIndex === i" class="wpt-card">
                  <a
                    :href="mapsUrl(`${w.lat},${w.lon}`)"
                    target="_blank"
                    rel="noopener"
                    class="wpt-card-coord"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                    </svg>
                    {{ w.lat.toFixed(6) }}, {{ w.lon.toFixed(6) }} ↗
                  </a>
                </div>
              </div>
            </div>
          </template>
          <div
            v-if="
              !d.approach_time &&
              !d.total_time &&
              !d.approach &&
              !waypoints.length
            "
            class="empty-tab"
          >
            {{ locale === "en" ? "No itinerary data" : "尚無行程資料" }}
          </div>
        </template>

        <!-- TAB: 氣象預報 -->
        <template v-else-if="activeTab === 'weather'">
          <FiveDayForecast
            :gps="d.gps"
            :detail-url="weatherForecastUrl || undefined"
            :detail-label="
              locale === 'en' ? 'CWA detailed forecast' : '中央氣象署詳細預報'
            "
          />
        </template>

        <!-- TAB: 鄰近水文 -->
        <template v-else-if="activeTab === 'hydrology'">
          <div class="section-label">
            {{ locale === "en" ? "HYDROLOGY" : "鄰近水文 HYDROLOGY" }}
          </div>
          <div v-if="nearbyWater || nearbyRainfall" class="hydrology-section">
            <div class="hydrology-title">
              {{ locale === "en" ? "Nearby hydrology" : "鄰近水文" }}
            </div>
            <div class="hydrology-columns">
              <span>{{ locale === "en" ? "Station" : "測站" }}</span>
              <span>{{
                locale === "en" ? "Distance from route" : "距離路線"
              }}</span>
            </div>
            <button
              v-if="nearbyWater"
              class="hydrology-row"
              @click="
                emit(
                  'selectWaterStation',
                  nearbyWater.station,
                  nearbyWater.distance,
                )
              "
            >
              <img src="/water-level.svg" alt="" />
              <span class="hydrology-copy">
                <strong>{{ nearbyWater.station.name }}</strong>
                <small :class="`tone-${waterSummary.tone}`">{{
                  waterSummary.text
                }}</small>
              </span>
              <span class="hydrology-distance"
                >{{ nearbyWater.distance.toFixed(1) }} km</span
              >
            </button>
            <button
              v-if="nearbyWater && waterSummary.failed"
              class="hydrology-retry"
              @click.stop="loadNearbyHydrology"
            >
              {{ locale === "en" ? "Retry" : "重試" }}
            </button>
            <button
              v-if="nearbyRainfall"
              class="hydrology-row"
              @click="
                emit(
                  'selectRainfallStation',
                  nearbyRainfall.station,
                  nearbyRainfall.distance,
                )
              "
            >
              <img src="/rainfall.svg" alt="" />
              <span class="hydrology-copy">
                <strong>{{ nearbyRainfall.station.name }}</strong>
                <small :class="`tone-${rainfallSummary.tone}`">{{
                  rainfallSummary.text
                }}</small>
              </span>
              <span class="hydrology-distance"
                >{{ nearbyRainfall.distance.toFixed(1) }} km</span
              >
            </button>
            <button
              v-if="nearbyRainfall && rainfallSummary.failed"
              class="hydrology-retry"
              @click.stop="loadNearbyHydrology"
            >
              {{ locale === "en" ? "Retry" : "重試" }}
            </button>
          </div>
          <div v-if="d.hazards_zh || d.hazards" class="info-block">
            <div class="info-key">
              {{ locale === "en" ? "Hazards" : "危險提示" }}
            </div>
            <div class="info-val warning-text">
              {{ locale === "en" ? d.hazards : d.hazards_zh || d.hazards }}
            </div>
          </div>
          <div
            v-if="!nearbyWater && !nearbyRainfall && !d.hazards"
            class="empty-tab"
          >
            {{
              locale === "en"
                ? "No hydrology data within range"
                : "範圍內沒有水文資料"
            }}
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { vGradeClass } from "../lib/grade";
import { locale } from "../lib/locale";
import {
  fetchWaterLevel,
  waterTone,
  type WaterStation,
} from "../lib/waterLevel";
import { fetchRainfallData } from "../lib/rainfallData";
import type { RainfallStation } from "../lib/rainfall";
import FiveDayForecast from "./FiveDayForecast.vue";
import { useResizableWidth } from "../lib/useResizableWidth";

type NearbyStation<T> = { station: T; distance: number };

const props = defineProps<{
  item: { kind: "canyon" | "route"; data: any };
  nearbyWater?: NearbyStation<WaterStation> | null;
  nearbyRainfall?: NearbyStation<RainfallStation> | null;
}>();
const emit = defineEmits<{
  close: [];
  selectWaterStation: [station: WaterStation, distance: number];
  selectRainfallStation: [station: RainfallStation, distance: number];
  focusWaypoint: [index: number | null];
}>();

const {
  width: panelWidth,
  isResizing,
  start: startResize,
} = useResizableWidth(
  452,
  (e) => window.innerWidth - e.clientX,
  380,
  () => Math.min(900, window.innerWidth),
);

const panelRef = ref<HTMLElement | null>(null);
const panelBounds = ref<DOMRect | null>(null);
function updatePanelBounds() {
  panelBounds.value = panelRef.value?.getBoundingClientRect() ?? null;
}
const panelObserver = new ResizeObserver(updatePanelBounds);
onMounted(() => {
  if (panelRef.value) panelObserver.observe(panelRef.value);
  window.addEventListener("resize", updatePanelBounds);
});
onUnmounted(() => {
  panelObserver.disconnect();
  window.removeEventListener("resize", updatePanelBounds);
});
defineExpose({ panelBounds });

const activeTab = ref<"info" | "itinerary" | "weather" | "hydrology">("info");
const activeWptIndex = ref<number | null>(null);
const gpxError = ref(false);

function toggleWpt(i: number) {
  const next = activeWptIndex.value === i ? null : i;
  activeWptIndex.value = next;
  emit("focusWaypoint", next);
}

const tabs = [
  { id: "info" as const, zh: "快速資訊", en: "Info" },
  { id: "itinerary" as const, zh: "行程規畫", en: "Itinerary" },
  { id: "weather" as const, zh: "氣象預報", en: "Weather" },
  { id: "hydrology" as const, zh: "鄰近水文", en: "Hydrology" },
];

watch(
  () => props.item,
  () => {
    activeTab.value = "info";
    activeWptIndex.value = null;
  },
);

const d = computed(() => props.item.data);

const waterReading = ref<number | null | undefined>(undefined);
const rainfall24hr = ref<number | null | undefined>(undefined);
const waterFetchFailed = ref(false);
const rainfallFetchFailed = ref(false);
let hydrologyRequestId = 0;

async function loadNearbyHydrology() {
  const requestId = ++hydrologyRequestId;
  waterReading.value = props.nearbyWater ? undefined : null;
  rainfall24hr.value = props.nearbyRainfall ? undefined : null;
  waterFetchFailed.value = false;
  rainfallFetchFailed.value = false;
  const [water, rain] = await Promise.allSettled([
    props.nearbyWater
      ? fetchWaterLevel(props.nearbyWater.station.id)
      : Promise.resolve(null),
    props.nearbyRainfall
      ? fetchRainfallData(props.nearbyRainfall.station.station_id)
      : Promise.resolve(null),
  ]);
  if (requestId !== hydrologyRequestId) return;
  waterFetchFailed.value = water.status === "rejected";
  rainfallFetchFailed.value = rain.status === "rejected";
  const waterPoints = water.status === "fulfilled" ? water.value?.points : null;
  waterReading.value = waterPoints?.length
    ? (waterPoints[waterPoints.length - 1].value ?? null)
    : null;
  rainfall24hr.value =
    rain.status === "fulfilled" ? (rain.value?.past24hr ?? null) : null;
}

watch(
  () => [
    props.item.data.id,
    props.nearbyWater?.station.id,
    props.nearbyRainfall?.station.station_id,
  ],
  loadNearbyHydrology,
  { immediate: true },
);

const waterSummary = computed(() => {
  const value = waterReading.value;
  const en = locale.value === "en";
  if (value === undefined)
    return {
      tone: "muted",
      text: en ? "Loading current level…" : "正在取得即時水位…",
      failed: false,
    };
  if (!props.nearbyWater) return { tone: "muted", text: "", failed: false };
  if (waterFetchFailed.value)
    return {
      tone: "muted",
      text: en
        ? "Can't reach WRA water-level data right now"
        : "無法連線水利署即時水位資料",
      failed: true,
    };
  if (value == null)
    return {
      tone: "muted",
      text: en
        ? "No recent reading from this station"
        : "此測站近期沒有讀數",
      failed: false,
    };
  const s = props.nearbyWater.station;
  const label =
    s.alert1 != null && value >= s.alert1
      ? en
        ? "Alert Lv.1"
        : "一級警戒"
      : s.alert2 != null && value >= s.alert2
        ? en
          ? "Alert Lv.2"
          : "二級警戒"
        : s.alert3 != null && value >= s.alert3
          ? en
            ? "Alert Lv.3"
            : "三級警戒"
          : [s.alert1, s.alert2, s.alert3].some((level) => level != null)
            ? en
              ? "Below alert level"
              : "低於警戒水位"
            : en
              ? "No alert level set"
              : "未設定警戒水位";
  return {
    tone: waterTone(s, value),
    text: `${label} · ${value} m`,
    failed: false,
  };
});

const TONE_RANK: Record<string, number> = {
  danger: 4,
  warning: 3,
  watch: 2,
  normal: 1,
  "no-threshold": 0,
  muted: 0,
};
const statusStripTone = computed(() => {
  const tones: string[] = [];
  if (props.nearbyWater) tones.push(waterSummary.value.tone);
  if (props.nearbyRainfall) tones.push(rainfallSummary.value.tone);
  return tones.reduce(
    (worst, t) => (TONE_RANK[t] > TONE_RANK[worst] ? t : worst),
    "muted",
  );
});

const rainfallSummary = computed(() => {
  const value = rainfall24hr.value;
  const en = locale.value === "en";
  if (value === undefined)
    return {
      tone: "muted",
      text: en ? "Loading 24-hour rainfall…" : "正在取得 24 小時雨量…",
      failed: false,
    };
  if (rainfallFetchFailed.value)
    return {
      tone: "muted",
      text: en
        ? "Can't reach CWA rainfall data right now"
        : "無法連線氣象署雨量資料",
      failed: true,
    };
  if (value == null)
    return {
      tone: "muted",
      text: en
        ? "No recent reading from this station"
        : "此測站近期沒有讀數",
      failed: false,
    };
  const tone =
    value >= 200
      ? "danger"
      : value >= 80
        ? "warning"
        : value > 0
          ? "watch"
          : "normal";
  const label =
    value >= 200
      ? en
        ? "Extremely heavy rain"
        : "累積雨量偏高"
      : value >= 80
        ? en
          ? "Heavy rain"
          : "請留意累積雨量"
        : value > 0
          ? en
            ? "Recent rainfall"
            : "近期有降雨"
          : en
            ? "Lower recent rainfall"
            : "近期降雨較少";
  return { tone, text: `${label} · 24hr ${value} mm`, failed: false };
});

const title = computed(() => d.value.name);
const catchmentObserverUrl = computed(() => {
  const gps = String(d.value.catchment_gps || d.value.gps || "").trim();
  const [lat, lon] = gps.split(/[\s,]+/).map(Number);
  return Number.isFinite(lat) && Number.isFinite(lon)
    ? `https://wiwari.github.io/accTW/?center=${lat},${lon}&zoom=14`
    : "";
});
const eyebrow = computed(() => {
  const r = d.value;
  const en = locale.value === "en";
  return (en ? r.region_en : r.region) || r.region || "";
});
const subtitle = computed(() => {
  const r = d.value;
  return locale.value === "en"
    ? r.subtitle || ""
    : r.subtitle_zh || r.subtitle || "";
});
const kindLabel = computed(() =>
  props.item.kind === "canyon"
    ? d.value.type
    : locale.value === "en"
      ? "Canyon"
      : "溪降",
);

const URL_RE = /https?:\/\/[^\s]+/gi;
const YT_RE = /youtu(?:be\.com|\.be)\//;

function isSafeHttpUrl(url: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

function parseNote(val: string) {
  const segments: { text: string; isUrl: boolean; isYoutube?: boolean }[] = [];
  let last = 0;
  for (const m of val.matchAll(URL_RE)) {
    const url = m[0].replace(/[.,;:!?）)】\]'"]+$/, "");
    if (m.index! > last)
      segments.push({ text: val.slice(last, m.index), isUrl: false });
    segments.push({
      text: url,
      isUrl: isSafeHttpUrl(url),
      isYoutube: YT_RE.test(url),
    });
    last = m.index! + url.length;
  }
  if (last < val.length) segments.push({ text: val.slice(last), isUrl: false });
  return segments;
}

function mapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

import cwaTowns from "../data/cwa-towns.json";

const WEATHER_COUNTY_IDS: Record<string, string> = {
  臺北市: "63",
  台北市: "63",
  台北: "63",
  Taipei: "63",
  新北市: "65",
  新北: "65",
  "New Taipei": "65",
  桃園市: "68",
  桃園: "68",
  Taoyuan: "68",
  臺中市: "66",
  台中市: "66",
  台中: "66",
  Taichung: "66",
  臺南市: "67",
  台南市: "67",
  台南: "67",
  Tainan: "67",
  高雄市: "64",
  高雄: "64",
  Kaohsiung: "64",
  基隆市: "10017",
  基隆: "10017",
  Keelung: "10017",
  新竹市: "10018",
  "Hsinchu City": "10018",
  新竹縣: "10004",
  "Hsinchu County": "10004",
  新竹: "10004",
  Hsinchu: "10004",
  苗栗縣: "10005",
  苗栗: "10005",
  Miaoli: "10005",
  彰化縣: "10007",
  彰化: "10007",
  Changhua: "10007",
  南投縣: "10008",
  南投: "10008",
  Nantou: "10008",
  雲林縣: "10009",
  雲林: "10009",
  Yunlin: "10009",
  嘉義縣: "10010",
  "Chiayi County": "10010",
  嘉義: "10010",
  Chiayi: "10010",
  嘉義市: "10020",
  "Chiayi City": "10020",
  屏東縣: "10013",
  屏東: "10013",
  Pingtung: "10013",
  宜蘭縣: "10002",
  宜蘭: "10002",
  Yilan: "10002",
  花蓮縣: "10015",
  花蓮: "10015",
  Hualien: "10015",
  臺東縣: "10014",
  台東縣: "10014",
  台東: "10014",
  Taitung: "10014",
  澎湖縣: "10016",
  澎湖: "10016",
  Penghu: "10016",
  金門縣: "09020",
  Kinmen: "09020",
  連江縣: "09007",
  Lienchiang: "09007",
};

const weatherForecastUrl = computed(() => {
  const region = String(d.value.region_zh || d.value.region || "");
  const normalize = (value: string) =>
    value.toLowerCase().replace(/臺/g, "台").replace(/['’]/g, "");
  const county = Object.entries(WEATHER_COUNTY_IDS)
    .sort(([a], [b]) => b.length - a.length)
    .find(([name]) => normalize(region).startsWith(normalize(name)));
  const countyId = county?.[1];
  const district = normalize(
    county ? region.slice(county[0].length) : region,
  ).replace(/^[市縣\s·・,，-]+/, "");
  const towns = countyId
    ? ((cwaTowns as Record<string, { id: string; zh: string; en: string }[]>)[
        countyId
      ] ?? [])
    : Object.values(cwaTowns).flat();
  const matches = towns.filter((t) => {
    const zh = normalize(t.zh);
    const en = normalize(t.en).replace(/ (district|township|city)$/, "");
    return (
      district.startsWith(zh) ||
      district === zh.replace(/[區鄉鎮市]$/, "") ||
      district === en ||
      district.startsWith(`${en} `) ||
      district.startsWith(`${en}(`)
    );
  });
  const town = matches.length === 1 ? matches[0] : null;
  if (town)
    return `https://www.cwa.gov.tw/V8/${locale.value === "en" ? "E" : "C"}/W/Town/Town.html?TID=${town.id}`;
  return countyId
    ? `https://www.cwa.gov.tw/V8/C/W/County/County.html?CID=${countyId}`
    : null;
});

function parseGradePart(grading: string, pattern: RegExp) {
  return grading?.split(/\s+/).find((p: string) => pattern.test(p)) ?? "—";
}
const ropeGrade = computed(() => parseGradePart(d.value.grading, /^V\d/));
const ropeGradeClass = computed(() => vGradeClass(ropeGrade.value));
const waterGrade = computed(() => parseGradePart(d.value.grading, /^A\d/));
const timeGrade = computed(() =>
  parseGradePart(d.value.grading, /^(I{1,3}|IV|VI?)$/),
);

const gradingStars = computed(() =>
  (d.value.grading ?? "").replace(/\b(V\d+|A\d+|I{1,3}|IV|VI?)\b/g, "").trim(),
);

const ROPE_TIPS: Record<string, string> = {
  V1: "垂降 V1｜落差小、確保點明確，適合入門",
  V2: "垂降 V2｜中等落差，需熟練下降技術",
  V3: "垂降 V3｜落差大或地形複雜，需豐富垂降經驗",
  V4: "垂降 V4｜需雙繩下降或技術性確保",
  V5: "垂降 V5｜極高難度，專業垂降技術",
};
const ROPE_TIPS_EN: Record<string, string> = {
  V1: "Rope V1 | Small drops, clear anchors — beginner friendly",
  V2: "Rope V2 | Moderate drops, solid rappel skills needed",
  V3: "Rope V3 | Large drops or complex terrain, extensive experience required",
  V4: "Rope V4 | Double-rope or technical belay required",
  V5: "Rope V5 | Extreme difficulty, expert-level rappelling",
};
const WATER_TIPS: Record<string, string> = {
  A0: "水域 A0｜無需游泳，全程可涉水通過",
  A1: "水域 A1｜靜水或緩流，簡單泳渡",
  A2: "水域 A2｜流動水域，需具備游泳能力",
  A3: "水域 A3｜激流或深潭，需繩索輔助或強游泳技術",
  A4: "水域 A4｜危險激流，需高水平技術與保護",
};
const WATER_TIPS_EN: Record<string, string> = {
  A0: "Water A0 | No swimming needed, wadeable throughout",
  A1: "Water A1 | Calm or gentle current, easy swim crossings",
  A2: "Water A2 | Moving water, swimming ability required",
  A3: "Water A3 | Whitewater or deep pools, rope assist or strong swimmer",
  A4: "Water A4 | Dangerous current, high-level skills required",
};
const TIME_TIPS: Record<string, string> = {
  I: "整體 I｜非常容易，適合溪降新手",
  II: "整體 II｜容易，需基本溪降技術",
  III: "整體 III｜中等，需具備溪降技術與經驗",
  IV: "整體 IV｜困難，需豐富溪降經驗",
  V: "整體 V｜非常困難，專業級路線",
  VI: "整體 VI｜極限路線，頂尖技術",
};
const TIME_TIPS_EN: Record<string, string> = {
  I: "Overall I | Very easy, suitable for beginners",
  II: "Overall II | Easy, basic canyoning skills needed",
  III: "Overall III | Moderate, canyoning experience required",
  IV: "Overall IV | Difficult, extensive canyoning experience needed",
  V: "Overall V | Very difficult, professional-level route",
  VI: "Overall VI | Extreme, top-tier technical skills",
};

const STAR_TIPS: Record<number, string> = {
  1: "★ 一般｜具基本可玩性",
  2: "★★ 不錯｜值得一遊",
  3: "★★★ 優秀｜強烈推薦",
  4: "★★★★ 精彩｜必訪路線",
  5: "★★★★★ 經典｜台灣溪降聖地",
};
const STAR_TIPS_EN: Record<number, string> = {
  1: "★ Average | Decent fun",
  2: "★★ Good | Worth the trip",
  3: "★★★ Excellent | Highly recommended",
  4: "★★★★ Outstanding | Must-do route",
  5: "★★★★★ Classic | Taiwan canyoning icon",
};
const starTip = computed(() => {
  const count = (gradingStars.value.match(/★/g) ?? []).length;
  return (locale.value === "en" ? STAR_TIPS_EN : STAR_TIPS)[count] ?? null;
});

/** Parsed GPX waypoints array. */
const waypoints = computed<
  { lat: number; lon: number; ele?: number; name?: string }[]
>(() => {
  if (!d.value.gpx_waypoints) return [];
  try {
    const parsed =
      typeof d.value.gpx_waypoints === "string"
        ? JSON.parse(d.value.gpx_waypoints)
        : d.value.gpx_waypoints;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
});

/** Max elevation from GPX waypoints (fallback when track has no ele data). */
const maxEleFromWaypoints = computed(() => {
  const eles = waypoints.value
    .map((p) => p.ele)
    .filter((e): e is number => typeof e === "number");
  return eles.length ? Math.round(Math.max(...eles)) : null;
});

/** Best available max elevation: track > waypoints > stored elevation field. */
const maxEle = computed(
  () =>
    elevationData.value?.maxEle ??
    maxEleFromWaypoints.value ??
    (typeof d.value.elevation === "number" && d.value.elevation > 0
      ? d.value.elevation
      : null),
);

const noteSegs = computed(() => (d.value.note ? parseNote(d.value.note) : []));
const noteGpxLinks = computed(() =>
  noteSegs.value.filter((s) => s.isUrl && !s.isYoutube).map((s) => s.text),
);
const noteHasVideo = computed(() =>
  noteSegs.value.some((s) => s.isUrl && s.isYoutube),
);
const noteHasText = computed(() =>
  noteSegs.value.some((s) => !s.isUrl && s.text.trim()),
);

const elevationData = computed(() => {
  if (props.item.kind !== "route" || !d.value.gpx_track) return null;
  try {
    const parsed = JSON.parse(d.value.gpx_track);
    // Support flat [lat,lon,ele][] and segmented [lat,lon,ele][][]
    const isSegmented = parsed.length > 0 && Array.isArray(parsed[0][0]);
    const allPts: number[][] = isSegmented
      ? (parsed as number[][][]).flat()
      : parsed;
    const eles = allPts
      .map((p: number[]) => p[2])
      .filter((e: number) => e != null && !isNaN(e));
    if (eles.length < 2) return null;
    const minEle = Math.min(...eles);
    const maxEle = Math.max(...eles);
    let gain = 0,
      loss = 0;
    for (let i = 1; i < eles.length; i++) {
      const diff = eles[i] - eles[i - 1];
      if (diff > 3) gain += diff;
      else if (diff < -3) loss += Math.abs(diff);
    }
    return {
      eles,
      minEle,
      maxEle,
      gain: Math.round(gain),
      loss: Math.round(loss),
    };
  } catch {
    return null;
  }
});

const elePolyline = computed(() => {
  if (!elevationData.value) return "";
  const { eles, minEle, maxEle } = elevationData.value;
  const W = 280,
    H = 54,
    padT = 3;
  const rangeEle = maxEle - minEle || 1;
  return eles
    .map((e, i) => {
      const x = (i / (eles.length - 1)) * W;
      const y = padT + (1 - (e - minEle) / rangeEle) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
});

const elePolygon = computed(() => {
  if (!elevationData.value) return "";
  const { eles, minEle, maxEle } = elevationData.value;
  const W = 280,
    H = 54,
    padT = 3;
  const rangeEle = maxEle - minEle || 1;
  const pts = eles.map((e, i) => {
    const x = (i / (eles.length - 1)) * W;
    const y = padT + (1 - (e - minEle) / rangeEle) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `${pts.join(" ")} ${W},${padT + H} 0,${padT + H}`;
});

function downloadGpx() {
  const route = d.value;
  if (!route.gpx_track) return;
  gpxError.value = false;

  const name = route.name ?? "route";
  let parsed: number[][] | number[][][];
  let wpts: any[] = [];
  try {
    parsed = JSON.parse(route.gpx_track);
    wpts = route.gpx_waypoints ? JSON.parse(route.gpx_waypoints) : [];
  } catch {
    gpxError.value = true;
    return;
  }
  const isSegmented = parsed.length > 0 && Array.isArray(parsed[0][0]);
  const segments: number[][][] = isSegmented
    ? (parsed as number[][][])
    : [parsed as number[][]];

  const trksegs = segments
    .map((seg) => {
      const pts = seg
        .map((p: number[]) => {
          const ele =
            p[2] != null ? `\n        <ele>${p[2].toFixed(1)}</ele>` : "";
          return `      <trkpt lat="${p[0]}" lon="${p[1]}">${ele}\n      </trkpt>`;
        })
        .join("\n");
      return `    <trkseg>\n${pts}\n    </trkseg>`;
    })
    .join("\n");

  const escXml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const wptXml = wpts
    .map((w: any) => {
      const ele =
        w.ele != null ? `\n    <ele>${(+w.ele).toFixed(1)}</ele>` : "";
      const wname = w.name ? `\n    <name>${escXml(w.name)}</name>` : "";
      return `  <wpt lat="${w.lat}" lon="${w.lon}">${ele}${wname}\n  </wpt>`;
    })
    .join("\n");

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Taiwan Canyoning Map" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${escXml(name)}</name></metadata>
${wptXml ? wptXml + "\n" : ""}  <trk>
    <name>${escXml(name)}</name>
${trksegs}
  </trk>
</gpx>`;

  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([gpx], { type: "application/gpx+xml" }),
  );
  a.download = `${name}.gpx`;
  a.click();
  URL.revokeObjectURL(a.href);
}
</script>

<style scoped>
.panel {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 1500;
  background: var(--color-panel);
  border-left: 1px solid var(--color-line);
  width: min(452px, 100vw);
  height: 100dvh;
  min-width: min(380px, 100vw);
  max-width: min(900px, 100vw);
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 40px rgba(0, 0, 0, 0.7);
  overflow: hidden;
}

.panel.resizing {
  user-select: none;
}

.resize-handle {
  position: absolute;
  inset: 0 auto 0 -4px;
  width: 8px;
  cursor: col-resize;
  z-index: 10;
}
.resize-handle:hover,
.panel.resizing .resize-handle {
  background: color-mix(in srgb, var(--color-primary) 25%, transparent);
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-line);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.route-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-strong);
}

.kind-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 600;
  flex-shrink: 0;
}
.kind-badge.canyon {
  background: var(--color-primary-selected);
  color: var(--color-primary);
}
.kind-badge.route {
  background: color-mix(in srgb, var(--color-rating) 25%, var(--color-panel));
  color: var(--color-rating);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
}
.close-btn:hover {
  background: var(--color-line);
  color: var(--color-text-strong);
}
.close-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.panel-body {
  padding: 8px 0;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0;
}

.row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--color-line);
}
.row:last-child {
  border-bottom: none;
}

.row-label {
  flex-shrink: 0;
  width: 72px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.row-value {
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.5;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.catchment-link {
  color: var(--color-primary);
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 3px;
}
.catchment-link:hover,
.catchment-link:focus-visible {
  color: var(--color-primary-hover);
  text-decoration-color: currentColor;
}

.stars {
  color: var(--color-rating);
  letter-spacing: 2px;
}
.level-text {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.coord {
  font-family: monospace;
  font-size: 0.875rem;
  color: var(--color-normal);
}

.gps-link {
  text-decoration: none;
}
.gps-link:hover {
  text-decoration: underline;
}

.gpx-row-value {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.gpx-dl-btn {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-primary);
  font-size: 0.78rem;
  padding: 3px 10px;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}
.gpx-dl-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-selected);
}

.gpx-error {
  font-size: 0.78rem;
  flex-basis: 100%;
}

.note-link {
  color: var(--color-primary);
  text-decoration: none;
  font-size: 0.875rem;
}
.note-link:hover {
  text-decoration: underline;
}

.hydrology-section {
  padding: 8px 20px;
  border-bottom: 1px solid var(--color-line);
}

.hydrology-title {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  margin-bottom: 4px;
}
.hydrology-columns {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  padding: 2px 0 4px 37px;
  color: var(--color-text-muted);
  font-size: 0.7rem;
}
.hydrology-columns span:last-child {
  text-align: right;
}
.hydrology-row {
  width: 100%;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 7px 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.hydrology-row + .hydrology-row {
  border-top: 1px solid var(--color-line);
}
.hydrology-row:hover strong {
  color: var(--color-primary-hover);
}
.hydrology-row:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.hydrology-row img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}
.hydrology-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.hydrology-copy strong {
  color: #ddd;
  font-size: 0.82rem;
  overflow-wrap: anywhere;
}
.hydrology-copy small {
  font-size: 0.7rem;
}
.hydrology-distance {
  color: var(--color-text-muted);
  font-size: 0.72rem;
  white-space: nowrap;
}
.hydrology-retry {
  margin: -3px 0 7px 37px;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-primary);
  font-size: 0.72rem;
  padding: 2px 10px;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}
.hydrology-retry:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-selected);
}
.tone-normal {
  color: var(--color-normal);
}
.tone-watch {
  color: var(--color-watch);
}
.tone-warning {
  color: var(--color-warning);
}
.tone-danger {
  color: var(--color-danger);
}
.tone-muted,
.tone-no-threshold {
  color: var(--color-text-muted);
}

.grade-stars {
  font-size: 0.75rem;
  color: var(--color-rating);
  letter-spacing: 1px;
}
.grade-tag {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
}
.grade-tag.rope {
  background: var(--color-primary-selected);
  color: var(--color-primary);
} /* fallback */
.grade-tag.rope:is(.v1, .v2, .v3, .v4, .v5, .v6) {
  background: var(--vg-bg);
  color: var(--vg-fg);
}
.grade-tag.water {
  background: color-mix(in srgb, var(--color-water) 20%, var(--color-panel));
  color: var(--color-water);
}
.grade-tag.time {
  background: color-mix(in srgb, var(--color-rating) 20%, var(--color-panel));
  color: var(--color-rating);
}

.grade-tag[data-tooltip],
.grade-stars[data-tooltip] {
  position: relative;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 2px;
}

.grade-tag[data-tooltip]::after,
.grade-stars[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  transform: none;
  white-space: nowrap;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.7rem;
  font-weight: 400;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid var(--color-line);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 9999;
}
.grade-tag[data-tooltip]:hover::after,
.grade-tag[data-tooltip]:focus::after,
.grade-tag[data-tooltip]:active::after,
.grade-stars[data-tooltip]:hover::after,
.grade-stars[data-tooltip]:focus::after,
.grade-stars[data-tooltip]:active::after {
  opacity: 1;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--color-line);
}

.info-tag {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 12px;
}

.info-tag.pool {
  background: color-mix(in srgb, var(--color-water) 20%, var(--color-panel));
  color: var(--color-water);
}
.info-tag.shuttle {
  background: color-mix(in srgb, var(--color-normal) 20%, var(--color-panel));
  color: var(--color-normal);
}
.info-tag.ele {
  background: var(--color-raised);
  color: var(--color-text-muted);
}

.elevation-section {
  padding: 12px 20px 16px;
  border-top: 1px solid var(--color-line);
}

.ele-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.ele-title {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.ele-stats {
  display: flex;
  gap: 12px;
  font-size: 0.875rem;
  font-weight: 600;
}

.ele-up {
  color: var(--color-danger);
}
.ele-down {
  color: var(--color-water);
}

.ele-chart-wrap {
  display: flex;
  align-items: stretch;
  gap: 6px;
}

.ele-y-labels {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 0.7rem;
  color: var(--color-text-muted);
  text-align: right;
  width: 34px;
  flex-shrink: 0;
  padding-bottom: 2px;
}

.ele-svg {
  flex: 1;
  height: 70px;
  display: block;
}

/* ── New header elements ── */
.header-content {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
}

.eyebrow {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.route-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1.25;
  text-wrap: balance;
}

.route-subtitle {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.grade-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 2px;
}

.status-strip {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  margin-top: 8px;
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: var(--color-surface);
  font-size: 0.78rem;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}
.status-strip:hover {
  background: var(--color-hover);
}
.status-strip:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.status-strip.tone-strip-danger {
  background: rgba(232, 121, 121, 0.12);
}
.status-strip.tone-strip-warning {
  background: rgba(231, 154, 94, 0.12);
}
.status-strip.tone-strip-watch {
  background: rgba(214, 189, 85, 0.1);
}
.status-sep {
  color: var(--color-text-muted);
}
.hazard-strip {
  margin-top: 6px;
}
.hazard-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Tab bar ── */
.tab-bar {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-line);
  overflow-x: auto;
  scrollbar-width: none;
}
.tab-bar::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  flex-shrink: 0;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  font-size: 12px;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
  white-space: nowrap;
}
.tab-btn:hover {
  color: var(--color-text);
  background: var(--color-hover);
}
.tab-btn.active {
  background: var(--color-primary-selected);
  border-color: var(--color-primary);
  color: var(--color-primary-hover);
  font-weight: 600;
}

/* ── Tab content blocks ── */
.section-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  padding: 10px 20px 4px;
  text-transform: uppercase;
}

.info-block {
  padding: 8px 20px;
  border-bottom: 1px solid var(--color-surface);
}

.info-key {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: 3px;
}

.info-val {
  font-size: 0.85rem;
  color: var(--color-text);
  line-height: 1.55;
}

.info-sub {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  margin-top: 2px;
  line-height: 1.4;
}

.info-link {
  font-size: 0.85rem;
  color: var(--color-primary);
  text-decoration: none;
}
.info-link:hover {
  text-decoration: underline;
}

.grade-desc-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.warning-text {
  color: var(--color-warning);
}

.approach-text {
  white-space: pre-line;
}

/* ── Waypoints list ── */
.wpt-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 14px 14px;
}
.wpt-item {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--color-line);
  transition: border-color 0.13s;
}
.wpt-item:has(.wpt-row.active) {
  border-color: var(--color-border);
}
.wpt-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  background: var(--color-panel);
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.13s;
}
.wpt-row:hover {
  background: var(--color-hover);
}
.wpt-row.active {
  background: var(--color-primary-selected);
}
.wpt-num {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 700;
  font-family: monospace;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.13s,
    color 0.13s;
}
.wpt-num.active {
  background: var(--color-primary);
  color: var(--color-text-strong);
}
.wpt-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wpt-ele {
  font-size: 11px;
  font-family: monospace;
  color: var(--color-text-muted);
  flex-shrink: 0;
}
.wpt-chevron {
  flex-shrink: 0;
  color: var(--color-text-muted);
  transition: transform 0.2s;
}
.wpt-chevron.open {
  transform: rotate(180deg);
  color: var(--color-primary);
}

/* expanded card */
.wpt-card {
  padding: 10px 14px 12px 46px;
  background: var(--color-canvas);
  border-top: 1px solid var(--color-line);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.wpt-card-coord {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-family: monospace;
  color: var(--color-normal);
  text-decoration: none;
  width: fit-content;
}
.wpt-card-coord:hover {
  text-decoration: underline;
}

.empty-tab {
  padding: 24px 20px;
  font-size: 0.82rem;
  color: var(--color-text-muted);
  text-align: center;
}

@media (max-width: 640px), (max-width: 900px) and (orientation: portrait) {
  .panel {
    top: auto !important;
    bottom: 0;
    left: 0 !important;
    right: 0;
    width: 100% !important;
    max-width: 100%;
    border-radius: 16px 16px 0 0;
    height: 76dvh;
    min-width: 0;
    max-height: 100dvh;
    border-left: none;
    border-top: 1px solid var(--color-line);
    transform: none;
  }

  .resize-handle {
    display: none;
  }

  .panel-header {
    background: var(--color-panel);
    z-index: 1;
  }
}
</style>
