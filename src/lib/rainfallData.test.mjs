// Run with: node src/lib/rainfallData.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { fetchRainfallData, rainfallStatus } from './rainfallData.ts'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const detail = read('../components/RainfallStationDetail.vue')
const route = read('../components/RouteDetail.vue')
const context = {
  computed: fn => ({ get value() { return fn() } }),
  rainfallStatus,
  data: { value: null }, locale: { value: 'zh' }, rainfallReading: { value: null }, rainfallFetchFailed: { value: false },
}
vm.runInNewContext(ts.transpile(
  detail.slice(detail.indexOf('const rainItems ='), detail.indexOf('const currentHistory =')) +
  route.slice(route.indexOf('const rainfallSummary ='), route.indexOf('const title =')) +
  '\nglobalThis.result = { rainItems, rainStatus, rainfallSummary };'
), context)

const keys = ['Past10Min', 'Past1hr', 'Past3hr', 'Past6hr', 'Past12hr', 'Past24hr', 'Past2days', 'Past3days']
const originalFetch = globalThis.fetch
let elements
globalThis.fetch = async () => ({ ok: true, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ records: { Station: [{ RainfallElement: elements }] } }) })
try {
  for (const raw of [-99, '-998', -0.1, null, undefined, '', 'invalid', 'Infinity', 0, '0', '12.34']) {
    elements = Object.fromEntries(keys.map(key => [key, { Precipitation: raw }]))
    const data = await fetchRainfallData('test')
    const expected = raw === '12.34' ? 12.3 : raw === 0 || raw === '0' ? 0 : null
    for (const key of keys) assert.equal(data[key.toLowerCase()], expected)
    context.data.value = data
    context.rainfallReading.value = data
    assert.equal(context.result.rainStatus.value.tone, expected == null ? 'muted' : 'normal')
    for (const item of context.result.rainItems.value) assert.equal(item.value, `${expected ?? '—'} mm`)
    if (expected == null) {
      assert.match(context.result.rainStatus.value.title, /暫無法評估/)
      assert.match(context.result.rainfallSummary.value.text, /近期沒有讀數/)
    }
  }
  for (elements of [undefined, {}, { Past24hr: {} }]) {
    const data = await fetchRainfallData('test')
    for (const key of keys) assert.equal(data[key.toLowerCase()], null)
  }
  elements = Object.fromEntries(keys.map(key => [key, { Precipitation: 0 }]))
  const dry = await fetchRainfallData('test')
  for (const key of ['past1hr', 'past3hr', 'past24hr', 'past3days']) {
    assert.equal(rainfallStatus({ ...dry, [key]: null }).tone, 'muted', key)
  }
  for (const [key, value, tone] of [['past24hr', 200, 'danger'], ['past3hr', 100, 'danger'], ['past24hr', 80, 'warning'], ['past1hr', 40, 'warning'], ['past3days', 40, 'watch'], ['past24hr', 1, 'normal'], ['past24hr', 0, 'normal']]) {
    assert.equal(rainfallStatus({ ...dry, [key]: value }).tone, tone, `${key}=${value}`)
  }
  // Stale readings never earn a verdict.
  assert.equal(rainfallStatus({ ...dry, observedAt: new Date(Date.now() - 4 * 3600000).toISOString() }).tone, 'muted')
  // The route strip and the station card must agree: same tone, same title.
  for (const reading of [{ ...dry, past24hr: 5, past3days: 10 }, { ...dry, past24hr: 90 }, { ...dry, past3days: 45 }, dry]) {
    context.rainfallReading.value = reading
    const status = rainfallStatus(reading)
    assert.equal(context.result.rainfallSummary.value.tone, status.tone)
    assert.ok(context.result.rainfallSummary.value.text.startsWith(status.title))
  }
  assert.match(detail, /data\.past24hr \?\? '—'/)
  assert.match(detail, /data\.past3days \?\? '—'/)
  console.log('Rainfall null preservation, shared assessment, display and strip/card agreement checks passed.')
} finally {
  globalThis.fetch = originalFetch
}
