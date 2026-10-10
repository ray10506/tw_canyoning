routerAdd('POST', '/api/site-telemetry/collect', (e) => {
  return require(__hooks + '/telemetry.cjs').collect(e)
}, $apis.bodyLimit(16384))

cronAdd('prune-api-metrics', '23 * * * *', () => {
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().replace('T', ' ')
  // Hourly batches exceed the 10,000/day intake cap; avoid a long SQLite write lock.
  const records = $app.findRecordsByFilter('api_metrics', 'created < {:cutoff}', 'created', 1000, 0, { cutoff })
  for (const record of records) $app.delete(record)
})
