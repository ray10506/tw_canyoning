import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import PocketBase, { BaseAuthStore } from 'pocketbase'

const name = 'canyon-admin-test-' + randomBytes(4).toString('hex')
const url = 'http://127.0.0.1:18099'
const superPassword = randomBytes(24).toString('base64url')
const adminEmail = 'admin@example.test', adminPassword = 'Local-test-only-37!'
const temp = mkdtempSync(join(tmpdir(), 'canyon-admin-'))
const docker = args => {
  const result = spawnSync('docker', args, { encoding: 'utf8', windowsHide: true })
  if (result.status !== 0) throw new Error('Docker test operation failed: ' + result.stderr)
  return result.stdout.trim()
}
docker(['run', '--rm', '-d', '--name', name, '-p', '127.0.0.1:18099:8090', '--tmpfs', '/pb_data',
  '-v', `${resolve('pocketbase-fly/pb_hooks')}:/pb_hooks:ro`,
  '-e', 'TELEMETRY_ORIGINS=http://127.0.0.1:5182,http://127.0.0.1:5183', '-e', 'PB_ADMIN_EMAIL=super@example.test', '-e', `PB_ADMIN_PASSWORD=${superPassword}`, 'ghcr.io/muchobien/pocketbase:latest'])
let passed = false
try {
  const root = new PocketBase(url, new BaseAuthStore())
  for (let i = 0; i < 40; i++) {
    try { await root.health.check(); break } catch { await new Promise(r => setTimeout(r, 250)) }
  }
  await root.collection('_superusers').authWithPassword('super@example.test', superPassword)
  const text = name => ({ name, type: 'text' })
  const dates = [{ name: 'created', type: 'autodate', onCreate: true }, { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }]
  for (const name of ['canyon_routes', 'nz_routes']) {
    await root.collections.create({ name, type: 'base', listRule: '', viewRule: '', createRule: null, updateRule: null, deleteRule: null,
      fields: ['name', 'name_en', 'region', 'region_en', 'grading', 'gps', 'max_drop', 'approach', 'total_time', 'note', 'type'].map(text).concat(dates) })
    await root.collection(name).create({ name: name === 'nz_routes' ? 'Fox 冰河溪谷（測試）' : '上坪溪（測試）', region: '測試地區', grading: 'V3 A2 III', gps: '24,121', type: '溪降' })
  }
  await root.collections.create({ name: 'water_level_observations', type: 'base', listRule: '', viewRule: '', fields: [text('station_id'), { name: 'collected_at', type: 'date' }, { name: 'observed_at', type: 'date' }] })
  await root.collection('water_level_observations').create({ station_id: 'test-station', collected_at: new Date().toISOString(), observed_at: new Date().toISOString() })
  const setup = spawnSync(process.execPath, ['scripts/setup-admin.mjs', '--apply'], {
    encoding: 'utf8', windowsHide: true, env: { ...process.env, PB_URL: url, PB_EMAIL: 'super@example.test', PB_PASSWORD: superPassword,
      ADMIN_EMAIL: adminEmail, ADMIN_PASSWORD: adminPassword, ADMIN_USERNAME: 'admin', REPORT_PB_EMAIL: 'ingest@example.test', REPORT_PB_PASSWORD: adminPassword, ADMIN_BACKUP_PATH: join(temp, 'schema.local') },
  })
  if (setup.status !== 0) throw new Error(setup.stderr)
  const guest = new PocketBase(url, new BaseAuthStore()), admin = new PocketBase(url, new BaseAuthStore())
  await admin.collection('site_admins').authWithPassword(adminEmail, adminPassword)
  await admin.collection('site_admins').authWithPassword('admin', adminPassword)
  const metric = {endpoint:'cwa/rainfall-history',duration:2350,headers:2100,status:200,phase:'data',outcome:'ok',bytes:2048,server:2050,upstream:1800,cache:'miss',device:'mobile',environment:'test'}
  const collect = (events,origin='http://127.0.0.1:5182') => fetch(url+'/api/site-telemetry/collect',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({events})})
  assert.equal((await collect([metric],'https://untrusted.test')).status,403)
  assert.equal((await collect([{...metric,endpoint:'secret'}])).status,400)
  const intake = await collect([{...metric,url:'SHOULD_NOT_PERSIST'}])
  assert.equal(intake.status,204,await intake.text())
  const metricRows = await admin.collection('api_metrics').getFullList()
  assert.equal(metricRows.length,1)
  assert.equal(metricRows[0].events[0].url,undefined)
  assert.equal((await guest.collection('api_metrics').getFullList()).length,0)
  await assert.rejects(guest.collection('api_metrics').getOne(metricRows[0].id))
  await assert.rejects(guest.collection('api_metrics').create({events:[metric]}))
  for (let i=0;i<119;i++) assert.equal((await collect([{...metric,duration:50+i*15,headers:20+i*10,server:15+i*8,upstream:10+i*6,device:i%2?'mobile':'desktop',cache:i%3?'hit':'miss'}])).status,204)
  assert.equal((await collect([metric])).status,429)
  const payload = { collection: 'canyon_routes', reason: '隔離測試', data: { name: '未發布溪谷（測試）', region: '測試地區', grading: 'V3 A2 III', gps: '24,121', publication_status: 'draft', editor_source: '自有測試資料' } }
  const save = (client, body) => client.send('/api/site-admin/save', { method: 'POST', body })
  await assert.rejects(save(guest, payload), e => [401,403].includes(e.status))
  await assert.rejects(guest.collection('site_admins').create({ email: 'intruder@example.test', password: adminPassword, passwordConfirm: adminPassword }))
  await assert.rejects(admin.collection('canyon_routes').create(payload.data))
  let route = await save(admin, payload)
  assert.equal((await guest.collection('canyon_routes').getFullList()).length, 1, 'Legacy routes visible, drafts hidden')
  await assert.rejects(guest.collection('canyon_routes').getOne(route.id), e => e.status === 404)
  await assert.rejects(save(admin, { ...payload, data: { ...payload.data, gps: '999,121' } }), e => e.status === 400)
  await assert.rejects(save(admin, { ...payload, collection: '_superusers' }), e => e.status === 400)
  await assert.rejects(save(admin, { ...payload, data: { ...payload.data, type: 'hacked' } }), e => e.status === 400)
  await assert.rejects(save(admin, { ...payload, data: { ...payload.data, publication_status: 'published', editor_source: '' } }), e => e.status === 400)
  const originalVersion = route.updated
  route = await save(admin, { ...payload, id: route.id, version: route.updated, data: { ...payload.data, publication_status: 'published' } })
  assert.equal((await guest.collection('canyon_routes').getOne(route.id)).publication_status, 'published')
  await assert.rejects(save(admin, { ...payload, id: route.id, version: originalVersion }), e => e.status === 409)
  route = await save(admin, { ...payload, id: route.id, version: route.updated, data: { ...payload.data, publication_status: 'archived' } })
  await assert.rejects(guest.collection('canyon_routes').getOne(route.id))
  assert.equal((await admin.collection('site_audit').getFullList()).length, 3)
  await assert.rejects(guest.collection('site_audit').getOne((await admin.collection('site_audit').getFullList())[0].id))
  assert.equal((await guest.collection('site_audit').getFullList()).length, 0)
  // Verify the same editor lifecycle for both countries, including legacy routes.
  for (const collection of ['canyon_routes', 'nz_routes']) {
    const legacy = (await admin.collection(collection).getFullList()).find(r => !r.publication_status)
    let edited = legacy
    for (const state of ['archived', 'draft', 'published', 'archived', 'published']) {
      edited = await save(admin, { ...payload, collection, id: edited.id, version: edited.updated, data: { ...payload.data, publication_status: state } })
      assert.equal(edited.type, legacy.type, 'Non-editor fields preserved')
      if (state === 'published') assert.equal((await guest.collection(collection).getOne(edited.id)).publication_status, state)
      else await assert.rejects(guest.collection(collection).getOne(edited.id), e => e.status === 404)
    }
    const created = await save(admin, { ...payload, collection })
    assert.equal(created.publication_status, 'draft')
    await assert.rejects(guest.collection(collection).getOne(created.id), e => e.status === 404)
  }
  process.env.REPORT_PB_URL = url; process.env.REPORT_PB_EMAIL = 'ingest@example.test'; process.env.REPORT_PB_PASSWORD = adminPassword
  const { storeReport } = await import('./lib/store-report.mjs')
  await storeReport({ reportKind: 'route', route: { name: '投稿溪谷（測試）', region: '南投', grading: 'V3 A2 III', gps: '24,121', admin: true }, contactEmail: 'visitor@example.test', gpxFile: { name: 'test.gpx', content: Buffer.from('<gpx/>').toString('base64') } })
  const submission = (await admin.collection('site_submissions').getFullList())[0]
  assert.equal(submission.payload.route.admin, undefined)
  assert.equal(submission.review_status, 'pending')
  assert.equal((await guest.collection('site_submissions').getFullList()).length, 0)
  const ingester = new PocketBase(url, new BaseAuthStore())
  await ingester.collection('report_ingesters').authWithPassword('ingest@example.test', adminPassword)
  await assert.rejects(save(ingester, payload))
  assert.equal((await ingester.collection('site_submissions').getFullList()).length, 0)
  const fileUrl = admin.files.getURL(submission, submission.attachment)
  assert.ok([403, 404].includes((await fetch(fileUrl)).status))
  const token = await admin.files.getToken()
  assert.equal((await fetch(admin.files.getURL(submission, submission.attachment, { token }))).status, 200)
  await save(admin, { collection: 'site_submissions', id: submission.id, version: submission.updated, reason: '資料待確認', data: { review_status: 'needs_info', review_note: '請補來源' } })
  assert.equal((await admin.collection('site_submissions').getOne(submission.id)).review_status, 'needs_info')
  // Storage is primary: mail downtime must not tell users to submit a duplicate.
  delete process.env.RESEND_API_KEY
  const { default: report } = await import('../api/report.js')
  const response = () => ({ code: 200, status(code) { this.code = code; return this }, json(body) { this.body = body; return this }, end() {}, setHeader() {} })
  const accepted = response()
  await report({ method: 'POST', headers: { 'x-forwarded-for': 'admin-integration' }, body: { message: '後台保存測試', type: 'bug' } }, accepted)
  assert.equal(accepted.code, 200)
  assert.equal((await admin.collection('site_submissions').getFullList()).length, 2)
  process.env.REPORT_PB_PASSWORD = 'incorrect-test-password'
  const failed = response()
  await report({ method: 'POST', headers: { 'x-forwarded-for': 'admin-integration' }, body: { message: '不可假成功' } }, failed)
  assert.equal(failed.code, 502)
  // An unavailable audit collection must roll back the route write as well.
  const logCollection = await root.collections.getOne('site_audit')
  await root.collections.update(logCollection.id, { name: 'site_audit_unavailable' })
  await assert.rejects(save(admin, { ...payload, id: route.id, version: route.updated, data: { ...payload.data, name: 'must rollback' } }))
  assert.equal((await admin.collection('canyon_routes').getOne(route.id)).name, payload.data.name)
  await root.collections.update(logCollection.id, { name: 'site_audit' })
  passed = true
  console.log('Admin integration passed: auth, permissions, publication, conflict, atomic audit, private submissions and files.')
} finally {
  if (passed && process.argv.includes('--keep')) console.log(`Isolated UI test database: ${url}; container: ${name}; synthetic login: ${adminEmail} / ${adminPassword}`)
  else docker(['stop', name])
}
