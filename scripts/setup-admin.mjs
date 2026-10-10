// Run only against a backed-up database. Defaults to a read-only plan.
import PocketBase from 'pocketbase'
import { writeFileSync } from 'node:fs'

const { PB_URL, PB_EMAIL, PB_PASSWORD } = process.env
if (!PB_URL || !PB_EMAIL || !PB_PASSWORD) throw new Error('Set PB_URL, PB_EMAIL and PB_PASSWORD in the local environment.')
const pb = new PocketBase(PB_URL)
await pb.collection('_superusers').authWithPassword(PB_EMAIL, PB_PASSWORD)
const admin = '@request.auth.collectionName = "site_admins"'
const ingester = '@request.auth.collectionName = "report_ingesters"'
const text = (name, max = 4000) => ({ name, type: 'text', max })
const dates = [
  { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
  { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
]
const locked = { listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null }
const plans = [
  { name: 'api_metrics', type: 'base', ...locked, listRule: admin, viewRule: admin,
    fields: [{ name: 'events', type: 'json', required: true, maxSize: 16384 }, ...dates],
    indexes: ['CREATE INDEX idx_api_metrics_created ON api_metrics (created)'] },
  ...['site_admins', 'report_ingesters'].map(name => ({ name, type: 'auth', ...locked,
    authRule: '', manageRule: null, passwordAuth: { enabled: true, identityFields: name === 'site_admins' ? ['email', 'username'] : ['email'] }, authToken: { duration: 3600 },
    fields: name === 'site_admins' ? [...dates, { name: 'username', type: 'text', max: 80 }] : dates,
    indexes: name === 'site_admins' ? ['CREATE UNIQUE INDEX idx_site_admin_username ON site_admins (username) WHERE username != \'\''] : [] })),
  { name: 'site_submissions', type: 'base', ...locked, listRule: admin, viewRule: admin,
    createRule: `${ingester} && @request.body.review_status = "pending"`,
    fields: [text('kind', 30), text('contact_email', 254), { name: 'payload', type: 'json', maxSize: 20000 },
      { name: 'attachment', type: 'file', maxSelect: 1, maxSize: 5242880, protected: true },
      { name: 'review_status', type: 'select', values: ['pending', 'needs_info', 'resolved', 'rejected'], maxSelect: 1, required: true }, text('review_note'), ...dates] },
  { name: 'site_audit', type: 'base', ...locked, listRule: admin, viewRule: admin,
    fields: [text('actor', 30), text('target_collection', 80), text('target_id', 30), text('reason', 2000),
      { name: 'before', type: 'json', maxSize: 10000000 }, { name: 'after', type: 'json', maxSize: 10000000 }, ...dates] },
]
const existing = await pb.collections.getFullList()
// Preserve existing public restrictions; add status filtering, never broaden them.
for (const name of ['canyon_routes', 'nz_routes']) {
  const old = existing.find(c => c.name === name)
  if (!old) throw new Error(`Missing ${name}`)
  if (old.fields.some(f => f.name === 'publication_status')) continue
  const publicRule = rule => rule === null ? admin : `(${admin}) || ((${rule || 'id != ""'}) && publication_status != "draft" && publication_status != "archived")`
  plans.push({ ...old, listRule: publicRule(old.listRule), viewRule: publicRule(old.viewRule), createRule: null, updateRule: null, deleteRule: null,
    fields: [...old.fields, ...dates.filter(f => !old.fields.some(oldField => oldField.name === f.name)), { name: 'publication_status', type: 'select', maxSelect: 1, values: ['draft', 'published', 'archived'] }, text('editor_source')] })
}
console.log('Admin schema plan:', plans.map(c => c.name).join(', '))
if (!process.argv.includes('--apply')) {
  console.log('No changes. Back up PocketBase and install pb_hooks before rerunning with --apply.')
} else {
  // This file may contain sensitive collection configuration. Keep it outside Git.
  writeFileSync(process.env.ADMIN_BACKUP_PATH || new URL('../admin-schema-backup.local', import.meta.url), JSON.stringify(existing, null, 2), { flag: 'wx' })
  for (const plan of plans) {
    const old = existing.find(c => c.name === plan.name)
    if (old && !['canyon_routes', 'nz_routes'].includes(plan.name)) continue
    if (old) await pb.collections.update(old.id, plan)
    else await pb.collections.create(plan)
  }
  for (const [collection, email, password] of [
    ['site_admins', process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD],
    ['report_ingesters', process.env.REPORT_PB_EMAIL, process.env.REPORT_PB_PASSWORD],
  ]) {
    if (!email || !password) { console.log(`Create a dedicated account in ${collection} before use.`); continue }
    if (!(await pb.collection(collection).getList(1, 1, { filter: pb.filter('email = {:email}', { email }) })).items.length)
      await pb.collection(collection).create({ email, password, passwordConfirm: password, verified: true, ...(collection === 'site_admins' && process.env.ADMIN_USERNAME ? { username: process.env.ADMIN_USERNAME } : {}) })
  }
  console.log('Schema ready. Existing routes retain visibility; new routes must be explicitly published.')
}
