// node tests/search-country.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { ref, computed, nextTick } from 'vue'

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8')
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end))
const route = (id, name, extra = {}) => ({ id, name, gps: '-43, 170', grading: 'V3 A2 III', max_drop: '30m', ...extra })
const context = {
  ref, computed,
  browseMode: ref('search'), hydrologyCountry: ref('tw'), searchQuery: ref(''),
  searchTypes: ref(['route', 'water', 'rainfall']), selectedRegion: ref([]),
  routeFilter: ref({ v: '', a: '', t: '', drop: '' }), filterGpx: ref(false), routeSortDescending: ref(false),
  canyonRoutes: ref([route('tw', '台灣溪', { region: '北部' })]),
  nzRoutes: ref([route('nz', 'Fox Canyon', { name_zh: '冰河峽谷', region: 'Westland', river: 'Fox River', gpx_track: 'track' }), route('unknown', 'Unknown', { max_drop: '' })]),
  waterStations: [{ id: 'tw-w', name: '台灣水位', river: '溪', address: '北部' }],
  nzWaterStations: [{ id: 'nz-w', name: 'Fox Water', river: 'Fox River', address: 'New Zealand' }],
  rainfallStations: [{ station_id: 'tw-r', name: '台灣雨量', county: '北部', town: '' }],
  nzRainfallStations: [{ station_id: 'nz-r', name: 'Fox Rain', county: 'NZ', town: 'Westland' }],
  REGION_KEYWORDS: { 北部: ['北部'] },
}
const code = [section('function normalize(', 'const sidebarRoutes ='), section('function matchRegion(', 'const selectedRouteId ='), section('function parseMeters(', 'type SearchSuggestion =')].join('\n')
vm.runInNewContext(ts.transpile(code) + '\nglobalThis.result = { filteredRoutes, stationSearch };', context)
const { filteredRoutes, stationSearch } = context.result
assert.equal(filteredRoutes.value[0].id, 'tw')
assert.equal(stationSearch.value.water[0].id, 'tw-w')
context.hydrologyCountry.value = 'nz'
context.searchQuery.value = 'fOx'
assert.equal(filteredRoutes.value[0].id, 'nz')
assert.equal(stationSearch.value.water[0].id, 'nz-w')
assert.equal(stationSearch.value.rainfall[0].station_id, 'nz-r')
context.searchQuery.value = '冰河'
assert.equal(filteredRoutes.value.length, 1)
context.searchQuery.value = 'Westland'
assert.equal(filteredRoutes.value.length, 1)
assert.equal(stationSearch.value.rainfall.length, 1)
context.searchQuery.value = ''
context.routeFilter.value.drop = '≤20'
assert.equal(filteredRoutes.value.length, 0, 'Missing drop is not a small drop')
context.routeFilter.value.drop = '21-40'
context.filterGpx.value = true
assert.equal(filteredRoutes.value.length, 1)
context.routeFilter.value.v = 'V4'
assert.equal(filteredRoutes.value.length, 0)
context.searchTypes.value = ['water']
assert.equal(filteredRoutes.value.length, 0)
assert.equal(stationSearch.value.rainfall.length, 0)
console.log('Country-scoped route and station search passed.')

// Exercise the real edit/cancel flow, including the country-specific filters.
let restoredView
Object.assign(context, {
  nextTick, activePanel: ref(null), selectedId: ref('selected'),
  mapRef: ref({ getView: () => 'original-map', setView: value => { restoredView = value }, focusSearchResults() {}, focusCountry() {} }),
  searchResultCount: computed(() => filteredRoutes.value.length),
})
vm.runInNewContext(ts.transpile(section('let searchSnapshot:', '// On phones') + section('function closeSearch()', 'async function confirmSearch()')) + '\nglobalThis.flow = { openSearch, changeSearchCountry, closeSearch };', context)
context.browseMode.value = 'nz'
context.searchQuery.value = 'Fox'
context.routeFilter.value.v = 'V3'
context.flow.openSearch()
assert.equal(context.browseMode.value, 'search')
assert.equal(context.hydrologyCountry.value, 'nz')
context.flow.changeSearchCountry('tw')
assert.equal(context.routeFilter.value.v, '')
assert.equal(context.filterGpx.value, false)
context.searchQuery.value = '台灣'
context.flow.closeSearch()
await nextTick()
assert.equal(context.browseMode.value, 'nz')
assert.equal(context.hydrologyCountry.value, 'nz')
assert.equal(context.searchQuery.value, 'Fox')
assert.equal(context.routeFilter.value.v, 'V3')
assert.equal(context.selectedId.value, 'selected')
assert.equal(restoredView, 'original-map')

context.URLSearchParams = URLSearchParams
context.location = { search: '?view=search&country=nz&q=Fox&type=route,rainfall&v=V3' }
const restore = section('  // Restore filter state from URL before loading', '  await fetchRoutes(true);')
vm.runInNewContext(ts.transpile(restore), context)
assert.equal(context.browseMode.value, 'search')
assert.equal(context.hydrologyCountry.value, 'nz')
assert.equal(context.searchQuery.value, 'Fox')
assert.equal(context.searchTypes.value.join(','), 'route,rainfall')
console.log('Search cancellation and NZ shared URL restoration passed.')
