// node tests/api/nz/water-level/wcrc.test.mjs
import assert from 'node:assert/strict'
import handler, { nzTimestamp } from '../../../../api/nz/water-level/[stationId].js'
import rainfallHistory from '../../../../api/nz/rainfall-history/[stationId].js'
import stations from '../../../../src/data/nz-water-stations.json' with { type: 'json' }

const originalFetch = globalThis.fetch
const originalNow = Date.now
const now = Date.parse('2026-09-28T14:00:00Z') // NZ daylight saving has started.
const stationId = 'wcrc:Haast Rv @ Roaring Billy'
const x = now - 3600000
let url
let data
let calls = 0
let liveValue = '1.2m'
const liveHtml = () => `html: "<h3>Haast</h3><th>River Level</th><strong>Level: </strong></td><td>${liveValue}</td><strong>Last Sample: </strong></td><td>29-09-2026 2:00am</td><th>River Flow</th><strong>Flow Rate: </strong></td><td>90.8 m3/sec</td><strong>Last Sample: </strong></td><td>29-09-2026 1:00am</td><a href='?site=Haast%20Rv%20@%20Roaring%20Billy&name=Haast'>source</a>"`
const response = () => ({
  code: 200,
  headers: {},
  status(code) { this.code = code; return this },
  setHeader(key, value) { this.headers[key] = value },
  json(body) { this.body = body; return this },
})
async function run(query = {}, method = 'GET') {
  const res = response()
  await handler({ method, query: { stationId, ...query } }, res)
  return res
}
try {
  Date.now = () => now
  globalThis.fetch = async input => {
    calls++
    url = new URL(input)
    return { ok: true, json: async () => data, text: async () => liveHtml() }
  }
  const values = [0, -0.186, '1.25', null, '', ' ', false, [], {}, 'invalid', 'Infinity']
  data = { riversdata: values.map((y, index) => ({ x: x + index * 60000, y, name: 'River Level' })) }
  data.riversdata.push({ x: null, y: 999, name: 'River Level' }, { x: now + 1, y: 999, name: 'River Level' })
  const history = await run({ days: '7' })
  assert.equal(history.code, 200)
  assert.deepEqual(history.body.points.map(p => p.value), [0, -0.186, 1.25, ...Array(8).fill(null)])
  assert.equal(url.searchParams.get('type'), 'Level')
  assert.equal(url.searchParams.get('site'), 'Haast Rv @ Roaring Billy')
  assert.equal(url.searchParams.get('stdate'), '2026-09-22')
  assert.equal(url.searchParams.get('endate'), '2026-09-30')
  assert.equal(history.body.points[0].time, new Date(x).toISOString())
  assert.equal(nzTimestamp('29-09-2026 2:00am'), '2026-09-28T13:00:00.000Z')
  assert.equal(nzTimestamp('15-09-2026 2:00am'), '2026-09-14T14:00:00.000Z')
  assert.equal(nzTimestamp('not a date'), null)
  assert.equal((await run()).body.points[0].value, 1.2)
  assert.deepEqual((await run({ metric: 'flow' })).body.points[0], { time: '2026-09-28T12:00:00.000Z', value: 90.8 })
  liveValue = 'Comms issue; no new data'
  assert.equal((await run()).body.points[0].value, null)
  liveValue = '-0.186m'
  assert.equal((await run()).body.points[0].value, -0.186)
  liveValue = '0m'
  assert.equal((await run()).body.points[0].value, 0)

  data = { riversdata: [{ x, y: 12.5, name: 'River Flow' }, { x: x + 1, y: -1, name: 'River Flow' }] }
  assert.deepEqual((await run({ days: '14', metric: 'flow' })).body.points.map(p => p.value), [12.5, null])
  assert.equal(url.searchParams.get('type'), 'Flow')
  assert.equal((await run({ days: '7' })).code, 502) // Never label a flow series as water level.
  data = { riversdata: [] }
  assert.deepEqual((await run({ days: '7' })).body.points, [])
  data = {}
  assert.equal((await run({ days: '7' })).code, 502)
  const before = calls
  assert.equal((await run({ stationId: 'https://example.com/' })).code, 404)
  assert.equal((await run({ days: '90' })).code, 400)
  assert.equal((await run({ metric: 'other' })).code, 400)
  assert.equal((await run({ stationId: stations.find(s => !s.hasFlow).id, metric: 'flow' })).code, 404)
  assert.equal((await run({}, 'POST')).code, 405)
  assert.equal(calls, before)
  globalThis.fetch = async () => ({ ok: false, status: 503 })
  assert.equal((await run()).code, 502)

  // Rainfall regression: null, blank and invalid readings must not count as dry days.
  globalThis.fetch = async input => {
    const start = new URL(input).searchParams.get('stdate')
    const raindata = [8.5, 0, null, '', 'bad', 'Infinity', false].map((y, i) => ({
      x: Date.parse(`${start}T12:00:00+12:00`) + i * 86400000, y,
    }))
    return { ok: true, text: async () => `var data = ${JSON.stringify({ raindata })};` }
  }
  const rain = response()
  await rainfallHistory({ query: { stationId: 'Haast Rv @ Roaring Billy', days: '7' } }, rain)
  assert.equal(rain.body.daysIncluded, 2)
  assert.equal(rain.body.total, 8.5)
  assert.deepEqual(rain.body.daily.map(p => p.value), [8.5, 0, null, null, null, null, null])
  // Live rainfall: expose the observation instant for staleness checks; outages are a generic 502, never a pass-through 404.
  const rainLive = (await import('../../../../api/nz/rainfall/[stationId].js')).default
  const rainQuery = { query: { stationId: 'Haast Rv @ Roaring Billy' } }
  globalThis.fetch = async () => ({ ok: true, text: async () => "var myLatlng1 = 0; <h3>Haast</h3> site=Haast%20Rv%20@%20Roaring%20Billy&name=H <strong>24 Hours: </strong></td><td>12.5mm</td><strong>Last Sample: </strong></td><td>29-09-2026 2:00am</td>" })
  const live = response()
  await rainLive(rainQuery, live)
  assert.equal(live.body.past24hr, 12.5)
  assert.equal(live.body.observedAt, '2026-09-28T13:00:00.000Z')
  globalThis.fetch = async () => ({ ok: false, status: 404 })
  const down = response()
  await rainLive(rainQuery, down)
  assert.equal(down.code, 502)
  console.log('WCRC river and rainfall regression checks passed.')
} finally {
  globalThis.fetch = originalFetch
  Date.now = originalNow
}
