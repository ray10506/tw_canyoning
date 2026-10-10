<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type PocketBase from 'pocketbase'
import { summarize, type ApiSample } from '../lib/apiMetrics'
const props = defineProps<{ client: PocketBase }>()
type Sample = ApiSample & { received: string }
const samples = ref<Sample[]>([]), busy = ref(false), error = ref(''), truncated = ref(false)
const hours = ref('24'), environment = ref('production'), device = ref(''), country = ref(''), assets = ref(false)
const detailMode = ref('slow')
const selected = ref(''), sort = ref('wait'), loadedAt = ref('')
const names: Record<string,string> = {
  'cwa/rainfall':'台灣即時雨量','cwa/rainfall-history':'台灣歷史雨量','cwa/rainfall-map':'台灣累積雨量圖','cwa/rainfall-stations':'台灣雨量圖測站','cwa/qpf-grid':'台灣雨量預報',
  'nz/rainfall':'紐西蘭即時雨量','nz/rainfall-history':'紐西蘭歷史雨量','nz/water-level':'紐西蘭水位／流量',
  'pb/canyon_routes':'台灣路線清單','pb/nz_routes':'紐西蘭路線清單','pb/water_level_observations':'台灣水位歷史',
  'external/forecast':'天氣預報','external/elevation':'海拔查詢','external/water-level':'台灣即時水位',
  report:'問題／路線回報','routes/submit':'路線投稿','tiles/topographic':'地形圖磚','tiles/street':'街道圖磚','tiles/light':'清晰圖磚','tiles/satellite':'衛星圖磚','images/qpf':'雨量預報圖片',
}
const outcomes: Record<string,string> = {ok:'成功',http:'HTTP 錯誤',network:'網路／CORS 錯誤',timeout:'逾時',cancel:'取消',decode:'資料讀取／解析失敗',unknown:'狀態未知'}
const filtered = computed(() => samples.value.filter(s =>
  (!environment.value || s.environment === environment.value) && (!device.value || s.device === device.value) &&
  (assets.value ? /^(tiles|images)\//.test(s.endpoint) : !/^(tiles|images)\//.test(s.endpoint)) &&
  (!country.value || (country.value === 'nz' ? /^(nz\/|pb\/nz_routes)/.test(s.endpoint) : /^(cwa\/|pb\/canyon_routes|pb\/water_level|external\/water-level)/.test(s.endpoint)))
))
const groups = computed(() => summarize(filtered.value).sort((a,b) => sort.value === 'p95' ? (b.p95 ?? -1)-(a.p95 ?? -1) : sort.value === 'failure' ? b.failureRate-a.failureRate : b.wait-a.wait))
const detail = computed(() => filtered.value.filter(s => s.endpoint === selected.value))
const slow = computed(() => detailMode.value === 'errors'
  ? detail.value.filter(s => !['ok','unknown','cancel'].includes(s.outcome)).sort((a,b)=>b.received.localeCompare(a.received)).slice(0,20)
  : [...detail.value].filter(s => s.phase !== 'headers').sort((a,b) => b.duration-a.duration).slice(0,20))
const trend = computed(() => {
  const buckets = new Map<string,Sample[]>()
  for (const s of detail.value) { const key = s.received.slice(0,13); const rows = buckets.get(key) ?? []; rows.push(s); buckets.set(key,rows) }
  return [...buckets].sort(([a],[b])=>a.localeCompare(b)).map(([hour,rows])=>({hour,...summarize(rows)[0]}))
})
const ms = (value: number | null) => value === null ? '—' : value >= 1000 ? `${(value/1000).toFixed(2)} 秒` : `${Math.round(value)} ms`
const pct = (value: number | null) => value === null ? '未知' : `${(value*100).toFixed(1)}%`
const time = (value: string) => new Date(value.replace(' ', 'T')).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false})
async function load() {
  busy.value = true; error.value = ''; samples.value = []; truncated.value = false
  try {
    const cutoff = new Date(Date.now()-Number(hours.value)*3600000).toISOString().replace('T',' ')
    // Bounded download: never fetch an unbounded full metrics collection.
    for (let page=1; page<=4; page++) {
      const result = await props.client.collection('api_metrics').getList(page,500,{
        filter: props.client.filter('created >= {:cutoff}',{cutoff}),sort:'-created',fields:'id,created,events',
      })
      for (const batch of result.items) for (const s of batch.events ?? []) samples.value.push({...s,received:batch.created})
      truncated.value = result.totalPages > 4
      if (page>=result.totalPages) break
    }
    loadedAt.value = new Date().toISOString()
  } catch { samples.value=[]; error.value='無法載入效能資料。請確認登入仍有效，且 PocketBase 已安裝觀測資料表。' }
  finally { busy.value=false }
}
onMounted(load)
</script>
<template>
  <section class="performance">
    <header><div><h1>API 效能</h1><p>找出經常讓使用者等待的請求，再決定優化順序。</p></div><button :disabled="busy" @click="load">{{busy?'載入中…':'重新整理'}}</button></header>
    <div class="filters"><label>時間範圍<select v-model="hours" :disabled="busy" @change="load"><option value="1">近一小時</option><option value="24">近一天</option><option value="168">近七天</option></select></label><label>環境<select v-model="environment"><option value="production">正式</option><option value="test">測試</option><option value="">全部</option></select></label><label>裝置<select v-model="device"><option value="">全部</option><option value="mobile">手機</option><option value="tablet">平板</option><option value="desktop">桌機</option></select></label><label>功能地區<select v-model="country"><option value="">全部（含共用功能）</option><option value="tw">台灣專用</option><option value="nz">紐西蘭專用</option></select></label><label>排序<select v-model="sort"><option value="wait">累積等待時間</option><option value="p95">P95 最慢</option><option value="failure">失敗率最高</option></select></label></div>
    <label class="asset-toggle"><input v-model="assets" type="checkbox">查看圖磚與圖片（與 API 分開）</label>
    <details class="reading"><summary>如何判讀這些數據</summary><p class="muted">P50 是中間值；P95 代表 95% 的完整資料讀取在此時間內完成。包含下載及解析，不含畫面繪製；取消請求不算失敗。用戶端資料可能遭封鎖、遺失或偽造，不代表全部流量。</p></details>
    <p v-if="error" role="alert" class="warning">{{error}}</p><p v-if="truncated" class="warning">此範圍超過 2,000 批，以下僅統計最近 2,000 批樣本，請縮短時間範圍。</p>
    <p v-if="loadedAt" class="muted">更新：{{time(loadedAt)}}（台灣時間） · {{filtered.length}} 筆樣本。</p>
    <div v-if="groups.length" class="table-wrap"><table><thead><tr><th>API／功能</th><th>請求數</th><th>P50</th><th>P95</th><th>失敗率</th><th>快取命中</th></tr></thead><tbody><tr v-for="row in groups" :key="row.endpoint" :class="{selected: selected===row.endpoint}"><td><button class="endpoint" @click="selected=row.endpoint">{{names[row.endpoint] || row.endpoint}}</button><small>{{row.endpoint}}</small></td><td>{{row.count}}<small>{{row.measured}} 筆完整計時</small></td><td>{{ms(row.p50)}}</td><td>{{ms(row.p95)}}</td><td>{{row.unknown===row.count?'未知':pct(row.failureRate)}}<small v-if="row.unknown">{{row.unknown}} 筆狀態未知</small></td><td>{{pct(row.cache)}}</td></tr></tbody></table></div>
    <p v-else-if="!busy && !error" class="empty">這個範圍還沒有觀測資料。啟用收集後，操作路線、雨量或水位功能即可累積樣本；也可以切換環境與篩選條件。</p>
    <section v-if="detail.length" class="details"><header><h2>{{names[selected] || selected}}</h2><button @click="selected=''">收合明細</button></header><h3>每小時 P95 趨勢</h3><p class="muted">依收到樣本的時間分組（台灣時間），非精確的請求發生時間。</p><div class="trend"><div v-for="point in trend" :key="point.hour"><span>{{time(point.hour+':00:00Z')}}</span><meter :value="point.p95 ?? 0" :max="Math.max(...trend.map(p=>p.p95 ?? 0),1)" :aria-label="`${point.hour} P95`"/><strong>{{ms(point.p95)}}</strong></div></div>
      <h3>請求明細</h3><label class="detail-filter">顯示<select v-model="detailMode"><option value="slow">最慢 20 筆</option><option value="errors">最近 20 筆失敗</option></select></label><p class="muted">伺服器時間到送出回應為止；上游為各次讀取累計，平行請求可能大於伺服器總時間。命中 CDN 時，伺服器與上游時間屬於產生快取當時。未知值不會當作 0。</p><div class="table-wrap"><table><thead><tr><th>收到時間</th><th>資料完成</th><th>標頭抵達</th><th>伺服器</th><th>上游累計</th><th>結果</th><th>回應大小*</th></tr></thead><tbody><tr v-for="(sample,i) in slow" :key="i"><td>{{time(sample.received)}}</td><td>{{ms(sample.duration)}}</td><td>{{sample.status ? ms(sample.headers) : '—'}}</td><td>{{ms(sample.server)}}</td><td>{{ms(sample.upstream)}}</td><td>{{outcomes[sample.outcome]}} {{sample.status || ''}}</td><td>{{sample.bytes===null?'未知':`${(sample.bytes/1024).toFixed(1)} KB`}}</td></tr></tbody></table></div><p v-if="!slow.length" class="muted">目前沒有符合的請求。</p><p class="muted">* 依 Content-Length 或瀏覽器提供的傳輸大小；跨站限制可能無法取得。失敗請求顯示的是失敗前等待時間。</p>
    </section>
  </section>
</template>
<style scoped>
.performance{color:var(--color-text)}h1{font-size:26px;color:var(--color-text-strong)}h2{font-size:20px}h3{font-size:16px;margin-top:28px}p{margin:10px 0 20px;max-width:75ch;line-height:1.6}header{display:flex;justify-content:space-between;align-items:start;gap:16px}.filters{display:flex;gap:14px;flex-wrap:wrap;margin:24px 0}label{display:grid;gap:7px;font-size:14px}.filters label{flex:1;min-width:140px}button,select{font:inherit;min-height:44px;padding:9px 12px;border:1px solid var(--color-border);border-radius:8px;background:var(--color-raised);color:var(--color-text)}button{cursor:pointer}button:hover{border-color:var(--color-primary)}button:disabled{opacity:.6;cursor:wait}button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid var(--color-primary);outline-offset:3px}.asset-toggle{display:flex;align-items:center;min-height:44px;gap:10px}.asset-toggle input{width:18px;height:18px;accent-color:var(--color-primary)}.reading{margin:14px 0}.reading summary{cursor:pointer;color:#a5b8ff;min-height:44px;display:flex;align-items:center}.detail-filter{max-width:220px;margin-top:16px}.muted,small{color:#adb4cc}.warning{color:#ffb2a8}.empty{padding:32px 0}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;text-align:left}th{font-size:13px;color:#adb4cc;white-space:nowrap;font-weight:500}td,th{padding:14px 12px;border-bottom:1px solid var(--color-line)}td{white-space:nowrap}td:first-child{white-space:normal;min-width:190px}small{display:block;font-size:12px}.endpoint{padding:0;border:0;background:none;text-align:left;color:#a5b8ff}.selected{background:var(--color-primary-selected)}.details{margin-top:36px;border-top:1px solid var(--color-border);padding-top:24px}.trend{max-height:320px;overflow:auto;margin:16px 0}.trend>div{display:grid;grid-template-columns:185px 1fr 90px;align-items:center;gap:14px;padding:8px 0;font-size:13px}meter{width:100%;height:16px;accent-color:var(--color-primary)}@media(max-width:600px){h1{font-size:23px}.filters{gap:10px}.filters label{min-width:calc(50% - 10px)}header>button{flex-shrink:0}.trend>div{grid-template-columns:1fr 1fr;gap:6px}.trend>div>span{grid-column:1/-1}}
</style>
