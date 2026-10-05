// Run with: node src/lib/forecast.test.mjs
import assert from 'node:assert/strict'
import { fetchForecast, forecastRainNote } from './forecast.ts'

const day = (date, rain, code = 95) => ({ date, code, max: null, min: null, rain, gust: null })
const week = [day('2026-09-30', 0.5, 51), day('2026-10-01', null), day('2026-10-02', 15.8), day('2026-10-03', 40), day('2026-10-04', 12)]

const quiet = { text: '', watch: false }
assert.deepEqual(forecastRainNote([]), quiet)
assert.deepEqual(forecastRainNote([day('2026-09-30', 9.9)]), quiet)
// Only the first three days count; missing rain is not heavy rain. Thunderstorms ≥10 mm raise the watch.
const caveat = ' · 下方為目前觀測，不代表預報日水況'
assert.deepEqual(forecastRainNote(week, true), { text: `三日內預報：10/2 雷雨 15.8 mm${caveat}`, watch: true })
assert.deepEqual(forecastRainNote([day('2026-09-30', 10), day('2026-10-01', 22.25, 63)], true), { text: `三日內預報：9/30 雷雨 10 mm、10/1 下雨 22.3 mm${caveat}`, watch: true })
// Plain rain stays a muted fact until 50 mm.
assert.deepEqual(forecastRainNote([day('2026-09-30', 49.9, 63)]), { text: '三日內預報：9/30 下雨 49.9 mm', watch: false })
assert.equal(forecastRainNote([day('2026-09-30', 50, 63)]).watch, true)
// Without an observation strip below, the watch note carries no caveat.
assert.deepEqual(forecastRainNote(week), { text: '三日內預報：10/2 雷雨 15.8 mm', watch: true })
console.log('Forecast rain note checks passed.')

const originalFetch = globalThis.fetch
let calls = 0
let respond
globalThis.fetch = () => {
  calls++
  return new Promise(resolve => { respond = resolve })
}
try {
  const first = fetchForecast('25,121')
  assert.equal(fetchForecast('25.0,121.0'), first)
  assert.equal(calls, 1, 'Concurrent requests share one fetch')
  respond({ ok: true, json: async () => ({ daily: { time: ['2026-09-30'] } }) })
  assert.equal((await first)[0].date, '2026-09-30')

  const next = fetchForecast('25,121')
  assert.notEqual(next, first)
  assert.equal(fetchForecast('25,121'), next)
  assert.equal(calls, 2, 'A completed forecast is fetched again on the next visit')
  respond({ ok: true, json: async () => ({ daily: { time: ['2026-10-01'] } }) })
  assert.equal((await next)[0].date, '2026-10-01')

  const failed = fetchForecast('25,121')
  respond({ ok: false })
  await assert.rejects(failed)
  const retry = fetchForecast('25,121')
  assert.equal(calls, 4, 'Failed requests can be retried')
  respond({ ok: true, json: async () => ({ daily: { time: [] } }) })
  assert.deepEqual(await retry, [])
} finally {
  globalThis.fetch = originalFetch
}
console.log('Forecast request cache checks passed.')
