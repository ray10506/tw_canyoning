<template>
  <div class="nz-dossier" :class="{ resizing: isResizing }" :style="{ width: panelWidth + 'px' }" @click.stop>
    <!-- ── Left resize handle ── -->
    <div class="nz-resize-handle" @mousedown.prevent="startResize" />

    <!-- ── Header ── -->
    <div class="dos-header">
      <div class="dos-meta">
        <span class="dos-eyebrow">{{ eyebrow }}</span>
        <h2 class="dos-title">{{ d.name_en || d.name }}</h2>
        <p v-if="subtitle" class="dos-subtitle">{{ subtitle }}</p>
        <div v-if="d.grading || hasRiskSignal" class="dos-grades">
          <span v-if="ropeGrade !== '—'" :class="['g-tag', 'rope', ropeGradeClass]">{{ ropeGrade }}</span>
          <span v-if="waterGrade !== '—'" class="g-tag water">{{ waterGrade }}</span>
          <span v-if="timeGrade !== '—'" class="g-tag roman">{{ timeGrade }}</span>
          <span v-if="gradingStars" class="g-stars">{{ gradingStars }}</span>
          <button v-if="hasRiskSignal" type="button" class="g-tag risk-chip" @click="activeTab = 'risk'">
            ⚠ {{ riskChipLabel }}
          </button>
        </div>
      </div>
      <button class="dos-close" :aria-label="locale === 'en' ? 'Close' : '關閉'" @click="$emit('close')">✕</button>
    </div>

    <!-- ── Tabs ── -->
    <div ref="tabsRef" class="dos-tabs" role="tablist">
      <button v-for="tab in TABS" :key="tab.id"
        role="tab" :aria-selected="activeTab === tab.id"
        :class="['dos-tab', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >{{ locale === 'en' ? tab.en : tab.zh }}</button>
    </div>

    <!-- ── Body ── -->
    <div class="dos-body">

      <!-- 快速資訊 -->
      <template v-if="activeTab === 'info'">
        <div class="section-sub">{{ locale === 'en' ? 'LOCATION' : '地點' }}</div>
        <dl class="rows">
          <div v-if="d.location || d.location_zh || d.region" class="row">
            <dt><span class="ic">📍</span>{{ locale === 'en' ? 'Location' : '地點' }}</dt>
            <dd>{{ locale === 'en' ? (d.location || d.region) : (d.location_zh || d.location || d.region) }}</dd>
          </div>
          <div class="row">
            <dt><span class="ic">⬆</span>{{ locale === 'en' ? 'Elevation' : '海拔高度' }}</dt>
            <dd>{{ routeElevation != null ? `${routeElevation}m` : '—' }}</dd>
          </div>
          <div v-if="d.character || d.character_zh" class="row">
            <dt><span class="ic">🌊</span>{{ locale === 'en' ? 'Character' : '性質' }}</dt>
            <dd>{{ locale === 'en' ? d.character : (d.character_zh || d.character) }}</dd>
          </div>
        </dl>

        <template v-if="details.rock || details.water || details.catchment">
          <div class="section-sub">{{ locale === 'en' ? 'TERRAIN & WATER' : '地形與水況' }}</div>
          <dl class="rows">
            <div v-if="details.rock" :class="['row', { unpublished: isUnpublished(localDetail('rock')) }]">
              <dt><span class="ic">△</span>{{ locale === 'en' ? 'Rock' : '岩性' }}</dt>
              <dd>{{ localDetail('rock') }}</dd>
            </div>
            <div v-if="details.water" :class="['row', { unpublished: isUnpublished(localDetail('water')) }]">
              <dt><span class="ic">≈</span>{{ locale === 'en' ? 'Water' : '水況' }}</dt>
              <dd>{{ localDetail('water') }}</dd>
            </div>
            <div v-if="details.catchment" :class="['row', { unpublished: isUnpublished(localDetail('catchment')) }]">
              <dt><span class="ic">⌁</span>{{ locale === 'en' ? 'Catchment' : '集水區' }}</dt>
              <dd>{{ localDetail('catchment') }}</dd>
            </div>
          </dl>
        </template>

        <template v-if="d.approach || d.gps || d.gpx_url || details.map_sheet">
          <div class="section-sub">{{ locale === 'en' ? 'ACCESS & NAVIGATION' : '進場與定位' }}</div>
          <dl class="rows">
            <div v-if="d.approach" class="row">
              <dt><span class="ic">🥾</span>{{ locale === 'en' ? 'Approach' : '主要進場' }}</dt>
              <dd class="prewrap">{{ d.approach }}</dd>
            </div>
            <div v-if="d.gps" class="row">
              <dt><span class="ic">🗺</span>GPS</dt>
              <dd class="mono"><a :href="mapsUrl(d.gps)" target="_blank" rel="noopener" class="coord-link">{{ d.gps }} ↗</a></dd>
            </div>
            <div v-if="d.gpx_url" class="row">
              <dt><span class="ic">📥</span>GPX</dt>
              <dd><a :href="d.gpx_url" download class="ir-link">{{ locale === 'en' ? 'Download GPX' : '下載 GPX' }} ↓</a></dd>
            </div>
            <div v-if="details.map_sheet" class="row">
              <dt><span class="ic">▧</span>{{ locale === 'en' ? 'Map' : '圖幅' }}</dt>
              <dd>{{ details.map_sheet }}</dd>
            </div>
          </dl>
        </template>

        <template v-if="details.anchors || d.gear || d.gear_zh || d.first_descent || d.source_url">
          <div class="section-sub">{{ locale === 'en' ? 'GEAR & CREDITS' : '裝備與來源' }}</div>
          <dl class="rows">
            <div v-if="details.anchors" :class="['row', { unpublished: isUnpublished(localDetail('anchors')) }]">
              <dt><span class="ic">⌾</span>{{ locale === 'en' ? 'Anchors' : '確保點' }}</dt>
              <dd>{{ localDetail('anchors') }}</dd>
            </div>
            <div v-if="d.gear || d.gear_zh" class="row">
              <dt><span class="ic">🪢</span>{{ locale === 'en' ? 'Gear' : '裝備' }}</dt>
              <dd>{{ locale === 'en' ? d.gear : (d.gear_zh || d.gear) }}</dd>
            </div>
            <div v-if="d.first_descent" class="row">
              <dt><span class="ic">🏆</span>{{ locale === 'en' ? 'First Descent' : '首降' }}</dt>
              <dd class="dim">{{ d.first_descent }}</dd>
            </div>
            <div v-if="d.topo_url" class="row">
              <dt><span class="ic">🗺</span>{{ locale === 'en' ? 'Topo' : 'Topo 下載' }}</dt>
              <dd><a :href="d.topo_url" target="_blank" rel="noopener" class="ir-link">{{ locale === 'en' ? 'Download PDF ↗' : '下載 PDF ↗' }}</a></dd>
            </div>
            <div v-if="d.source_url" class="row">
              <dt><span class="ic">🔗</span>{{ locale === 'en' ? 'Source' : '來源' }}</dt>
              <dd><a :href="d.source_url" target="_blank" rel="noopener" class="ir-link">KiwiCanyons ↗</a></dd>
            </div>
          </dl>
        </template>
      </template>

      <!-- 五日氣象預報 -->
      <template v-else-if="activeTab === 'weather'">
        <FiveDayForecast
          :gps="d.gps"
          :detail-url="weatherForecast?.url"
          :detail-label="weatherForecast && (locale === 'en' ? weatherForecast.en : weatherForecast.zh)"
        />
      </template>

      <!-- 近期探訪回報 -->
      <template v-else-if="activeTab === 'updates'">
        <div class="updates-list">
          <p class="updates-note">
            {{ locale === 'en' ? 'Visitor-report summaries. Check the date and original report before relying on them.' : '以下為探訪者回報摘要；使用前請確認日期與原始內容。' }}
          </p>
          <article v-for="item in recentUpdates" :key="`${item.date}-${item.author}`" class="update-row">
            <div class="update-meta">
              <time>{{ item.date }}</time>
              <span>{{ item.author }}</span>
            </div>
            <p>{{ locale === 'en' ? item.en : (item.zh || item.en) }}</p>
          </article>
          <a v-if="d.source_url" :href="`${d.source_url}#comments`" target="_blank" rel="noopener" class="updates-source">
            {{ locale === 'en' ? 'Read original trip reports' : '查看原始探訪回報' }} ↗
          </a>
        </div>
      </template>

      <!-- 行程規劃 -->
      <template v-else-if="activeTab === 'approach'">
        <div v-if="!hasTimedOptions && (d.approach_time || d.descent_time || d.total_time)">
          <div class="time-plan-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {{ locale === 'en' ? 'TIME / EXPEDITION PLAN' : '時間規劃 TIME / EXPEDITION PLAN' }}
          </div>
          <div class="time-plan">
            <div v-if="d.approach_time" class="time-row">
              <span class="time-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="19" r="2"/><circle cx="19" cy="5" r="2"/><path d="M5 17C5 13 9 11 12 11s7-2 7-6"/></svg>
              </span>
              <span class="time-label">{{ locale === 'en' ? 'Approach' : '進場' }}</span>
              <span class="time-val">{{ d.approach_time }}</span>
            </div>
            <div v-if="d.descent_time" class="time-row">
              <span class="time-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6c0 6 18 6 18 12"/><path d="M3 6v12"/><path d="M21 18v-5"/></svg>
              </span>
              <span class="time-label">{{ locale === 'en' ? 'Canyon descent' : '峽谷下降' }}</span>
              <span class="time-val">{{ d.descent_time }}</span>
            </div>
            <div v-if="d.return_time" class="time-row">
              <span class="time-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 19 9 24"/><path d="M20 4v7a4 4 0 01-4 4H4"/></svg>
              </span>
              <span class="time-label">{{ locale === 'en' ? 'Return' : '回程' }}</span>
              <span class="time-val">{{ d.return_time }}</span>
            </div>
            <div v-if="d.total_time" class="time-row total">
              <span class="time-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </span>
              <span class="time-label time-label--total">Total</span>
              <span class="time-val time-val--total">{{ d.total_time }}</span>
            </div>
            <div v-if="d.ab_shuttle && d.ab_shuttle !== '不需要'" class="time-row">
              <span class="time-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              </span>
              <span class="time-label">{{ locale === 'en' ? 'Shuttle' : '接駁' }}</span>
              <span class="time-val time-val--sm">{{ d.ab_shuttle }}</span>
            </div>
          </div>
        </div>
        <!-- Route options (multi-section routes like The General) -->
        <div v-if="sections.length">
          <div class="time-plan-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            {{ locale === 'en' ? 'ROUTE OPTIONS' : '分段選擇 ROUTE OPTIONS' }}
          </div>
          <div class="time-plan">
            <div v-for="part in sections" :key="part.name" class="struct-row" :class="{ 'struct-row--timed': hasTimedOptions }">
              <span class="struct-badge struct-badge--section">{{ locale === 'en' ? part.name : (part.zh || part.name) }}</span>
              <div class="struct-text">
                <strong v-if="part.time" class="struct-time">{{ locale === 'en' ? 'Total' : '總計' }} {{ part.time }}</strong>
                <dl v-if="hasTimedOptions" class="section-times">
                  <div v-if="part.approach_time"><dt>{{ locale === 'en' ? 'Approach' : '進場' }}</dt><dd>{{ part.approach_time }}</dd></div>
                  <div v-if="part.descent_time"><dt>{{ locale === 'en' ? 'Canyon' : '峽谷' }}</dt><dd>{{ part.descent_time }}</dd></div>
                  <div v-if="part.return_time"><dt>{{ locale === 'en' ? 'Return' : '回程' }}</dt><dd>{{ part.return_time }}</dd></div>
                </dl>
                <p v-if="locale === 'en' && part.detail">{{ part.detail }}</p>
                <p v-if="locale !== 'en' && (part.zh_detail || part.detail)">{{ part.zh_detail || part.detail }}</p>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!d.approach_time && !d.descent_time && !d.total_time && !sections.length" class="dos-empty">
          {{ locale === 'en' ? 'No timing data' : '尚無時間資料' }}
        </div>

        <!-- Approach steps -->
        <div v-if="approachSteps.length || d.approach">
          <div class="time-plan-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="19" r="2"/><circle cx="19" cy="5" r="2"/><path d="M5 17C5 13 9 11 12 11s7-2 7-6"/></svg>
            {{ locale === 'en' ? 'APPROACH' : '進場路線 APPROACH' }}
          </div>
          <div class="time-plan">
            <div v-for="(item, index) in approachSteps" :key="index" class="struct-row">
              <span class="struct-badge struct-badge--access">{{ index + 1 }}</span>
              <p class="struct-text">{{ locale === 'en' ? item.en : (item.zh || item.en) }}</p>
            </div>
            <div v-if="d.approach && !approachSteps.length" class="struct-row">
              <span class="struct-badge struct-badge--access">→</span>
              <p class="struct-text">{{ d.approach }}</p>
            </div>
          </div>
        </div>

        <dl class="rows">
          <div v-if="d.gps" class="row">
            <dt><span class="ic">🗺</span>GPS</dt>
            <dd class="mono"><a :href="mapsUrl(d.gps)" target="_blank" rel="noopener" class="coord-link">{{ d.gps }} ↗</a></dd>
          </div>
        </dl>
        <div v-if="waypoints.length" class="wpt-section">
          <div class="section-sub">{{ locale === 'en' ? 'Waypoints' : '路線點' }}</div>
          <div v-for="(w, index) in waypoints" :key="w.seq" class="wpt-row">
            <span class="wpt-seq">{{ w.seq }}</span>
            <span class="wpt-body">
              <span class="wpt-name">{{ w.name }}</span>
              <span v-if="w.detail" class="wpt-detail">{{ w.detail }}</span>
              <a :href="mapsUrl(w.lat, w.lon)" target="_blank" rel="noopener" class="wpt-coord"
                @mouseenter="$emit('focus-waypoint', index)" @mouseleave="$emit('focus-waypoint', null)"
                @focus="$emit('focus-waypoint', index)" @blur="$emit('focus-waypoint', null)">
                {{ w.lat.toFixed(5) }}, {{ w.lon.toFixed(5) }} ↗
              </a>
            </span>
          </div>
        </div>
        <div v-if="!approachSteps.length && !d.approach && !d.gps && !waypoints.length" class="dos-empty">
          {{ locale === 'en' ? 'No approach data' : '尚無進場資料' }}
        </div>
      </template>

      <!-- 原始路線圖 (Topo) -->
      <template v-else-if="activeTab === 'topo'">
        <div class="topo-wrap">
          <div class="section-sub">
            {{ locale === 'en' ? 'ORIGINAL TOPO' : '原始路線圖 ORIGINAL TOPO' }}
          </div>
          <p v-if="topoPages.length || d.topo_url" class="topo-note">{{ locale === 'en' ? 'Official KiwiCanyons maps and hand-drawn topo.' : 'KiwiCanyons 官方地圖與手繪路線圖。' }}</p>
          <div v-if="topoPages.length" class="topo-stack">
            <a v-for="item in topoPages" :key="item.page"
              :href="item.asset" target="_blank" rel="noopener"
              class="topo-figure"
            >
              <figcaption>{{ locale === 'en' ? item.en : (item.zh || item.en) }}</figcaption>
              <img :src="item.asset" :alt="`${d.name_en || d.name} ${item.en || 'topo'}`" class="topo-image" loading="lazy" />
            </a>
          </div>
          <a v-if="d.topo_url" :href="d.topo_url" target="_blank" rel="noopener" class="topo-dl-btn">
            ⬇ {{ locale === 'en' ? 'Download Topo PDF' : '下載路線圖 PDF' }}
          </a>
          <div v-if="!topoPages.length && !d.topo_url" class="dos-empty">{{ locale === 'en' ? 'KiwiCanyons has not published an official topo yet.' : 'KiwiCanyons 尚未提供官方路線圖。' }}</div>
        </div>
      </template>

      <!-- 代表照片 -->
      <template v-else-if="activeTab === 'photos'">
        <div v-if="photos.length" class="photo-grid">
          <a v-for="(url, i) in photos" :key="i"
            :href="url" target="_blank" rel="noopener"
            class="photo-thumb"
          >
            <img :src="url" :alt="`${d.name} photo ${i + 1}`" loading="lazy" />
          </a>
        </div>
        <p v-if="photos.length" class="photo-credit">
          {{ locale === 'en' ? 'Photos © KiwiCanyons contributors' : '照片 © KiwiCanyons 貢獻者' }}
        </p>
        <template v-if="videos.length">
          <div class="section-sub">{{ locale === 'en' ? 'VIDEOS' : '影片' }}</div>
          <div class="video-list">
            <a v-for="item in videos" :key="item.url" :href="item.url" target="_blank" rel="noopener" class="video-row">
              <span class="video-icon" aria-hidden="true">
                <svg v-if="item.provider === 'YouTube'" viewBox="0 0 24 24" width="22" height="22" fill="#FF0000"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
                <svg v-else viewBox="0 0 24 24" width="22" height="22" fill="currentColor" class="video-play-generic"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 8l6 4-6 4V8z"/></svg>
              </span>
              <span>
                <strong>{{ item.title }}</strong>
                <small>{{ item.provider }}</small>
              </span>
              <span class="video-open" aria-hidden="true">↗</span>
            </a>
          </div>
        </template>
        <div v-if="!photos.length && !videos.length" class="dos-empty">{{ locale === 'en' ? 'No photos or videos available' : '尚無照片或影片' }}</div>
      </template>

      <!-- 風險注意 -->
      <template v-else-if="activeTab === 'risk'">
        <div v-if="details.flood" class="flood-card">
          <small>{{ locale === 'en' ? 'FLASH-FLOOD RISK' : '暴洪風險' }}</small>
          <strong>{{ localDetail('flood') }}</strong>
        </div>
        <div v-if="d.hazards || d.hazards_zh" class="risk-block">
          <div class="risk-label">⚠ {{ locale === 'en' ? 'HAZARDS & RISK NOTES' : '危險注意 HAZARD NOTES' }}</div>
          <div class="risk-text">{{ locale === 'en' ? d.hazards : (d.hazards_zh || d.hazards) }}</div>
        </div>
        <!-- Gear reminder in risk context -->
        <dl v-if="d.gear || d.gear_zh" class="rows" style="margin-top:8px">
          <div class="row">
            <dt><span class="ic">🪢</span>{{ locale === 'en' ? 'Required Gear' : '必備裝備' }}</dt>
            <dd>{{ locale === 'en' ? d.gear : (d.gear_zh || d.gear) }}</dd>
          </div>
          <div v-if="d.max_drop" class="row">
            <dt><span class="ic">⬇</span>{{ locale === 'en' ? 'Max Drop' : '最高落差' }}</dt>
            <dd class="highlight">{{ d.max_drop }}</dd>
          </div>
        </dl>
        <div v-if="!d.hazards && !d.hazards_zh" class="dos-empty">
          {{ locale === 'en' ? 'No risk data' : '尚無風險資料' }}
        </div>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { locale } from '../lib/locale'
import { vGradeClass } from '../lib/grade'
import FiveDayForecast from './FiveDayForecast.vue'
import { useResizableWidth } from '../lib/useResizableWidth'

const props = defineProps<{ item: { kind: string; data: any } }>()
defineEmits<{ close: []; 'focus-waypoint': [index: number | null] }>()

const { width: panelWidth, isResizing, start: startResize } = useResizableWidth(
  452,
  e => window.innerWidth - e.clientX,
  380,
  () => Math.min(900, window.innerWidth),
)

const d = computed(() => props.item.data)
type TabId = 'info'|'weather'|'updates'|'approach'|'topo'|'photos'|'risk'
const activeTab = ref<TabId>('info')
const tabsRef = ref<HTMLElement | null>(null)
watch(() => props.item, () => {
  activeTab.value = 'info'
}, { immediate: true })
watch(activeTab, async () => {
  await nextTick()
  const bar = tabsRef.value
  const active = bar?.querySelector<HTMLElement>('.dos-tab.active')
  if (!bar || !active) return
  const offset = active.offsetLeft - bar.clientWidth / 2 + active.offsetWidth / 2
  bar.scrollTo({ left: offset, behavior: 'smooth' })
})

const BASE_TABS = [
  { id: 'info'     as const, zh: '快速資訊', en: 'Info' },
  { id: 'weather'  as const, zh: '氣象預報', en: 'Weather' },
  { id: 'approach' as const, zh: '行程規劃', en: 'Plan' },
  { id: 'topo'     as const, zh: '原始路線圖', en: 'Topo' },
  { id: 'photos'   as const, zh: '代表照片', en: 'Photos' },
  { id: 'risk'     as const, zh: '風險注意', en: 'Risk' },
] as const

const eyebrow = computed(() =>
  (locale.value === 'en' ? d.value.region_en : d.value.region) || d.value.region || 'New Zealand'
)
const subtitle = computed(() =>
  locale.value === 'en' ? (d.value.subtitle || '') : (d.value.subtitle_zh || d.value.subtitle || '')
)

const NZ_FORECASTS = [
  {
    regions: ['fiordland', 'falls creek (hollyford)'],
    zh: '峽灣國家公園',
    en: 'Fiordland National Park',
    url: 'https://www.metservice.com/mountains-and-parks/national-parks/fiordland',
  },
  {
    regions: ['dart valley', 'matukituki valley'],
    zh: '阿斯派靈山國家公園',
    en: 'Mount Aspiring National Park',
    url: 'https://www.metservice.com/mountains-and-parks/national-parks/mt-aspiring',
  },
  {
    regions: ['haast pass', 'haast valley', 'robinson creek'],
    zh: '哈斯特',
    en: 'Haast',
    url: 'https://www.metservice.com/rural/regions/westland/locations/haast',
  },
  {
    regions: ['westland', 'waitaha valley'],
    zh: '西部地區',
    en: 'Westland Region',
    url: 'https://www.metservice.com/rural/regions/westland',
  },
  {
    regions: ['arthur’s pass', "arthur's pass", 'canterbury'],
    zh: 'Arthur’s Pass 國家公園',
    en: "Arthur's Pass National Park",
    url: 'https://www.metservice.com/mountains-and-parks/national-parks/arthurs-pass',
  },
] as const

const weatherForecast = computed(() => {
  const region = `${d.value.name ?? ''} ${d.value.region ?? ''} ${d.value.region_en ?? ''}`.toLowerCase()
  return NZ_FORECASTS.find(forecast => forecast.regions.some(name => region.includes(name)))
})

function vPart(g: string) { return g?.match(/v\d+/i)?.[0].toUpperCase() ?? '—' }
function aPart(g: string) { return g?.match(/a\d+/i)?.[0].toUpperCase() ?? '—' }
function romanPart(g: string) { return g?.replace(/v\d+|a\d+/gi, '').match(/VI|IV|V|III|II|I/i)?.[0].toUpperCase() ?? '—' }
function starsPart(g: string) { return (g ?? '').replace(/v\d+|a\d+|VI|IV|V|III|II|I/gi, '').trim() }

const ropeGrade    = computed(() => vPart(d.value.grading ?? ''))
const waterGrade   = computed(() => aPart(d.value.grading ?? ''))
const timeGrade    = computed(() => romanPart(d.value.grading ?? ''))
const gradingStars = computed(() => starsPart(d.value.grading ?? ''))
const ropeGradeClass = computed(() => vGradeClass(ropeGrade.value))
const routeElevation = computed<number | null>(() => {
  const values: number[] = []
  for (const field of ['gpx_track', 'gpx_waypoints']) {
    const raw = d.value[field]
    if (!raw) continue
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      const items = field === 'gpx_track' && Array.isArray(parsed?.[0]?.[0]) ? parsed.flat() : parsed
      for (const point of items ?? []) {
        const elevation = Array.isArray(point) ? point[2] : point.ele
        if (Number.isFinite(elevation)) values.push(elevation)
      }
    } catch {}
  }
  if (values.length) return Math.round(Math.max(...values))
  return Number.isFinite(d.value.elevation) && d.value.elevation > 0 ? Math.round(d.value.elevation) : null
})

const photos = computed(() => {
  const raw = d.value.photos
  if (!raw) return []
  try {
    const parsed = Array.isArray(raw) ? raw : JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, 4) : []
  } catch { return [] }
})

const waypoints = computed(() => {
  const raw = d.value.gpx_waypoints
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
})

function jsonArray(value: unknown) {
  if (!value) return []
  try { const parsed = typeof value === 'string' ? JSON.parse(value) : value; return Array.isArray(parsed) ? parsed : [] } catch { return [] }
}

function jsonObject(value: unknown) {
  if (!value) return {}
  try { const parsed = typeof value === 'string' ? JSON.parse(value) : value; return parsed && typeof parsed === 'object' ? parsed : {} } catch { return {} }
}

const details = computed<any>(() => jsonObject(d.value.details))
const approachSteps = computed<any[]>(() => jsonArray(d.value.approach_steps))
const sections = computed<any[]>(() => jsonArray(d.value.route_sections))
const hasTimedOptions = computed(() => sections.value.filter(section => section.approach_time || section.descent_time || section.return_time).length > 1)
const topoPages = computed<any[]>(() => jsonArray(d.value.topo_pages))
const recentUpdates = computed<any[]>(() => jsonArray(d.value.recent_updates))
const videos = computed<any[]>(() => jsonArray(d.value.videos))
const TABS = computed(() => {
  const tabs: Array<{ id: TabId; zh: string; en: string }> = [...BASE_TABS]
  if (recentUpdates.value.length) tabs.push({ id: 'updates', zh: '近期資訊', en: 'Updates' })
  return tabs
})

function localDetail(key: string) {
  return locale.value === 'en' ? details.value[key] : (details.value[`${key}_zh`] || details.value[key])
}

function isUnpublished(value: unknown) {
  return typeof value === 'string' && /^(未公布|尚未公布|not published|unpublished)$/i.test(value.trim())
}

const hasRiskSignal = computed(() => !!(details.value.flood || d.value.hazards || d.value.hazards_zh))

// Flood entries range from a bare severity word ("Extreme", "極高") to a full
// sentence ("No easy escape after the first drop"). Take the first clause and
// cap its length so the header chip stays short; the full text still lives on
// the Risk tab.
const FLOOD_CHIP_MAX = 8
const riskChipLabel = computed(() => {
  const flood = localDetail('flood')
  if (flood) {
    const clause = flood.split(/[;,.。，；]/)[0].trim()
    const short = clause.length > FLOOD_CHIP_MAX ? `${clause.slice(0, FLOOD_CHIP_MAX)}…` : clause
    return locale.value === 'en' ? `Flood: ${short}` : `暴洪：${short}`
  }
  return locale.value === 'en' ? 'Hazards' : '危險注意'
})

function mapsUrl(lat: number | string, lon?: number) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lon == null ? String(lat) : `${lat},${lon}`)}`
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Sans+Condensed:wght@700&family=IBM+Plex+Mono&family=Noto+Sans+TC:wght@400;500;700&display=swap');

/* All vars on the component root — `:root` in scoped styles doesn't work in Vue */
.nz-dossier {
  --bg:     #1a1a2e;
  --bg2:    #12122a;
  --bg3:    #252545;
  --line:   #2a2a4a;
  --text:   #e0e0e0;
  --muted:  #9898b8;
  --dim:    #7878a8  /* reads 3.1:1 on #1a1a2e – secondary labels only */
  --cyan:   #6c8ef5;
  --cyan2:  #91a8ff;
  --cdim:   #1e2d6b;
  --risk:   #ff7f50;
  --risk-bg:#1a0b04;
  --green:  #4fc88a;
  --gold:   #e8bc44;
  --sans:   'IBM Plex Sans', 'Noto Sans TC', sans-serif;
  --cond:   'IBM Plex Sans Condensed', sans-serif;
  --mono:   'IBM Plex Mono', monospace;

  position: fixed;
  top: 0; right: 0;
  width: min(452px, 100vw); /* overridden by inline :style on desktop */
  height: 100dvh;
  min-width: min(380px, 100vw);
  max-width: min(900px, 100vw);
  min-height: min(420px, 100dvh);
  max-height: 100dvh;
  background: var(--bg);
  border-left: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  z-index: 1400;
  font-family: var(--sans);
  color: var(--text);
  overflow: hidden;
  box-shadow: -8px 0 40px rgba(0,0,0,0.7);
}
.nz-dossier.resizing {
  transition: none;
  user-select: none;
}

/* ── Left resize handle ── */
.nz-resize-handle {
  position: absolute;
  top: 0;
  left: -4px;
  width: 8px;
  height: 100%;
  cursor: col-resize;
  z-index: 10;
  background: transparent;
  transition: background 0.15s;
}
.nz-resize-handle:hover,
.nz-dossier.resizing .nz-resize-handle {
  background: rgba(108, 142, 245, 0.25);
}
.nz-resize-handle::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--cyan);
  box-shadow: 0 -8px 0 var(--cyan), 0 8px 0 var(--cyan);
  opacity: 0;
  transition: opacity 0.15s;
}
.nz-resize-handle:hover::after,
.nz-dossier.resizing .nz-resize-handle::after {
  opacity: 1;
}

/* ── Header ── */
.dos-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px 14px;
  border-bottom: 1px solid var(--line);
  background: var(--bg2);
  flex-shrink: 0;
}
.dos-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.dos-eyebrow {
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--cyan); opacity: 0.8;
}
.dos-title {
  font-family: var(--cond); font-size: 24px; font-weight: 700;
  color: var(--cyan2); line-height: 1.15; margin: 0;
}
.dos-subtitle { font-size: 13px; color: var(--muted); font-style: italic; margin: 0; }
.dos-grades { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
.g-tag {
  font-size: 12px; font-weight: 700; padding: 2px 8px;
  border-radius: 5px; font-family: var(--mono);
}
.g-tag.rope              { background: #1a1a48; color: var(--cyan); }
.g-tag.rope.v1, .g-tag.rope.v2, .g-tag.rope.v3,
.g-tag.rope.v4, .g-tag.rope.v5, .g-tag.rope.v6 { background: var(--vg-bg); color: var(--vg-fg); }
.g-tag.water  { background: #0e0e3a; color: #7eaaff; }
.g-tag.roman  { background: #1c1c3e; color: var(--muted); }
.g-stars      { font-size: 13px; color: var(--gold); letter-spacing: 2px; }
.g-tag.risk-chip {
  display: inline-flex; align-items: center; gap: 3px;
  background: var(--risk-bg); color: var(--risk);
  border: 1px solid rgba(255,127,80,.4);
  font-family: var(--sans); cursor: pointer;
}
.g-tag.risk-chip:hover, .g-tag.risk-chip:focus-visible {
  background: rgba(255,127,80,.18); outline: none;
}
.dos-close {
  background: none; border: none; color: var(--dim);
  font-size: 17px; cursor: pointer; padding: 4px;
  border-radius: 4px; flex-shrink: 0; margin-top: 2px; line-height: 1;
}
.dos-close:hover { background: var(--bg3); color: var(--text); }

/* ── Tabs ── */
.dos-tabs {
  display: flex; gap: 4px; padding: 8px 14px;
  border-bottom: 1px solid var(--line);
  overflow-x: auto; scrollbar-width: none;
  flex-shrink: 0; background: var(--bg2);
  /* Scroll-shadow affordance: fades in at either edge only while more tabs
     are actually scrolled past it, so a clipped tab (e.g. Risk) is never
     silently invisible. Pure CSS, no scroll-position JS needed. */
  background-image:
    linear-gradient(to right, var(--bg2) 40%, rgba(18,18,42,0)),
    linear-gradient(to left, var(--bg2) 40%, rgba(18,18,42,0)),
    linear-gradient(to right, rgba(0,0,0,.4), rgba(0,0,0,0)),
    linear-gradient(to left, rgba(0,0,0,.4), rgba(0,0,0,0));
  background-repeat: no-repeat;
  background-size: 24px 100%, 24px 100%, 10px 100%, 10px 100%;
  background-position: left, right, left, right;
  background-attachment: local, local, scroll, scroll;
}
.dos-tabs::-webkit-scrollbar { display: none; }
.dos-tab {
  flex-shrink: 0; padding: 5px 12px; border-radius: 999px;
  border: 1px solid transparent; background: transparent;
  font-size: 12.5px; font-family: var(--sans);
  color: var(--muted); cursor: pointer; transition: all 0.13s; white-space: nowrap;
}
.dos-tab:hover  { color: var(--text); background: var(--bg3); }
.dos-tab.active { background: #1e2d6b; border-color: #3a5fc0; color: var(--cyan2); font-weight: 600; }

/* ── Body ── */
.dos-body {
  flex: 1; overflow-y: auto;
  padding: 12px 14px max(24px, env(safe-area-inset-bottom));
  scrollbar-width: thin; scrollbar-color: var(--bg3) transparent;
}

/* ── Row layout (dl/dt/dd) ── */
.rows { margin: 0; padding: 0; }
.row {
  display: grid; grid-template-columns: 112px 1fr;
  gap: 0; padding: 10px 20px;
  border-bottom: 1px solid var(--line); align-items: baseline;
}
.row:last-child { border-bottom: none; }
.row.unpublished { opacity: .48; }
dt {
  display: flex; align-items: flex-start; gap: 5px; padding-right: 8px;
  font-size: 12px; font-weight: 600; color: var(--dim);
}
.ic { font-size: 14px; line-height: 1.2; flex-shrink: 0; }
dd { margin: 0; font-size: 14px; color: var(--text); line-height: 1.6; }
dd.prewrap   { white-space: pre-line; font-size: 13.5px; }
dd.highlight { color: var(--cyan2); font-weight: 600; }
dd.dim       { color: var(--muted); }
dd.mono      { font-family: var(--mono); font-size: 12.5px; color: var(--green); }
.coord-link  { color: inherit; text-decoration: none; }
.coord-link:hover { text-decoration: underline; }

.ir-link { font-size: 14px; color: var(--cyan); text-decoration: none; }
.ir-link:hover { text-decoration: underline; }

.updates-list { padding: 0 6px; }
.updates-note { margin: 0; padding: 8px 14px 12px; color: var(--muted); font-size: 12px; line-height: 1.55; border-bottom: 1px solid var(--line); }
.update-row { padding: 14px; border-bottom: 1px solid var(--line); }
.update-meta { display: flex; justify-content: space-between; gap: 12px; color: var(--cyan); font: 10.5px var(--mono); }
.update-meta span { color: var(--dim); font-family: var(--sans); }
.update-row p { margin: 7px 0 0; color: var(--text); font-size: 13.5px; line-height: 1.65; }
.updates-source { display: block; margin: 14px; color: var(--cyan); font-size: 13px; text-decoration: none; }
.updates-source:hover { text-decoration: underline; }

.video-list { padding: 0 14px; display: flex; flex-direction: column; gap: 8px; }
.video-row { display: grid; grid-template-columns: 32px 1fr auto; align-items: center; gap: 10px; padding: 12px 12px; border-radius: 6px; background: var(--bg2, rgba(255,255,255,.05)); border: 1px solid var(--line); color: var(--text); text-decoration: none; transition: border-color .15s, background .15s; }
.video-row:hover { border-color: var(--cyan); background: var(--bg3, rgba(255,255,255,.08)); }
.video-row:hover strong { color: var(--cyan2); }
.video-icon { display: flex; align-items: center; justify-content: center; }
.video-play-generic { color: var(--cyan); }
.video-row strong { display: block; font-size: 13.5px; line-height: 1.45; transition: color .13s; }
.video-row small { display: block; margin-top: 3px; color: var(--dim); font-size: 11.5px; }
.video-open { color: var(--cyan); font-size: 15px; }

/* ── Section sub-heading ── */
.section-sub {
  font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--dim);
  padding: 14px 20px 6px;
}

/* ── Time plan cards ── */
.time-plan-header {
  display: flex; align-items: center; gap: 7px;
  padding: 14px 20px 8px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--cyan); opacity: 0.9;
}
.time-plan {
  padding: 0 14px 14px;
  display: flex; flex-direction: column; gap: 5px;
}
.time-row {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 16px;
  background: var(--bg2);
  border-radius: 8px;
  border: 1px solid var(--line);
}
.time-row.total {
  background: var(--bg3);
  border-color: var(--cyan);
  border-left-width: 3px;
}
.time-icon {
  width: 24px; display: flex; align-items: center; justify-content: center;
  color: var(--cyan); flex-shrink: 0; opacity: 0.85;
}
.time-row.total .time-icon { opacity: 1; }
.time-label {
  flex: 1; font-size: 14px; color: var(--text);
}
.time-label--total { font-weight: 700; }
.time-val {
  font: 700 15px var(--mono); color: var(--text); white-space: nowrap;
}
.time-val--total { font-size: 18px; color: var(--cyan); }
.time-val--sm { font-size: 13.5px; }

/* ── Trip structure / approach cards ── */
.struct-row {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 11px 16px;
  background: var(--bg2);
  border-radius: 8px;
  border: 1px solid var(--line);
}
.struct-badge {
  font: 700 10px var(--mono);
  padding: 3px 9px; border-radius: 4px;
  flex-shrink: 0; margin-top: 1px;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.struct-badge--access {
  background: rgba(72, 187, 120, 0.15); color: #48bb78;
  min-width: 20px; text-align: center;
}
.struct-badge--section {
  background: rgba(108, 142, 245, 0.15); color: var(--cyan);
}
.struct-text {
  font-size: 14px; color: var(--text); line-height: 1.65; margin: 0;
}
.struct-text p { margin: 6px 0 0; color: var(--muted); font-size: 12px; }
.struct-time {
  display: block; font: 700 12px var(--mono); color: var(--cyan2); margin-bottom: 7px;
}
.section-times { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin: 0; }
.section-times div { min-width: 0; padding-right: 6px; border-right: 1px solid var(--line); }
.section-times div:last-child { border-right: 0; }
.section-times dt { padding: 0; color: var(--dim); font-size: 10px; }
.section-times dd { color: var(--text); font: 600 11px var(--mono); white-space: nowrap; }
.struct-row--timed { display: grid; grid-template-columns: minmax(64px, auto) minmax(0, 1fr); align-items: start; }

.section-list { padding: 0 20px 16px; }
.section-card { padding: 10px 0; border-bottom: 1px solid var(--line); }
.section-card > div { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
.section-card b { color: var(--cyan2); white-space: nowrap; }
.section-card p { margin: 5px 0 0; color: var(--muted); font-size: 12.5px; line-height: 1.5; }

.approach-list { list-style: none; margin: 0; padding: 12px 20px 4px; }
.approach-list li { display: grid; grid-template-columns: 24px 1fr; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--line); }
.approach-list span { width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; background: var(--cdim); color: var(--cyan2); font: 700 10px var(--mono); }
.approach-list p { margin: 0; color: var(--text); font-size: 13.5px; line-height: 1.55; }

/* ── Waypoints ── */
.wpt-section { padding: 0 20px 16px; }
.wpt-row { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--bg3); align-items: flex-start; }
.wpt-seq {
  flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%;
  background: var(--cdim); color: var(--cyan2);
  font-size: 11px; font-weight: 700; display: flex;
  align-items: center; justify-content: center; font-family: var(--mono);
}
.wpt-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.wpt-name   { font-size: 13.5px; font-weight: 600; color: var(--text); }
.wpt-detail { font-size: 12px; color: var(--muted); line-height: 1.4; }
.wpt-coord  { font-size: 11.5px; font-family: var(--mono); color: var(--green); text-decoration: none; }
.wpt-coord:hover { text-decoration: underline; }

/* ── Topo images ── */
.topo-wrap { display: flex; flex-direction: column; height: 100%; }
.topo-note { font-size: 12.5px; color: var(--dim); padding: 0 20px 10px; margin: 0; }
.topo-stack { display: flex; flex-direction: column; }
.topo-figure { margin: 0; background: #fff; display: block; cursor: default; }
.topo-figure + .topo-figure { border-top: 8px solid var(--bg); }
.topo-figure figcaption { padding: 8px 20px; background: var(--bg2); color: var(--cyan2); font-size: 12px; font-weight: 700; }
.topo-figure:hover .topo-image { opacity: 0.88; }
.topo-image { display: block; width: 100%; height: auto; background: #fff; transition: opacity 0.15s; cursor: zoom-in; }
.topo-dl-btn {
  display: block; margin: 10px 20px 16px;
  padding: 9px 16px; border-radius: 7px;
  background: var(--bg3); border: 1px solid var(--line);
  color: var(--cyan); font-size: 14px; font-weight: 600;
  text-decoration: none; text-align: center;
  transition: background 0.13s;
}
.topo-dl-btn:hover { background: var(--cdim); }

/* ── Photo grid ── */
.photo-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px;
  padding: 12px 12px 0;
}
.photo-thumb { display: block; aspect-ratio: 3/4; overflow: hidden; border-radius: 4px; background: var(--bg3); }
.photo-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s; }
.photo-thumb:hover img { transform: scale(1.04); }
.photo-credit { font-size: 11.5px; color: var(--dim); text-align: center; padding: 10px; margin: 0; }

/* ── Risk block ── */
.risk-block {
  margin: 14px 20px 8px;
  padding: 14px 16px;
  background: var(--risk-bg);
  border: 1px solid rgba(255,127,80,.3);
  border-radius: 8px;
}
.risk-label { font-size: 12px; font-weight: 700; color: var(--risk); margin-bottom: 8px; letter-spacing: 0.05em; }
.risk-text  { font-size: 14px; color: #ffb09a; line-height: 1.65; white-space: pre-line; }
.flood-card { display: flex; justify-content: space-between; align-items: center; margin: 14px 20px 0; padding: 12px 14px; border: 1px solid rgba(255,127,80,.3); border-radius: 7px; background: var(--risk-bg); }
.flood-card small { color: var(--risk); font-size: 11px; font-weight: 700; }
.flood-card strong { color: #ffb09a; font-size: 14px; }

/* ── Empty ── */
.dos-empty { padding: 32px 20px; text-align: center; color: var(--dim); font-size: 13px; }

/* ── Mobile ── */
@media (max-width: 640px), (max-width: 900px) and (orientation: portrait) {
  .nz-dossier {
    top: auto; right: 0; bottom: 0; left: 0;
    width: 100% !important; height: 76dvh;
    min-width: 0; max-width: none;
    min-height: 0; max-height: 100dvh;
    border-left: none; border-top: 1px solid var(--line);
    border-radius: 16px 16px 0 0;
  }
  .nz-resize-handle { display: none; }
  .row { grid-template-columns: 90px 1fr; padding: 9px 16px; }
  .photo-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>
