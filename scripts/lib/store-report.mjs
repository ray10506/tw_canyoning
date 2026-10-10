import PocketBase from 'pocketbase'

export const ROUTE_LIMITS = { name: 120, name_en: 120, region: 80, type: 40, grading: 40, gps: 80, max_drop: 40, approach: 1000, total_time: 100, deep_pool: 40, ab_shuttle: 1000, note: 4000 }
export const ROUTE_FIELDS = Object.keys(ROUTE_LIMITS)

export async function storeReport(body) {
  const { REPORT_PB_URL, REPORT_PB_EMAIL, REPORT_PB_PASSWORD } = process.env
  // Keep email-only installations working until the admin database is installed.
  if (!REPORT_PB_URL && !REPORT_PB_EMAIL && !REPORT_PB_PASSWORD) return false
  if (!REPORT_PB_URL || !REPORT_PB_EMAIL || !REPORT_PB_PASSWORD) throw new Error('Incomplete report storage configuration')
  const pb = new PocketBase(REPORT_PB_URL)
  await pb.collection('report_ingesters').authWithPassword(REPORT_PB_EMAIL, REPORT_PB_PASSWORD, { signal: AbortSignal.timeout(10000) })
  const data = new FormData()
  const payload = body.reportKind === 'route'
    ? { route: Object.fromEntries(ROUTE_FIELDS.filter(key => body.route?.[key] != null).map(key => [key, body.route[key]])) }
    : { type: ['bug', 'suggestion'].includes(body.type) ? body.type : 'other', message: body.message }
  data.set('kind', body.reportKind === 'route' ? 'route' : 'feedback')
  data.set('contact_email', body.contactEmail ?? '')
  data.set('payload', JSON.stringify(payload))
  data.set('review_status', 'pending')
  if (body.reportKind === 'route' && body.gpxFile) {
    data.set('attachment', new Blob([Buffer.from(body.gpxFile.content, 'base64')], { type: 'application/gpx+xml' }), body.gpxFile.name)
  }
  await pb.collection('site_submissions').create(data, { signal: AbortSignal.timeout(15000) })
  return true
}
