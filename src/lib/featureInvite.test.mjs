// Run: node src/lib/featureInvite.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { ref } from 'vue'

const source = readFileSync(new URL('../App.vue', import.meta.url), 'utf8')
const code = source.slice(source.indexOf('const settingsInitialView ='), source.indexOf('const mapRef ='))
const values = new Map()
const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }
function mount(localStorage = storage) {
  const context = { ref, localStorage, activePanel: ref(null) }
  vm.runInNewContext(ts.transpile(code) + '\nglobalThis.result = { showFeatureInvite, settingsInitialView, dismissFeatureInvite, openWebsiteFeatures };', context)
  return { ...context.result, activePanel: context.activePanel }
}
const first = mount()
assert.equal(first.showFeatureInvite.value, true)
assert.equal(first.activePanel.value, null, 'First visit must not open the whole panel')
first.dismissFeatureInvite()
assert.equal(first.showFeatureInvite.value, false)
assert.equal(mount().showFeatureInvite.value, false, 'Dismissal survives reload')
values.clear()
const opened = mount()
opened.openWebsiteFeatures()
assert.equal(opened.settingsInitialView.value, 'features')
assert.equal(opened.activePanel.value, 'settings')
assert.equal(mount().showFeatureInvite.value, false, 'Reading features counts as seen')
const blocked = mount({ getItem() { throw Error('blocked') }, setItem() { throw Error('blocked') } })
blocked.dismissFeatureInvite()
assert.equal(blocked.showFeatureInvite.value, false)
console.log('Feature invitation checks passed.')
