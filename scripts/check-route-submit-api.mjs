import assert from 'node:assert/strict'
import handler from '../api/routes/submit.js'

function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
    end() { return this },
  }
}

const options = response()
await handler({ method: 'OPTIONS' }, options)
assert.equal(options.statusCode, 204)
assert.equal(options.headers['Access-Control-Allow-Origin'], '*')

process.env.RESEND_API_KEY = 'test'
const invalid = response()
await handler({ method: 'POST', body: { name: 'Test', region: 'Nantou', grading: 'V3 A3 III', gps: '999,999' } }, invalid)
assert.equal(invalid.statusCode, 400)

global.fetch = async () => ({ ok: true, json: async () => ({ id: 'email-id' }) })
const valid = response()
const request = { method: 'POST', body: { name: 'Test', region: 'Nantou', grading: 'V3 A3 III', gps: '23.9,120.9', admin: true } }
await handler(request, valid)
assert.equal(valid.statusCode, 202)
assert.equal(valid.body.status, 'pending_review')
assert.equal(request.body.route.admin, undefined)

const { default: report } = await import('../api/report.js')
const tooLong = response()
await report({ method: 'POST', headers: { 'x-forwarded-for': '10.0.0.1' }, body: { message: 'x'.repeat(4001) } }, tooLong)
assert.equal(tooLong.statusCode, 400)

const statuses = []
for (let i = 0; i < 7; i++) {
  const r = response()
  await report({ method: 'POST', headers: { 'x-forwarded-for': '10.0.0.2' }, body: { message: 'hi' } }, r)
  statuses.push(r.statusCode)
}
assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429, 429])

console.log('route submission API checks passed')
