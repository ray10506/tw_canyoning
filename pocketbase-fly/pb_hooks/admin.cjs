const routeFields = ['name', 'name_en', 'region', 'region_en', 'grading', 'gps', 'max_drop', 'approach', 'total_time', 'note']

// Exported for the same validation checks in Node and PocketBase's JS runtime.
exports.validate = function (body) {
  if (!['canyon_routes', 'nz_routes', 'site_submissions'].includes(body.collection)) throw new Error('不支援的資料類型')
  if (body.id && !/^[a-z0-9]{15}$/.test(body.id)) throw new Error('資料 ID 格式錯誤')
  if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 2000) throw new Error('請填寫修改或審核原因（最多 2000 字）')
  const data = body.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('資料格式錯誤')
  const fields = body.collection === 'site_submissions' ? ['review_status', 'review_note'] : [...routeFields, 'publication_status', 'editor_source']
  for (const key of Object.keys(data)) {
    if (!fields.includes(key) || typeof data[key] !== 'string' || data[key].length > 4000) throw new Error('欄位不允許修改或內容過長：' + key)
  }
  if (body.collection === 'site_submissions') {
    if (!body.id || !['pending', 'needs_info', 'resolved', 'rejected'].includes(data.review_status)) throw new Error('審核狀態錯誤')
  } else {
    if (!['draft', 'published', 'archived'].includes(data.publication_status)) throw new Error('發布狀態錯誤')
    if (!data.name || !data.name.trim()) throw new Error('請填寫路線名稱')
    if (data.gps) {
      const coords = data.gps.trim().split(/[,\s]+/).map(Number)
      if (coords.length !== 2 || !coords.every(Number.isFinite) || Math.abs(coords[0]) > 90 || Math.abs(coords[1]) > 180) throw new Error('GPS 須為有效的緯度, 經度')
    }
    if (data.publication_status === 'published' && ['region', 'grading', 'gps', 'editor_source'].some(key => !data[key] || !data[key].trim())) throw new Error('發布前請補齊地區、難度、GPS、來源與授權說明')
  }
  return data
}

exports.save = function (e) {
  if (!e.auth || e.auth.collection().name !== 'site_admins') throw new ForbiddenError()
  const body = e.requestInfo().body
  let data
  try { data = exports.validate(body) } catch (error) { throw new BadRequestError(error.message) }
  let result
  e.app.runInTransaction((app) => {
    const record = body.id ? app.findRecordById(body.collection, body.id) : new Record(app.findCollectionByNameOrId(body.collection))
    if (body.id && body.version !== record.getString('updated')) throw new ApiError(409, '資料已被更新，請重新載入後再編輯')
    const before = body.id ? record.publicExport() : null
    for (const key of Object.keys(data)) record.set(key, data[key])
    if (!body.id && body.collection === 'canyon_routes') record.set('type', '溪降')
    app.save(record)
    const log = new Record(app.findCollectionByNameOrId('site_audit'))
    log.set('actor', e.auth.id)
    log.set('target_collection', body.collection)
    log.set('target_id', record.id)
    log.set('reason', body.reason.trim())
    log.set('before', before)
    log.set('after', record.publicExport())
    app.save(log)
    result = record
  })
  e.response.header().set('Cache-Control', 'no-store')
  return e.json(200, result)
}
