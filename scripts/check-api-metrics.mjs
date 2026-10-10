import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { createRequire } from 'node:module'
import { withApiTiming, timedFetch } from './lib/api-timing.mjs'
const require = createRequire(import.meta.url)
const {validate} = require('../pocketbase-fly/pb_hooks/telemetry.cjs')
const config = {VITE_TELEMETRY_URL:'https://pb.test/api/site-telemetry/collect',VITE_PB_URL:'https://pb.test',VITE_TELEMETRY_ENV:'test'}
const source = readFileSync(new URL('../src/lib/apiMetrics.ts',import.meta.url),'utf8').replaceAll('import.meta.env',JSON.stringify(config))
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const { endpointLabel, summarize, installApiMetrics } = await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'))
assert.equal(endpointLabel('/api/nz/rainfall/SECRET?key=SECRET','https://app.test','https://pb.test'),'nz/rainfall')
assert.equal(endpointLabel('https://pb.test/api/collections/site_admins/auth-with-password','https://app.test','https://pb.test'),null)
assert.equal(endpointLabel('https://evil.test/api/nz/rainfall/123','https://app.test','https://pb.test'),null)
const sample = {endpoint:'cwa/rainfall',duration:50,headers:10,status:200,phase:'data',outcome:'ok',bytes:null,server:null,upstream:null,cache:'unknown',device:'desktop',environment:'test'}
assert.equal(summarize([sample,{...sample,duration:100},{...sample,duration:10000,phase:'headers'}])[0].p95,100)
assert.equal(summarize([{...sample,outcome:'cancel'},{...sample,outcome:'unknown'},{...sample,outcome:'http'}])[0].failureRate,1)
assert.equal(summarize([sample])[0].cache,null)
assert.equal(validate([{...sample,url:'SECRET',token:'SECRET'}])[0].url,undefined)
assert.throws(()=>validate([{...sample,endpoint:'https://secret.test'}]))
assert.throws(()=>validate([{...sample,duration:NaN}]))
assert.throws(()=>validate(Array(26).fill(sample)))

const uploads = [], intervalCallbacks = [], deadlines = new Map()
const originalTimeout = global.setTimeout, originalClear = global.clearTimeout, originalInterval = global.setInterval
let sequence = 0
global.setTimeout = callback => {deadlines.set(++sequence,callback);return sequence}
global.clearTimeout = id => deadlines.delete(id)
global.setInterval = callback => {intervalCallbacks.push(callback);return 1}
global.location = {origin:'https://app.test',pathname:'/'}
global.matchMedia = () => ({matches:false})
global.document = {addEventListener(){}}
const native = async (url,init) => {
  if (String(url) === config.VITE_TELEMETRY_URL) {uploads.push(JSON.parse(init.body));return new Response(null,{status:204})}
  if (String(url).includes('timeout')) throw new DOMException('secret URL','TimeoutError')
  if (String(url).includes('cancel')) throw new DOMException('secret URL','AbortError')
  return new Response(String(url).includes('decode') ? 'not json' : '{"value":42}',{headers:{'server-timing':'server;dur=12.3,upstream;dur=5.2'}})
}
global.window = {fetch:native}
try {
  installApiMetrics()
  const result = await window.fetch('/api/nz/rainfall/SECRET?token=SECRET')
  assert.deepEqual(await result.json(),{value:42})
  await assert.rejects(window.fetch('/api/nz/rainfall/timeout'))
  await assert.rejects(window.fetch('/api/nz/rainfall/cancel'))
  await assert.rejects((await window.fetch('/api/nz/rainfall/decode')).json())
  await window.fetch('https://pb.test/api/collections/site_admins/auth-with-password',{body:'SECRET'})
  await intervalCallbacks[0]()
  // The scheduled callback intentionally doesn't await networking; drain microtasks.
  await Promise.resolve()
  assert.equal(uploads[0].events.length,4)
  assert.deepEqual(uploads[0].events.map(s=>s.outcome),['ok','timeout','cancel','decode'])
  assert.equal(uploads[0].events[0].server,12.3)
  assert.equal(JSON.stringify(uploads).includes('SECRET'),false)
  validate(uploads[0].events)
} finally {global.setTimeout=originalTimeout;global.clearTimeout=originalClear;global.setInterval=originalInterval}

const originalFetch = global.fetch
global.fetch = async () => new Response('{"value":42}')
try {
  const response = () => ({headers:{},setHeader(k,v){this.headers[k]=v},json(value){this.value=value},end(){}})
  const handler = withApiTiming(async (_req,res) => {const r=await timedFetch('https://upstream.test');res.json(await r.json())})
  const a=response(),b=response()
  await Promise.all([handler({},a),handler({},b)])
  assert.deepEqual(a.value,{value:42});assert.match(a.headers['Server-Timing'],/server;dur=[\d.]+,upstream;dur=[\d.]+/)
} finally {global.fetch=originalFetch}
console.log('API metrics checks passed: privacy, normalization, percentiles, exclusions, response preservation and timing headers.')
