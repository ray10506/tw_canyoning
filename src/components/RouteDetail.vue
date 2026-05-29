<template>
  <Teleport to="body">
    <div
      ref="panelRef"
      class="panel"
      :class="{ dragging: isDragging }"
      :style="pos ? { left: pos.x + 'px', top: pos.y + 'px', transform: 'none' } : {}"
      @click.stop
    >
        <div class="panel-header" @mousedown.prevent="startDrag">
          <div class="header-left">
            <span class="route-name">{{ title }}</span>
            <span :class="['kind-badge', item.kind]">{{ kindLabel }}</span>
          </div>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>

        <div class="panel-body">

          <!-- Canyon（溯溪 / 野溪溫泉）-->
          <template v-if="item.kind === 'canyon'">
            <div class="row">
              <span class="row-label">地點</span>
              <span class="row-value">{{ d.location || '—' }}</span>
            </div>
            <div class="row">
              <span class="row-label">路線類型</span>
              <span class="row-value">{{ d.type || '—' }}</span>
            </div>
            <div class="row">
              <span class="row-label">難度</span>
              <span class="row-value">
                <span class="stars">{{ '★'.repeat(d.difficulty) }}{{ '☆'.repeat(5 - d.difficulty) }}</span>
                <span class="level-text">Lv.{{ d.difficulty }}</span>
              </span>
            </div>
            <div class="row">
              <span class="row-label">適合季節</span>
              <span class="row-value">{{ d.season?.join('、') || '—' }}</span>
            </div>
            <div class="row">
              <span class="row-label">路線描述</span>
              <span class="row-value">{{ d.description || '—' }}</span>
            </div>
            <div class="row">
              <span class="row-label">GPS 座標</span>
              <a
                v-if="d.coordinates?.[0] != null && d.coordinates?.[1] != null"
                class="row-value coord gps-link"
                :href="`https://www.google.com/maps/search/?api=1&query=${d.coordinates[0]},${d.coordinates[1]}`"
                target="_blank" rel="noopener"
              >{{ d.coordinates[0] }}, {{ d.coordinates[1] }} ↗</a>
              <span v-else class="row-value coord">—</span>
            </div>
          </template>

          <!-- Canyon Route（溪降）-->
          <template v-else>
            <div v-if="d.deep_pool || (d.ab_shuttle && d.ab_shuttle !== '不需要')" class="tag-row">
              <span v-if="d.deep_pool" class="info-tag pool">{{ d.deep_pool === '有' ? '有深潭' : d.deep_pool === '無' ? '無深潭' : d.deep_pool }}</span>
              <span v-if="d.ab_shuttle && d.ab_shuttle !== '不需要'" class="info-tag shuttle">需要 AB 車</span>
            </div>
            <div v-if="d.region" class="row">
              <span class="row-label">地區</span>
              <span class="row-value">{{ d.region }}</span>
            </div>
            <div v-if="d.grading" class="row">
              <span class="row-label">分級</span>
              <span class="row-value">
                <span v-if="ropeGrade !== '—'" class="grade-tag rope">{{ ropeGrade }}</span>
                <span v-if="waterGrade !== '—'" class="grade-tag water">{{ waterGrade }}</span>
                <span v-if="timeGrade !== '—'" class="grade-tag time">{{ timeGrade }}</span>
                <span v-if="gradingStars" class="grade-stars">{{ gradingStars }}</span>
              </span>
            </div>
            <div v-if="d.max_drop" class="row">
              <span class="row-label">最高瀑高</span>
              <span class="row-value">{{ d.max_drop }}</span>
            </div>
            <div v-if="d.approach" class="row">
              <span class="row-label">接近時間</span>
              <span class="row-value">{{ d.approach }}</span>
            </div>
            <div v-if="d.total_time" class="row">
              <span class="row-label">全程時間</span>
              <span class="row-value">{{ d.total_time }}</span>
            </div>
            <div v-if="d.gps" class="row">
              <span class="row-label">停車點 GPS</span>
              <a
                class="row-value coord gps-link"
                :href="`https://www.google.com/maps/search/?api=1&query=${d.gps.trim()}`"
                target="_blank" rel="noopener"
              >{{ d.gps }} ↗</a>
            </div>
            <div v-if="d.note" class="row">
              <span class="row-label">附註</span>
              <span class="row-value">
                <template v-for="(seg, i) in parseNote(d.note)" :key="i">
                  <a v-if="seg.isUrl" :href="seg.text" target="_blank" rel="noopener" class="note-link">
                    {{ seg.isYoutube ? '路線影片' : '路線 gpx' }} ↗
                  </a>
                  <span v-else>{{ seg.text }}</span>
                </template>
              </span>
            </div>
          </template>

          <!-- Elevation profile (shown for route kind when gpx_track has elevation) -->
          <div v-if="elevationData" class="elevation-section">
            <div class="ele-header">
              <span class="ele-title">海拔高度變化</span>
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
              <svg class="ele-svg" viewBox="0 0 280 60" preserveAspectRatio="none">
                <polygon :points="elePolygon" fill="rgba(230,57,70,0.18)" />
                <polyline :points="elePolyline" fill="none" stroke="#e63946" stroke-width="1.5" stroke-linejoin="round" />
              </svg>
            </div>
          </div>

        </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from 'vue'

const props = defineProps<{
  item: { kind: 'canyon' | 'route', data: any }
  initPos?: { x: number; y: number } | null
}>()
defineEmits<{ close: [] }>()

const panelRef = ref<HTMLElement | null>(null)
const pos = ref<{ x: number; y: number } | null>(props.initPos ?? null)
const isDragging = ref(false)

const MARGIN = 10

async function clampToViewport() {
  await nextTick()
  if (!pos.value || !panelRef.value) return
  const w = panelRef.value.offsetWidth
  const h = panelRef.value.offsetHeight
  pos.value = {
    x: Math.max(MARGIN, Math.min(pos.value.x, window.innerWidth - w - MARGIN)),
    y: Math.max(MARGIN, Math.min(pos.value.y, window.innerHeight - h - MARGIN)),
  }
}

onMounted(clampToViewport)

watch(() => props.item, async () => {
  pos.value = props.initPos ?? null
  await clampToViewport()
})

function startDrag(e: MouseEvent) {
  if (!panelRef.value) return
  if (!pos.value) {
    const r = panelRef.value.getBoundingClientRect()
    pos.value = { x: r.left, y: r.top }
  }
  isDragging.value = true
  const offset = { x: e.clientX - pos.value.x, y: e.clientY - pos.value.y }

  function onMove(ev: MouseEvent) {
    const w = panelRef.value?.offsetWidth ?? 380
    const h = panelRef.value?.offsetHeight ?? 420
    pos.value = {
      x: Math.max(MARGIN, Math.min(ev.clientX - offset.x, window.innerWidth - w - MARGIN)),
      y: Math.max(MARGIN, Math.min(ev.clientY - offset.y, window.innerHeight - h - MARGIN)),
    }
  }
  function onUp() {
    isDragging.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

const d = computed(() => props.item.data)

const title     = computed(() => d.value.name)
const kindLabel = computed(() => props.item.kind === 'canyon' ? d.value.type : '溪降')

const URL_RE = /https?:\/\/[^\s]+/gi
const YT_RE  = /youtu(?:be\.com|\.be)\//

function parseNote(val: string) {
  const segments: { text: string, isUrl: boolean, isYoutube?: boolean }[] = []
  let last = 0
  for (const m of val.matchAll(URL_RE)) {
    const url = m[0].replace(/[.,;:!?）)】\]'"]+$/, '')
    if (m.index! > last) segments.push({ text: val.slice(last, m.index), isUrl: false })
    segments.push({ text: url, isUrl: true, isYoutube: YT_RE.test(url) })
    last = m.index! + url.length
  }
  if (last < val.length) segments.push({ text: val.slice(last), isUrl: false })
  return segments
}

function parseGradePart(grading: string, pattern: RegExp) {
  return grading?.split(/\s+/).find((p: string) => pattern.test(p)) ?? '—'
}
const ropeGrade  = computed(() => parseGradePart(d.value.grading, /^V\d/))
const waterGrade = computed(() => parseGradePart(d.value.grading, /^A\d/))
const timeGrade  = computed(() => parseGradePart(d.value.grading, /^(I{1,3}|IV|VI?)$/))

const gradingStars = computed(() =>
  (d.value.grading ?? '')
    .replace(/\b(V\d+|A\d+|I{1,3}|IV|VI?)\b/g, '')
    .trim()
)

const elevationData = computed(() => {
  if (props.item.kind !== 'route' || !d.value.gpx_track) return null
  try {
    const parsed = JSON.parse(d.value.gpx_track)
    // Support flat [lat,lon,ele][] and segmented [lat,lon,ele][][]
    const isSegmented = parsed.length > 0 && Array.isArray(parsed[0][0])
    const allPts: number[][] = isSegmented ? (parsed as number[][][]).flat() : parsed
    const eles = allPts.map((p: number[]) => p[2]).filter((e: number) => e != null && !isNaN(e))
    if (eles.length < 2) return null
    const minEle = Math.min(...eles)
    const maxEle = Math.max(...eles)
    let gain = 0, loss = 0
    for (let i = 1; i < eles.length; i++) {
      const diff = eles[i] - eles[i - 1]
      if (diff > 3) gain += diff
      else if (diff < -3) loss += Math.abs(diff)
    }
    return { eles, minEle, maxEle, gain: Math.round(gain), loss: Math.round(loss) }
  } catch { return null }
})

const elePolyline = computed(() => {
  if (!elevationData.value) return ''
  const { eles, minEle, maxEle } = elevationData.value
  const W = 280, H = 54, padT = 3
  const rangeEle = maxEle - minEle || 1
  return eles.map((e, i) => {
    const x = (i / (eles.length - 1)) * W
    const y = padT + (1 - (e - minEle) / rangeEle) * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
})

const elePolygon = computed(() => {
  if (!elevationData.value) return ''
  const { eles, minEle, maxEle } = elevationData.value
  const W = 280, H = 54, padT = 3
  const rangeEle = maxEle - minEle || 1
  const pts = eles.map((e, i) => {
    const x = (i / (eles.length - 1)) * W
    const y = padT + (1 - (e - minEle) / rangeEle) * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return `${pts.join(' ')} ${W},${padT + H} 0,${padT + H}`
})

</script>

<style scoped>
.panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1500;
  background: #12122a;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  width: 380px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #2a2a4a;
  cursor: grab;
}

.panel.dragging .panel-header { cursor: grabbing; }
.panel.dragging { user-select: none; }

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.route-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: #fff;
}

.kind-badge {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}
.kind-badge.canyon  { background: #1e2d6b; color: #6c8ef5; }
.kind-badge.route   { background: #3a2800; color: #f5a030; }

.close-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 1rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.close-btn:hover { background: #2a2a4a; color: #fff; }

.panel-body {
  padding: 8px 0;
}

.row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid #1e1e38;
}
.row:last-child { border-bottom: none; }

.row-label {
  flex-shrink: 0;
  width: 72px;
  font-size: 0.78rem;
  color: #666;
}

.row-value {
  font-size: 0.88rem;
  color: #ccc;
  line-height: 1.5;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.stars { color: #f0a030; letter-spacing: 2px; }
.level-text { font-size: 0.75rem; color: #888; }

.coord { font-family: monospace; font-size: 0.82rem; color: #6abf8a; }

.gps-link { text-decoration: none; }
.gps-link:hover { text-decoration: underline; }

.note-link {
  color: #6c8ef5;
  text-decoration: none;
  font-size: 0.88rem;
}
.note-link:hover { text-decoration: underline; }

.grade-rows {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.grade-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.grade-stars {
  font-size: 0.72rem;
  color: #f0a030;
  letter-spacing: 1px;
}

.grading-wrap { display: flex; gap: 6px; }
.grade-tag {
  font-size: 0.78rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
}
.grade-tag.rope  { background: #1e2d6b; color: #6c8ef5; }
.grade-tag.water { background: #0e2a3a; color: #38bdf8; }
.grade-tag.time  { background: #2a1e0e; color: #f5a030; }

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 20px;
  border-bottom: 1px solid #1e1e38;
}

.info-tag {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 12px;
}

.info-tag.pool    { background: #0e2a3a; color: #38bdf8; }
.info-tag.shuttle { background: #1a2e1a; color: #6abf8a; }

.elevation-section {
  padding: 12px 20px 16px;
  border-top: 1px solid #1e1e38;
}

.ele-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.ele-title {
  font-size: 0.75rem;
  color: #666;
}

.ele-stats {
  display: flex;
  gap: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.ele-up   { color: #e63946; }
.ele-down { color: #38bdf8; }

.ele-chart-wrap {
  display: flex;
  align-items: stretch;
  gap: 6px;
}

.ele-y-labels {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 0.65rem;
  color: #555;
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
</style>
