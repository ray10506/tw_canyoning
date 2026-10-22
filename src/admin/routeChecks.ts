export function missingRouteFields(route: Record<string, unknown>): string[] {
  return [['name', '缺名稱'], ['region', '缺地區'], ['grading', '缺難度'], ['gps', '缺 GPS'], ['editor_source', '缺來源與授權說明']]
    .filter(([key]) => typeof route[key] !== 'string' || !route[key].trim())
    .map(([, label]) => label)
}

export function publicRouteUrl(route: Record<string, unknown>, collection: string): string {
  if (!route.id || (route.publication_status && route.publication_status !== 'published')) return ''
  return '/?' + new URLSearchParams({ view: collection === 'nz_routes' ? 'nz' : 'route', route: String(route.id) })
}
