import assert from 'node:assert/strict'
import history from '../../../api/cwa/rainfall-history/[stationId].js'

const originalFetch = globalThis.fetch
let listCalls = 0
let dayCode = 200
let empty = false
const queries = []
const response = () => ({
  code: 200,
  status(code) { this.code = code; return this },
  setHeader() {},
  json(body) { this.body = body; return this },
})
globalThis.fetch = async (url, options) => {
  if (url.endsWith('station_list')) {
    listCalls++
    return { ok: true, json: async () => ({ code: 200, data: [
      { stationAttribute: 'agr', item: [{ stationID: 'C2UC30' }, { stationID: 'CA0001' }] },
      { stationAttribute: 'auto', item: [{ stationID: 'CA0002' }, { stationID: 'C10001' }] },
      { stationAttribute: 'cwb', item: [{ stationID: '466920' }] },
    ] }) }
  }
  const body = options.body
  queries.push(Object.fromEntries(body))
  const start = new Date(body.get('start') + '+08:00')
  const values = empty ? [] : [0, 0.5, 42, 13.5, null, '', false]
  return { ok: true, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ day: {
    code: dayCode,
    data: [{ dts: values.map((value, index) => ({
      DataDate: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' }).format(new Date(+start + index * 86400000)),
      Precipitation: { Accumulation: value },
    })) }],
  } }) }
}
try {
  for (const [stationId, expected] of [['C2UC30', 'agr'], ['CA0001', 'agr'], ['CA0002', 'auto_C0'], ['C10001', 'auto_C1'], ['466920', 'cwb']]) {
    const res = response()
    await history({ query: { stationId, days: 7 } }, res)
    assert.equal(res.code, 200)
    assert.equal(queries.at(-1).stn_type, expected)
    assert.equal(res.body.total, 56)
    assert.equal(res.body.daysIncluded, 4)
    assert.deepEqual(res.body.daily.map(d => d.value), [0, 0.5, 42, 13.5, null, null, null])
    assert.equal(queries.at(-1).end, res.body.to + 'T23:59:59')
  }
  assert.equal(listCalls, 1, 'Official station categories are cached')
  dayCode = 404
  const failed = response()
  await history({ query: { stationId: 'C2UC30', days: 7 } }, failed)
  assert.equal(failed.code, 502, 'Invalid upstream query must not be reported as missing observations')
  dayCode = 200
  empty = true
  const missing = response()
  await history({ query: { stationId: 'C2UC30', days: 14 } }, missing)
  assert.equal(missing.code, 404)
  console.log('CODiS category mapping, missing readings and upstream error checks passed.')
} finally {
  globalThis.fetch = originalFetch
}
