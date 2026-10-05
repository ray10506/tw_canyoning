import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { parseRainfallKmz, parseRainfallStations } from '../../../api/cwa/rainfall-map.js'
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

// 48/72 h station layer: WGS84 coords, invalid readings → null, gauges >3 h behind the newest are dropped (offline gauges keep old totals).
const stationsJson = { cwaopendata: { dataset: { Station: [{"StationName":"A","StationId":"A","ObsTime":{"DateTime":"2026-10-04T14:50:00+08:00"},"GeoInfo":{"Coordinates":[{"CoordinateName":"TWD67","StationLatitude":"0","StationLongitude":"0"},{"CoordinateName":"WGS84","StationLatitude":"24.1","StationLongitude":"121.2"}]},"RainfallElement":{"Past2days":{"Precipitation":"12.34"},"Past3days":{"Precipitation":"40"}}},{"StationName":"B","StationId":"B","ObsTime":{"DateTime":"2026-10-04T13:00:00+08:00"},"GeoInfo":{"Coordinates":[{"CoordinateName":"TWD67","StationLatitude":"0","StationLongitude":"0"},{"CoordinateName":"WGS84","StationLatitude":"24.1","StationLongitude":"121.2"}]},"RainfallElement":{"Past2days":{"Precipitation":"-998"},"Past3days":{"Precipitation":"0"}}},{"StationName":"Old","StationId":"Old","ObsTime":{"DateTime":"2026-10-04T10:00:00+08:00"},"GeoInfo":{"Coordinates":[{"CoordinateName":"TWD67","StationLatitude":"0","StationLongitude":"0"},{"CoordinateName":"WGS84","StationLatitude":"24.1","StationLongitude":"121.2"}]},"RainfallElement":{"Past2days":{"Precipitation":"500"},"Past3days":{"Precipitation":"500"}}},{"StationName":"NoGeo","StationId":"NoGeo","ObsTime":{"DateTime":"2026-10-04T14:50:00+08:00"},"GeoInfo":{"Coordinates":[{"CoordinateName":"TWD67","StationLatitude":"0","StationLongitude":"0"},{"CoordinateName":"WGS84","StationLatitude":"","StationLongitude":"121.2"}]},"RainfallElement":{"Past2days":{"Precipitation":"1"},"Past3days":{"Precipitation":"1"}}}] } } }
const rain = parseRainfallStations(stationsJson)
assert.equal(rain.observedAt, '2026-10-04T14:50:00+08:00')
assert.deepEqual(rain.stations, [['A', 24.1, 121.2, 12.3, 40], ['B', 24.1, 121.2, null, 0]])
assert.throws(() => parseRainfallStations({}))
// Interpolated 48 / 72 h field: CWA's 67×120 grid, sea null, a gauge inside a cell keeps its measured value.
const { interpolateRainGrid, GRID_BOUNDS } = await import('../../../api/cwa/rainfall-map.js')
const cell = (row, col) => [21.88 + row * 0.03, 120 + col * 0.03]
const [yushanLat, yushanLon] = cell(53, 32) // land (玉山 area)
const gauges = [['Wet', yushanLat, yushanLon, 100, 200], ['Dry', yushanLat + 0.3, yushanLon, 0, 0], ['Off', yushanLat, yushanLon + 0.3, null, null]]
const field = interpolateRainGrid(gauges, 4)
assert.equal(field.values.length, 67 * 120)
assert.equal(field.max, 200, 'max is the wettest gauge, null readings ignored')
assert.equal(field.values[53 * 67 + 32], 200, 'cell holding a gauge = measured value')
assert.equal(field.values[0], null, 'south-west corner is sea')
const between = field.values[58 * 67 + 32] // halfway between Wet and Dry
assert.ok(between > 0 && between < 200, `between gauges is a weighted mix, got ${between}`)
assert.deepEqual(interpolateRainGrid([['A', 24, 121, null, null]], 4).values.filter(v => v != null), [], 'no readings → empty field')
assert.ok(Math.abs(GRID_BOUNDS.north - 25.465) < 1e-9 && Math.abs(GRID_BOUNDS.west - 119.985) < 1e-9)
console.log('rainfall station layer checks passed')
