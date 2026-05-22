<template>
  <Teleport to="body">
    <div class="panel" @click.stop>

        <div class="panel-header">
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
              <span class="row-value coord">{{ d.coordinates?.[0] }}, {{ d.coordinates?.[1] }}</span>
            </div>
          </template>

          <!-- Canyon Route（溪降）-->
          <template v-else>
            <div class="row">
              <span class="row-label">地區</span>
              <span class="row-value">{{ d.region || '—' }}</span>
            </div>
            <div v-if="d.grading" class="row">
              <span class="row-label">分級</span>
              <span class="row-value">
                <span class="grade-tag rope">{{ ropeGrade }}</span>
                <span class="grade-tag water">{{ waterGrade }}</span>
                <span class="grade-tag time">{{ timeGrade }}</span>
              </span>
            </div>
            <div class="row">
              <span class="row-label">最高落差</span>
              <span class="row-value">{{ d.max_drop || '—' }}</span>
            </div>
            <div class="row">
              <span class="row-label">接近時間</span>
              <span class="row-value">{{ d.approach || '—' }}</span>
            </div>
            <div class="row">
              <span class="row-label">全程時間</span>
              <span class="row-value">{{ d.total_time || '—' }}</span>
            </div>
            <div v-if="d.note" class="row">
              <span class="row-label">附註</span>
              <span class="row-value">
                <template v-for="(seg, i) in parseNote(d.note)" :key="i">
                  <a v-if="seg.isUrl" :href="seg.text" target="_blank" rel="noopener" class="note-link">
                    開啟連結 ↗
                  </a>
                  <span v-else>{{ seg.text }}</span>
                </template>
              </span>
            </div>
          </template>

        </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  item: { kind: 'canyon' | 'route', data: any }
}>()
defineEmits<{ close: [] }>()

const d = computed(() => props.item.data)

const title     = computed(() => d.value.name)
const kindLabel = computed(() => props.item.kind === 'canyon' ? d.value.type : '溪降')

const URL_RE = /https?:\/\/[^\s]+/gi

function parseNote(val: string) {
  const segments: { text: string, isUrl: boolean }[] = []
  let last = 0
  for (const m of val.matchAll(URL_RE)) {
    if (m.index! > last) segments.push({ text: val.slice(last, m.index), isUrl: false })
    segments.push({ text: m[0], isUrl: true })
    last = m.index! + m[0].length
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
}

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

.note-link {
  color: #6c8ef5;
  text-decoration: none;
  font-size: 0.88rem;
}
.note-link:hover { text-decoration: underline; }

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
</style>
