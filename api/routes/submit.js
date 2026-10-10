import reportHandler from '../report.js'
import { ROUTE_FIELDS } from '../../scripts/lib/store-report.mjs'

export const config = { api: { bodyParser: { sizeLimit: '7mb' } } }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = req.body ?? {}
  const source = body.route ?? body
  const route = Object.fromEntries(ROUTE_FIELDS.filter(field => source[field] != null).map(field => [field, source[field]]))
  req.body = {
    reportKind: 'route',
    route,
    contactEmail: body.contactEmail ?? body.contact_email,
    gpxFile: body.gpxFile,
  }
  return reportHandler(req, res)
}
