// Run after npm run build: lazy pages must preload their own stylesheet.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const html = readFileSync('dist/index.html', 'utf8')
const entry = html.match(/src="\/(assets\/[^" ]+\.js)"/)[1]
const js = readFileSync('dist/' + entry, 'utf8')
const dependencies = JSON.parse(js.match(/m\.f=(\[[^\]]+\])/)[1])
for (const page of ['AdminApp', 'App']) {
  const call = js.match(new RegExp('import\\("\\./' + page + '-[^" ]+\\.js"\\)[^;]*?__vite__mapDeps\\(\\[([^\\]]+)\\]\\)'))
  assert.ok(call, page + ' has a preload call')
  const assets = call[1].split(',').map(index => dependencies[Number(index)])
  assert.ok(assets.some(asset => asset.startsWith('assets/' + page + '-') && asset.endsWith('.css')), page + ' must preload its own CSS')
}
console.log('Both page entries preload their own CSS.')
