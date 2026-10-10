<script setup lang="ts">
import ApiPerformance from './ApiPerformance.vue'
import { computed, onMounted, ref } from 'vue'
import PocketBase, { BaseAuthStore, type RecordModel } from 'pocketbase'

// Separate, memory-only session: never reuse the public app's auth store.
const client = new PocketBase(import.meta.env.VITE_PB_URL ?? 'http://localhost:8090', new BaseAuthStore())
const identity = ref(''), password = ref(''), signedIn = ref(false)
const busy = ref(false), error = ref(''), notice = ref('')
const tab = ref('routes'), country = ref('canyon_routes'), search = ref(''), status = ref('')
const rows = ref<RecordModel[]>([]), selected = ref<RecordModel | null>(null)
const draft = ref<Record<string, string>>({}), reason = ref(''), preview = ref(false)
const latest = ref<RecordModel | null>(null), audits = ref<RecordModel[]>([])
const fields = [
  ['name', '名稱'], ['name_en', '英文名稱'], ['region', '地區'], ['region_en', '英文地區'],
  ['grading', '難度'], ['gps', 'GPS（緯度, 經度）'], ['max_drop', '最大落差'],
  ['total_time', '總時間'], ['approach', '進場方式'], ['note', '備註'], ['editor_source', '來源與授權說明'],
]
const requiredField = (key: string) => key === 'name' || (draft.value.publication_status === 'published' && ['region', 'grading', 'gps', 'editor_source'].includes(key))
function previewChanges(event: Event) {
  const form = event.currentTarget as HTMLFormElement
  for (const control of Array.from(form.elements)) {
    if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)
      control.setCustomValidity(control.required && !control.value.trim() ? '請填寫此必填欄位，不能只有空白。' : '')
  }
  if (form.reportValidity()) { error.value = ''; preview.value = true }
}
const labels: Record<string, string> = { draft: '草稿', published: '已發布', archived: '已下架', pending: '待審核', needs_info: '待補件', resolved: '已處理', rejected: '不採用' }
const dirty = computed(() => !!selected.value && (reason.value !== '' || changes.value.length > 0))
const visibleRows = computed(() => rows.value.filter(row => {
  const state = tab.value === 'routes' ? row.publication_status || 'published' : row.review_status
  return (!status.value || status.value === state) && JSON.stringify([row.name, row.name_en, row.region, row.payload]).toLowerCase().includes(search.value.toLowerCase())
}))
const changes = computed(() => [...fields, ['publication_status', '發布狀態']].filter(([key]) => (selected.value?.[key] || (key === 'publication_status' ? 'published' : '')) !== draft.value[key]))
function displayValue(key: string, value: string) { return key === 'publication_status' ? labels[value || 'published'] : value || '未填寫' }
function time(value: string) { return new Date(value).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) }
const collectionLabels: Record<string, string> = { canyon_routes: '台灣路線', nz_routes: '紐西蘭路線', site_submissions: '使用者回報' }
const collectedAge = computed(() => latest.value ? (Date.now() - Date.parse(latest.value.collected_at)) / 3600000 : null)

async function run(action: () => Promise<void>) {
  busy.value = true; error.value = ''; notice.value = ''
  try { await action() } catch (e: any) {
    if (e.status === 401) { client.authStore.clear(); signedIn.value = false; selected.value = null }
    error.value = e.status === 401 ? '登入已失效，請重新登入。' : e.status === 409 ? '資料已被更新，請重新載入再編輯。' : e.response?.message || '無法連線或尚未完成後台設定，請稍後重試。'
  } finally { busy.value = false }
}
async function login() {
  await run(async () => {
    try { await client.collection('site_admins').authWithPassword(identity.value.trim(), password.value) }
    finally { password.value = '' }
    signedIn.value = true
    await load()
  })
  if (!signedIn.value && error.value) error.value = '登入失敗，請確認管理員帳號、密碼與後台連線。'
}
async function load() {
  rows.value = []
  if (tab.value === 'performance') return
  if (tab.value === 'status') {
    latest.value = null; audits.value = []
    const results = await Promise.all([
      client.collection('water_level_observations').getList(1, 1, { sort: '-collected_at', fields: 'id,collected_at,observed_at,station_id' }),
      client.collection('site_audit').getList(1, 20, { sort: '-created' }),
    ])
    latest.value = results[0].items[0] ?? null; audits.value = results[1].items
  } else rows.value = await client.collection(tab.value === 'routes' ? country.value : 'site_submissions').getFullList({ sort: tab.value === 'routes' ? 'name' : '-created' })
}
function leave() { return !dirty.value || window.confirm('有尚未儲存的修改，確定離開？') }
async function switchTab(value: string) {
  if (!leave()) return
  selected.value = null; tab.value = value; search.value = ''; status.value = ''
  await run(load)
}
async function switchCountry(event: Event) {
  const input = event.target as HTMLSelectElement
  if (!leave()) { input.value = country.value; return }
  country.value = input.value; selected.value = null; await run(load)
}
function edit(row?: RecordModel) {
  if (!leave()) return
  selected.value = row ? { ...row } : { id: '', collectionId: '', collectionName: country.value }
  draft.value = Object.fromEntries(fields.map(([key]) => [key, row?.[key] ?? '']))
  draft.value.publication_status = row ? row.publication_status || 'published' : 'draft'
  reason.value = ''; preview.value = false; error.value = ''; notice.value = ''
}
async function save() {
  if (!selected.value || busy.value) return
  await run(async () => {
    await client.send('/api/site-admin/save', { method: 'POST', body: {
      collection: country.value, id: selected.value!.id, version: selected.value!.updated,
      data: draft.value, reason: reason.value,
    } })
    selected.value = null; preview.value = false
    notice.value = '路線已儲存，變更紀錄已保留。'
    await load()
  })
}
async function review(row: RecordModel, reviewStatus: string) {
  const note = window.prompt(`將回報標記為「${labels[reviewStatus]}」。請填寫審核原因：`)
  if (!note?.trim()) return
  await run(async () => {
    await client.send('/api/site-admin/save', { method: 'POST', body: {
      collection: 'site_submissions', id: row.id, version: row.updated,
      data: { review_status: reviewStatus, review_note: note }, reason: note,
    } })
    await load(); notice.value = '審核結果已保存。此操作不會寄信給投稿者。'
  })
}
async function useSubmission(row: RecordModel) {
  if (!leave()) return
  selected.value = null; tab.value = 'routes'; country.value = 'canyon_routes'; search.value = ''; status.value = ''
  await run(async () => {
    await load()
    edit()
    for (const [key] of fields) draft.value[key] = String(row.payload?.route?.[key] ?? '')
    reason.value = `依回報 ${row.id} 建立草稿；發布前確認來源與資料。`
  })
}
async function download(row: RecordModel) {
  await run(async () => {
    const token = await client.files.getToken()
    window.open(client.files.getURL(row, row.attachment, { token, download: true }), '_blank', 'noopener,noreferrer')
  })
}
// Memory-only auth store: a reload is a full sign-out.
function logout() { if (leave()) location.reload() }
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
onMounted(() => { document.title = '管理後台 · 溪降地圖'; window.addEventListener('beforeunload', beforeUnload) })
</script>

<template>
  <main class="admin-shell">
    <header class="admin-header"><a href="/" class="brand"><img src="/favicon.png" alt="" width="32" height="32">溪降地圖</a><span>管理後台</span><button v-if="signedIn" :disabled="busy" @click="logout">登出</button><a v-else href="/">返回地圖</a></header>
    <section v-if="!signedIn" class="login-area">
      <h1>管理員登入</h1><p>管理路線內容、審核回報，查看資料更新狀態。</p>
      <form @submit.prevent="login"><label>管理員帳號或電子郵件<input v-model="identity" type="text" autocomplete="username" required :disabled="busy"></label><label>密碼<input v-model="password" type="password" autocomplete="current-password" required :disabled="busy"></label><p v-if="error" role="alert" class="error">{{ error }}</p><button class="primary" :disabled="busy">{{ busy ? '登入中…' : '登入後台' }}</button></form>
      <p class="hint">僅供受邀管理員使用。帳號由網站維護者建立。</p>
    </section>
    <template v-else>
      <nav aria-label="後台功能"><button v-for="item in [['routes', '路線管理'], ['submissions', '待審回報'], ['status', '資料狀態'], ['performance', 'API 效能']]" :key="item[0]" :aria-current="tab === item[0] ? 'page' : undefined" :disabled="busy" @click="switchTab(item[0])">{{ item[1] }}</button></nav>
      <div class="admin-content" :aria-busy="busy">
        <p v-if="error && !selected" role="alert" class="error">{{ error }}</p><p v-if="notice" role="status" class="success">{{ notice }}</p><p v-if="busy" role="status" class="hint">處理中…</p>
        <template v-if="tab === 'routes'">
          <div class="heading"><div><h1>路線管理</h1><p>先存草稿，確認內容與來源後再發布。</p></div><button class="primary" :disabled="busy" @click="edit()">新增路線</button></div>
          <div class="toolbar"><label>國家<select :value="country" :disabled="busy" @change="switchCountry"><option value="canyon_routes">台灣</option><option value="nz_routes">紐西蘭</option></select></label><label class="search">搜尋路線<input v-model="search" type="search" placeholder="名稱、英文名稱或地區"></label><label>狀態<select v-model="status"><option value="">全部</option><option v-for="value in ['published','draft','archived']" :key="value" :value="value">{{ labels[value] }}</option></select></label><button :disabled="busy" @click="switchTab('routes')">重新載入</button></div>
          <div v-if="!selected" class="route-list"><button v-for="row in visibleRows" :key="row.id" :disabled="busy" @click="edit(row)"><span><strong>{{ row.name || row.name_en }}</strong><small>{{ row.region }} · {{ row.grading || '難度未填' }}</small></span><span class="badge" :data-status="row.publication_status || 'published'">{{ labels[row.publication_status || 'published'] }}</span><span aria-hidden="true">→</span></button><p v-if="!busy && !visibleRows.length" class="empty">沒有符合條件的路線。可以調整搜尋，或新增一條草稿。</p></div>
          <section v-else class="editor"><div class="heading"><h2>{{ preview ? '確認變更' : selected.id ? '編輯路線' : '新增草稿' }}</h2><button :disabled="busy" @click="leave() && (selected = null)">關閉編輯</button></div>
            <form v-if="!preview" @submit.prevent="previewChanges" novalidate>
              <div class="field-grid"><label v-for="[key, label] in fields" :key="key" :class="{wide: ['approach','note','editor_source'].includes(key)}">{{ label }}{{ requiredField(key) ? '（必填）' : '' }}<textarea v-if="['approach','note','editor_source'].includes(key)" v-model="draft[key]" :required="requiredField(key)" rows="3" maxlength="4000"/><input v-else v-model="draft[key]" :required="requiredField(key)" maxlength="4000"></label></div>
              <div class="field-grid"><label>儲存後狀態<select v-model="draft.publication_status"><option value="draft">草稿（不公開）</option><option value="published">發布（公開顯示）</option><option value="archived">下架（保留資料）</option></select></label><label>修改原因（必填）<input v-model="reason" required maxlength="2000" placeholder="說明本次修改或下架原因"></label></div><p class="hint">GPX 與進階路線資料會保留原值；此版只編輯上列欄位。</p><button class="primary" :disabled="busy">預覽與確認</button>
            </form>
            <template v-else><h3>{{ draft.name }}</h3><p>{{ draft.region }} · {{ draft.grading }} · {{ draft.gps }}</p><p class="preview-note">{{ draft.note || draft.approach || '未填寫備註' }}</p><p>儲存後：<strong>{{ labels[draft.publication_status] }}</strong></p><dl class="diff"><template v-for="[key,label] in changes" :key="key"><dt>{{ label }}</dt><dd><del>{{ selected.id ? displayValue(key, selected[key]) : '新增資料' }}</del><ins>{{ displayValue(key, draft[key]) }}</ins></dd></template></dl><p>修改原因：{{ reason }}</p><p v-if="error" role="alert" class="error">{{ error }}</p><div class="actions"><button :disabled="busy" @click="preview = false; error = ''">返回編輯</button><button class="primary" :disabled="busy" @click="save">{{ busy ? '儲存中…' : draft.publication_status === 'published' ? '確認發布' : draft.publication_status === 'archived' ? '確認下架' : '儲存草稿' }}</button></div></template>
          </section>
        </template>
        <template v-else-if="tab === 'submissions'">
          <div class="heading"><div><h1>待審回報</h1><p>投稿不會自動發布；待補件與審核結果只保留在後台。</p></div><button :disabled="busy" @click="run(load)">重新載入</button></div><label class="filter">審核狀態<select v-model="status"><option value="">全部</option><option v-for="value in ['pending','needs_info','resolved','rejected']" :key="value" :value="value">{{ labels[value] }}</option></select></label>
          <article v-for="row in visibleRows" :key="row.id" class="submission"><div class="heading"><h2>{{ row.kind === 'route' ? row.payload?.route?.name || '路線投稿' : '網站回報' }}</h2><span class="badge">{{ labels[row.review_status] }}</span></div><p class="hint">{{ time(row.created) }}（台灣時間） · {{ row.contact_email || '未留聯絡信箱' }}</p><dl v-if="row.kind === 'route'" class="submission-fields"><template v-for="[key,label] in [...fields, ['type','類型'], ['deep_pool','深水區'], ['ab_shuttle','接駁']]" :key="key"><template v-if="row.payload?.route?.[key]"><dt>{{ label }}</dt><dd>{{ row.payload.route[key] }}</dd></template></template></dl><p v-else class="preview-note">{{ row.payload?.message }}</p><p v-if="row.review_note">審核紀錄：{{ row.review_note }}</p><div class="actions"><button v-if="row.attachment" :disabled="busy" @click="download(row)">下載 GPX</button><button v-if="row.kind === 'route'" :disabled="busy" @click="useSubmission(row)">帶入新路線草稿</button><button :disabled="busy" @click="review(row, 'needs_info')">待補件</button><button :disabled="busy" @click="review(row, 'resolved')">已處理</button><button :disabled="busy" @click="review(row, 'rejected')">不採用</button></div></article><p v-if="!busy && !visibleRows.length" class="empty">目前沒有符合條件的回報。啟用保存功能後的新回報會顯示在這裡；既有電子郵件不會自動匯入。</p>
        </template>
        <ApiPerformance v-else-if="tab === 'performance'" :client="client" />
        <template v-else>
          <div class="heading"><div><h1>資料狀態</h1><p>查看歷史資料收集時間與管理操作紀錄。</p></div><button :disabled="busy" @click="run(load)">重新檢查</button></div>
          <section class="data-status"><h2>台灣水位歷史</h2><p v-if="latest" :class="collectedAge! > 6 ? 'error' : 'success'">{{ collectedAge! > 6 ? '最近收集已超過 6 小時，請檢查排程。' : '最近 6 小時內有收到資料。' }}</p><p v-else>尚無可用收集紀錄。</p><dl v-if="latest"><dt>最近收集</dt><dd>{{ time(latest.collected_at) }}（台灣時間）</dd><dt>觀測時間</dt><dd>{{ time(latest.observed_at) }}（台灣時間）</dd><dt>測站</dt><dd>{{ latest.station_id }}</dd></dl><p class="hint">僅代表最新一筆紀錄，不能代表全部測站正常。即時氣象、雨量與紐西蘭資料由上游查詢，此頁尚無全站健康監測。</p></section>
          <h2>最近 20 筆管理紀錄</h2><article v-for="row in audits" :key="row.id" class="audit"><strong>{{ row.reason }}</strong><p class="hint">{{ time(row.created) }} · {{ collectionLabels[row.target_collection] || row.target_collection }} / {{ row.target_id }} · 管理員 {{ row.actor }}</p><details><summary>查看變更內容</summary><pre>{{ JSON.stringify({ before: row.before, after: row.after }, null, 2) }}</pre></details></article><p v-if="!busy && !audits.length" class="empty">還沒有管理操作紀錄。</p>
        </template>
      </div>
    </template>
  </main>
</template>

<style scoped>
.admin-shell{min-height:100dvh;background:var(--color-panel);color:var(--color-text);font:15px/1.6 'Noto Sans TC',system-ui,sans-serif;overflow-wrap:anywhere}
.admin-header{display:flex;align-items:center;gap:20px;padding:18px max(24px,calc((100vw - 1120px)/2));border-bottom:1px solid var(--color-line)}
.admin-header>a:last-child,.admin-header>button{margin-left:auto}.brand{display:flex;gap:10px;align-items:center;color:var(--color-text-strong);font-weight:700;text-decoration:none;white-space:nowrap}.brand img{object-fit:contain}
a{color:#a5b8ff;text-underline-offset:4px}h1{font-size:26px;line-height:1.35;color:var(--color-text-strong)}h2{font-size:19px;color:var(--color-text-strong)}h3{font-size:18px}p{margin:8px 0 18px;max-width:72ch}small,.hint,.heading p{color:#adb4cc}.hint{font-size:13px}
button,input,select,textarea{font:inherit;border:1px solid var(--color-border);border-radius:8px;min-height:44px;background:var(--color-raised);color:var(--color-text);padding:9px 13px}button{cursor:pointer}button:hover{background:var(--color-hover);border-color:var(--color-primary)}button:disabled{opacity:.55;cursor:wait}input,select,textarea{width:100%;caret-color:var(--color-primary)}textarea{resize:vertical}input::placeholder{color:#a3abc3}:is(button,input,select,textarea,a,summary):focus-visible{outline:2px solid #a5b8ff;outline-offset:3px}::selection{background:#3554a3;color:white}.primary{background:#334da1;color:white;border-color:#647fe0;font-weight:600}.primary:hover{background:#405db5}
label{display:grid;gap:7px;font-size:14px}form{display:grid;gap:22px}.login-area{max-width:430px;margin:clamp(40px,10vh,110px) auto;padding:0 24px}.login-area form{margin:30px 0 20px}.login-area h1{font-size:28px}.login-area>p{color:#adb4cc}
nav{display:flex;flex-wrap:wrap;gap:8px;max-width:1120px;margin:auto;padding:24px 0 0}nav button{background:transparent;border-color:transparent}nav [aria-current]{background:var(--color-primary-selected);border-color:var(--color-primary);color:white}.admin-content{max-width:1120px;margin:auto;padding:32px 0 64px}.heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:22px}.heading p{margin-bottom:0}.toolbar{display:flex;align-items:end;gap:16px;margin:24px 0}.search{flex:1}.toolbar>label:not(.search){width:150px}.filter{max-width:220px;margin:24px 0}.error{color:#ffaaaa}.success{color:#85daa5}.empty{padding:36px 0;color:#adb4cc}
.route-list>button{display:flex;width:100%;align-items:center;gap:18px;text-align:left;border:0;border-bottom:1px solid var(--color-line);border-radius:0;background:none;padding:18px 4px}.route-list>button:hover{background:var(--color-hover)}.route-list>button>span:first-child{flex:1}.route-list strong,.route-list small{display:block}.badge{font-size:12px;padding:4px 9px;border-radius:5px;background:var(--color-hover);white-space:nowrap}.badge[data-status=published]{color:#85daa5}.badge[data-status=draft]{color:#e4ca78}
.editor,.submission,.data-status{padding:26px;background:var(--color-surface);border-radius:12px;margin:24px 0}.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.wide{grid-column:1/-1}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}.diff{margin:24px 0}.diff dt{margin-top:16px;font-weight:600}.diff dd{display:grid;grid-template-columns:1fr 1fr;gap:16px;white-space:pre-wrap}.diff del{color:#e5a6a6}.diff ins{color:#a5dbb9;text-decoration:none}.preview-note{white-space:pre-wrap}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.7 system-ui;max-height:340px;overflow:auto;margin:16px 0}.submission-fields{display:grid;grid-template-columns:110px 1fr;gap:12px;margin-block:20px}.submission-fields dt{color:#adb4cc}.submission-fields dd{white-space:pre-wrap}.audit{padding:20px 0;border-bottom:1px solid var(--color-line)}summary{cursor:pointer;color:#a5b8ff}.data-status dd{margin-bottom:14px;font-variant-numeric:tabular-nums}.data-status dt{color:#adb4cc}
@media(max-width:1180px){nav,.admin-content{margin-inline:24px}}@media(max-width:600px){.admin-header{gap:10px;padding:16px}.admin-header>span{display:none}nav{margin-inline:12px;gap:2px}nav button{padding:9px 12px;flex:1}.admin-content{margin-inline:16px;padding-top:24px}h1{font-size:23px}.heading{align-items:start;gap:12px}.heading>button{flex-shrink:0}.toolbar{flex-wrap:wrap;gap:12px}.toolbar>label:not(.search){width:calc(50% - 6px)}.toolbar .search{order:-1;flex-basis:100%}.toolbar>button{width:100%}.field-grid{grid-template-columns:1fr}.editor,.submission,.data-status{padding:18px}.diff dd{grid-template-columns:1fr;gap:6px}.route-list>button{gap:10px}.actions>button{flex:1}.login-area{margin-top:50px}}
</style>
