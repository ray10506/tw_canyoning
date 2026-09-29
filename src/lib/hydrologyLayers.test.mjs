// Run: node src/lib/hydrologyLayers.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { computed, reactive, ref, watch } from 'vue'

const source = readFileSync(new URL('../components/Map.vue', import.meta.url), 'utf8')
const code = source.slice(source.indexOf('const nzCountry ='), source.indexOf('const routeWaterStations ='))
const stored = new Map()
const storage = { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) }
function mount(localStorage = storage) {
  const props = reactive({ nzMode: false, nearbyAnchor: null, stationSearch: null, hydrologyMode: false })
  const context = { computed, ref, watch, props, localStorage }
  vm.runInNewContext(ts.transpile(code) + '\nglobalThis.layers = { water: showWaterStations, rain: showRainfallStations, routes: showLocationMarkers };', context)
  return { props, ...context.layers }
}

const state = mount()
assert.equal(state.water.value, false)
assert.equal(state.rain.value, false)
state.props.nzMode = true
assert.equal(state.water.value, false)
assert.equal(state.rain.value, false)
state.water.value = true
state.props.nzMode = false
assert.equal(state.water.value, false, 'NZ choice must not enable Taiwan stations')
state.rain.value = true
state.props.nzMode = true
assert.equal(state.water.value, true)
assert.equal(state.rain.value, false)
state.props.nearbyAnchor = { lat: -43, lon: 170 }
assert.equal(state.rain.value, false, 'Opening a route must not enable rainfall')
state.props.nearbyAnchor = null
state.props.hydrologyMode = true
state.props.stationSearch = { water: [{}], rainfall: [{}] }
assert.equal(state.water.value, true)
assert.equal(state.rain.value, true, 'Hydrology opens both station layers')
assert.equal(state.routes.value, false, 'Hydrology hides route markers')
state.water.value = false
state.rain.value = false
state.routes.value = true
assert.equal(state.water.value, false, 'Temporary toggles remain usable')
assert.equal(state.rain.value, false)
assert.equal(state.routes.value, true)
state.props.hydrologyMode = false
assert.equal(state.rain.value, true, 'Explicit search shows matching stations')
state.props.stationSearch = null
assert.equal(state.rain.value, false, 'Search must not overwrite preferences')
assert.equal(state.water.value, true, 'Restore the original NZ water preference')
assert.equal(state.routes.value, true, 'Restore the original route preference')
state.routes.value = false
state.props.hydrologyMode = true
assert.equal(state.water.value, true, 'Reentering hydrology resets temporary choices')
assert.equal(state.rain.value, true)
assert.equal(state.routes.value, false)
state.routes.value = true
state.props.nzMode = false
assert.equal(state.water.value, true, 'Country switching stays in hydrology view')
state.props.hydrologyMode = false
assert.equal(state.routes.value, false, 'An originally hidden route layer stays hidden')
assert.equal(state.water.value, false, 'Restore Taiwan preferences when returning to TW')
assert.equal(state.rain.value, true)
const restored = mount()
assert.equal(restored.rain.value, true)
assert.equal(restored.water.value, false)
restored.props.nzMode = true
assert.equal(restored.water.value, true)
assert.equal(restored.rain.value, false)
const blocked = mount({ getItem() { throw Error('blocked') }, setItem() { throw Error('blocked') } })
assert.equal(blocked.water.value, false)
blocked.water.value = true
assert.equal(blocked.water.value, true)
console.log('Hydrology country, layer preferences, and search checks passed.')
