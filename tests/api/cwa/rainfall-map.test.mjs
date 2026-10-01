import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { parseRainfallKmz } from '../../../api/cwa/rainfall-map.js'
import { maxRainIndex, sourceRow } from '../../../src/lib/rainfallMap.ts'

const zip = new JSZip()
zip.file('doc.kml', '<kml><Document><name>2026-09-29_1500_當日累積雨量</name></Document></kml>')
zip.file('0/0/0.kml', '<GroundOverlay><LatLonBox><north>25.918078</north><south>21.523313</south><east>123.578233</east><west>119.188024</west></LatLonBox></GroundOverlay>')
zip.file('0/0/0.png', 'png')
const parsed = await parseRainfallKmz(await zip.generateAsync({ type: 'nodebuffer' }))
assert.equal(parsed.from, '2026-09-29T00:00:00+08:00')
assert.equal(parsed.observedAt, '2026-09-29T15:00:00+08:00')
assert.deepEqual(parsed.bounds, { north: 25.918078, south: 21.523313, east: 123.578233, west: 119.188024 })
assert.ok(parsed.image.startsWith('data:image/png;base64,'))

zip.file('doc.kml', '<kml><Document><name>2026-10-01_0000_當日累積雨量</name></Document></kml>')
const midnight = await parseRainfallKmz(await zip.generateAsync({ type: 'nodebuffer' }))
assert.equal(midnight.from, '2026-09-30T00:00:00+08:00', '00:00 issue covers the previous full day')
assert.equal(midnight.observedAt, '2026-10-01T00:00:00+08:00')

zip.file('doc.kml', '<kml><Document><name>broken</name></Document></kml>')
await assert.rejects(parseRainfallKmz(await zip.generateAsync({ type: 'nodebuffer' })))

// Edges map to edges; Mercator's middle row sits north of the lat/lon middle (~2 km for Taiwan).
assert.equal(sourceRow(0, 880, 25.918078, 21.523313), 0)
assert.equal(sourceRow(879, 880, 25.918078, 21.523313), 879)
assert.equal(sourceRow(440, 880, 25.918078, 21.523313), 436)
assert.equal(maxRainIndex(new Uint8ClampedArray([0, 0, 0, 0, 255, 255, 255, 0])), -1, 'transparent = no rain')
assert.equal(maxRainIndex(new Uint8ClampedArray([193, 193, 193, 255, 152, 254, 255, 255])), 1, 'near colours still match')
assert.equal(maxRainIndex(new Uint8ClampedArray([153, 255, 255, 255, 255, 204, 255, 255])), 16)
console.log('rainfall-map ok')
