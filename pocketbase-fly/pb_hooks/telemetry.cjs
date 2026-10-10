const endpoints = ['cwa/rainfall', 'cwa/rainfall-history', 'cwa/rainfall-map', 'cwa/rainfall-stations', 'cwa/qpf-grid', 'nz/rainfall', 'nz/rainfall-history', 'nz/water-level', 'report', 'routes/submit', 'pb/canyon_routes', 'pb/nz_routes', 'pb/water_level_observations', 'pb/rainfall_stations', 'external/forecast', 'external/elevation', 'external/water-level', 'tiles/topographic', 'tiles/street', 'tiles/light', 'tiles/satellite', 'images/qpf']
exports.validate = function (events) {
  if (!Array.isArray(events) || !events.length || events.length > 25) throw new Error('Invalid batch')
  return events.map(row => {
    if (!row || !endpoints.includes(row.endpoint) || !['data','headers','error'].includes(row.phase) || !['ok','http','network','timeout','cancel','decode','unknown'].includes(row.outcome) || !['mobile','tablet','desktop'].includes(row.device) || !['production','test'].includes(row.environment) || !['hit','miss','unknown'].includes(row.cache)) throw new Error('Invalid event')
    for (const field of ['duration','headers','status']) if (typeof row[field] !== 'number' || !Number.isFinite(row[field]) || row[field] < 0 || row[field] > (field === 'status' ? 599 : 300000)) throw new Error('Invalid measurement')
    if ((row.phase === 'data' && row.headers > row.duration) || !Number.isInteger(row.status) || (row.status !== 0 && row.status < 100)) throw new Error('Inconsistent measurement')
    for (const field of ['bytes','server','upstream']) if (row[field] !== null && (typeof row[field] !== 'number' || !Number.isFinite(row[field]) || row[field] < 0 || row[field] > (field === 'bytes' ? 100000000 : 300000))) throw new Error('Invalid optional measurement')
    // Explicit projection discards any extra fields, including URLs and credentials.
    const clean = {}
    for (const field of ['endpoint','duration','headers','status','phase','outcome','bytes','server','upstream','cache','device','environment']) clean[field] = row[field]
    return clean
  })
}
exports.collect = function (e) {
  const allowed = ($os.getenv('TELEMETRY_ORIGINS') || 'https://tw-canyoning.vercel.app').split(',')
  if (!allowed.includes(e.request.header.get('Origin'))) throw new ForbiddenError()
  let events
  try { events = exports.validate(e.requestInfo().body.events) } catch { throw new BadRequestError('Invalid telemetry') }
  e.app.runInTransaction(app => {
    const minute = new Date(Date.now()-60000).toISOString().replace('T',' ')
    const day = new Date(Date.now()-86400000).toISOString().replace('T',' ')
    if (app.countRecords('api_metrics', $dbx.exp('created >= {:cutoff}', { cutoff: minute })) >= 120 || app.countRecords('api_metrics', $dbx.exp('created >= {:cutoff}', { cutoff: day })) >= 10000) throw new ApiError(429, 'Telemetry capacity reached')
    const record = new Record(app.findCollectionByNameOrId('api_metrics'))
    record.set('events', events); app.save(record)
  })
  e.response.header().set('Cache-Control','no-store')
  return e.noContent(204)
}
