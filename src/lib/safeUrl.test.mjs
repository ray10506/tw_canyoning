// Run with: node src/lib/safeUrl.test.mjs
import assert from 'node:assert/strict'
import { safeUrl } from './safeUrl.ts'

for (const ok of ['https://kiwicanyons.org/x', 'http://a.b', '/nz-topos/a.jpg']) assert.equal(safeUrl(ok), ok)
for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,x', '//evil.com', 'vbscript:x', '', null, 42])
  assert.equal(safeUrl(bad), undefined, String(bad))
console.log('safeUrl checks passed')
