<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h2>溪降難度分級說明</h2>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>

        <div class="modal-body" v-if="loading" style="display:flex;align-items:center;justify-content:center;color:#888;min-height:200px">
          載入中...
        </div>
        <div class="modal-body" v-else>
          <div class="grid">
            <!-- 繩索 -->
            <section class="col">
              <h3 class="col-title rope">繩索（V）</h3>
              <div v-for="level in ropeLevel" :key="level.code" class="level-card">
                <div :class="['level-badge', 'rope']">{{ level.code }}</div>
                <div class="level-content">
                  <div class="level-name">{{ level.name }}</div>
                  <ul>
                    <li v-for="item in level.items" :key="item">{{ item }}</li>
                  </ul>
                </div>
              </div>
            </section>

            <!-- 水域 -->
            <section class="col">
              <h3 class="col-title water">水域（A）</h3>
              <div v-for="level in waterLevel" :key="level.code" class="level-card">
                <div :class="['level-badge', 'water']">{{ level.code }}</div>
                <div class="level-content">
                  <div class="level-name">{{ level.name }}</div>
                  <ul>
                    <li v-for="item in level.items" :key="item">{{ item }}</li>
                  </ul>
                </div>
              </div>
            </section>

            <!-- 時間 -->
            <section class="col">
              <h3 class="col-title time">時間（T）</h3>
              <div v-for="level in timeLevel" :key="level.code" class="level-card">
                <div :class="['level-badge', 'time']">{{ level.code }}</div>
                <div class="level-content">
                  <ul>
                    <li v-for="item in level.items" :key="item">{{ item }}</li>
                  </ul>
                </div>
              </div>

              <!-- 附加說明 -->
              <div class="notes">
                <div class="note-item"><span class="tag tag-d">D</span>須攜帶電鑽</div>
                <div class="note-item"><span class="tag tag-u">U</span>未開發完成</div>
                <div class="note-divider"></div>
                <div class="note-item"><span class="note-label">最短繩長</span>標路線最長繩距的長度</div>
                <div class="note-item"><span class="note-label danger">危險激流</span>回流、翻滾流、水洞等</div>
              </div>
            </section>
          </div>

          <!-- 星級路線 -->
          <div class="star-section">
            <h3 class="col-title star">路線星級</h3>
            <div class="star-grid">
              <div v-for="s in starLevel" :key="s.stars" class="star-card">
                <div class="star-icons">{{ s.stars }}</div>
                <div class="star-info">
                  <div class="star-name">{{ s.name }}</div>
                  <div class="star-desc">{{ s.desc }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ records: any[], loading: boolean }>()
defineEmits<{ close: [] }>()

const ropeLevel  = computed(() => props.records.filter(r => r['type'] === 'rope'))
const waterLevel = computed(() => props.records.filter(r => r['type'] === 'water'))
const timeLevel  = computed(() => props.records.filter(r => r['type'] === 'time'))
const starLevel  = computed(() =>
  props.records.filter(r => r['type'] === 'star').map(r => ({
    stars: r['code'],
    name:  r['name'],
    desc:  r['items']?.[0] ?? '',
  }))
)
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal {
  background: #12122a;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  width: 100%;
  max-width: 900px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #2a2a4a;
}

.modal-header h2 {
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 1rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.close-btn:hover { background: #2a2a4a; color: #fff; }

.modal-body {
  overflow-y: auto;
  padding: 16px 20px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.col-title {
  font-size: 0.92rem;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 6px;
  margin-bottom: 10px;
}
.col-title.rope      { background: #1e2d6b; color: #6c8ef5; }
.col-title.water     { background: #0e2a3a; color: #38bdf8; }
.col-title.time      { background: #2a1e0e; color: #f5a030; }

.level-card {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.level-badge {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.84rem;
  font-weight: 700;
}
.level-badge.rope  { background: #1e2d6b; color: #6c8ef5; }
.level-badge.water { background: #0e2a3a; color: #38bdf8; }
.level-badge.time  { background: #2a1e0e; color: #f5a030; }

.level-content {
  flex: 1;
}

.level-name {
  font-size: 0.84rem;
  font-weight: 600;
  color: #e8e8e8;
  margin-bottom: 4px;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

ul li {
  font-size: 0.8rem;
  color: #aaa;
  line-height: 1.6;
}

ul li::before {
  content: '· ';
  color: #777;
}

/* 附加說明 */
.notes {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #2a2a4a;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.note-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: #aaa;
}

.note-divider { height: 1px; background: #2a2a4a; margin: 4px 0; }

.tag {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}
.tag-d { background: #1e3a1e; color: #6abf8a; }
.tag-u { background: #3a2800; color: #f5a030; }

.note-label {
  font-weight: 600;
  color: #ccc;
  flex-shrink: 0;
}
.note-label.danger { color: #f56c8e; }

/* 星級 */
.star-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #2a2a4a;
}

.col-title.star { background: #2a2400; color: #f5d030; margin-bottom: 12px; }

.star-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.star-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  padding: 8px 14px;
  min-width: 160px;
  flex: 1;
}

.star-icons {
  font-size: 0.92rem;
  color: #f5d030;
  flex-shrink: 0;
  min-width: 60px;
}

.star-name {
  font-size: 0.87rem;
  font-weight: 600;
  color: #eee;
}

.star-desc {
  font-size: 0.78rem;
  color: #aaa;
  margin-top: 2px;
}
</style>
