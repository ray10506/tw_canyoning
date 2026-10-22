import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const code = ts.transpileModule(readFileSync('src/admin/routeChecks.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { missingRouteFields, publicRouteUrl } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
const complete = { id: 'route1', name: '溪谷', region: '南投', grading: 'V3', gps: '24,121', editor_source: '自有資料' }
assert.deepEqual(missingRouteFields(complete), [])
assert.deepEqual(missingRouteFields({ ...complete, gps: '  ', grading: null }), ['缺難度', '缺 GPS'])
assert.equal(missingRouteFields({}).length, 5)
assert.equal(publicRouteUrl({ ...complete, publication_status: 'draft' }, 'canyon_routes'), '')
assert.equal(publicRouteUrl({ ...complete, publication_status: 'archived' }, 'nz_routes'), '')
assert.equal(publicRouteUrl(complete, 'canyon_routes'), '/?view=route&route=route1')
assert.equal(publicRouteUrl({ ...complete, publication_status: 'published' }, 'nz_routes'), '/?view=nz&route=route1')
console.log('Route missing fields and public links passed.')
