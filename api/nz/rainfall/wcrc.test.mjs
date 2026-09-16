import assert from 'node:assert/strict'
import live from './[stationId].js'
import history from '../rainfall-history/[stationId].js'

const originalFetch = globalThis.fetch
const stationId = 'Haast Rv @ Moa Ck'
const pointTime = Date.now() - 86400000

globalThis.fetch = async url => ({
  ok: true,
  status: 200,
  text: async () => String(url).includes('map_rainfall')
    ? `var myLatlng1 = new google.maps.LatLng(-43.9,169.4); html: "<h3>Haast Rv at Moa Ck</h3><strong>Last Hour: </strong></td><td>1.5mm</td><strong>6 Hours: </strong></td><td>4.0mm</td><strong>24 Hours: </strong></td><td>8.5mm</td><strong>7 Days: </strong></td><td>20.0mm</td><strong>Last Sample: </strong></td><td>today</td><a href='?site=Haast%20Rv%20@%20Moa%20Ck&name=x'>"`
    : `var data = {"raindata":[{"x":${pointTime},"y":8.5}]};`,
})

function response() {
  return {
    code: 200,
    status(code) { this.code = code; return this },
    setHeader() {},
    json(body) { this.body = body; return this },
  }
}

try {
  const liveRes = response()
  await live({ query: { stationId } }, liveRes)
  assert.equal(liveRes.code, 200)
  assert.equal(liveRes.body.past24hr, 8.5)
  assert.equal(liveRes.body.past7days, 20)

  const historyRes = response()
  await history({ query: { stationId, days: '7' } }, historyRes)
  assert.equal(historyRes.code, 200)
  assert.equal(historyRes.body.total, 8.5)
  assert.equal(historyRes.body.daysIncluded, 1)
  console.log('WCRC rainfall checks passed.')
} finally {
  globalThis.fetch = originalFetch
}
