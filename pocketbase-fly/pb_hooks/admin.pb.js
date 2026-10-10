// Every write goes through this endpoint; direct collection writes stay locked.
routerAdd('POST', '/api/site-admin/save', (e) => {
  return require(__hooks + '/admin.cjs').save(e)
}, $apis.requireAuth('site_admins'), $apis.bodyLimit(65536))
