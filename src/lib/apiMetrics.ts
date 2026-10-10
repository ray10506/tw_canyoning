export interface ApiSample {
  endpoint: string; duration: number; headers: number; status: number;
  phase: 'data' | 'headers' | 'error'; outcome: string; bytes: number | null;
  server: number | null; upstream: number | null; cache: string;
  device: string; environment: string;
}

// Only these labels leave the browser. Never send a URL, query, request or response body.
export function endpointLabel(raw: string, origin: string, pbOrigin: string): string | null {
  let u: URL
  try { u = new URL(raw, origin) } catch { return null }
  const p = u.pathname
  if (u.origin === origin) {
    const station = p.match(/^\/api\/(cwa|nz)\/(rainfall-history|rainfall|water-level)\/[^/]+$/)
    if (station) return `${station[1]}/${station[2]}`
    if (p === '/api/cwa/rainfall-map') return u.searchParams.get('kind') === 'stations' ? 'cwa/rainfall-stations' : 'cwa/rainfall-map'
    if (['/api/cwa/qpf-grid', '/api/report', '/api/routes/submit'].includes(p)) return p.slice(5)
  }
  if (u.origin === pbOrigin) {
    const match = p.match(/^\/api\/collections\/(canyon_routes|nz_routes|water_level_observations|rainfall_stations)\/records(?:\/[^/]+)?$/)
    if (match) return `pb/${match[1]}`
  }
  if (u.hostname === 'api.open-meteo.com' && p === '/v1/forecast') return 'external/forecast'
  if (u.hostname === 'api.opentopodata.org' && p === '/v1/srtm30m') return 'external/elevation'
  if (u.hostname === 'opendata.wra.gov.tw' && p.startsWith('/api/v2/')) return 'external/water-level'
  if (/^(?:[abc]\.)?tile\.opentopomap\.org$/.test(u.hostname)) return 'tiles/topographic'
  if (/^(?:[abc]\.)?tile\.openstreetmap\.org$/.test(u.hostname)) return 'tiles/street'
  if (/^(?:[abcd]\.)?basemaps\.cartocdn\.com$/.test(u.hostname)) return 'tiles/light'
  if (u.hostname === 'server.arcgisonline.com' && p.includes('/MapServer/tile/')) return 'tiles/satellite'
  if (u.hostname === 'www.cwa.gov.tw' && p.startsWith('/Data/fcst_img/')) return 'images/qpf'
  return null
}

export function summarize(samples: ApiSample[]) {
  const groups = new Map<string, ApiSample[]>()
  for (const sample of samples) { const group = groups.get(sample.endpoint) ?? []; group.push(sample); groups.set(sample.endpoint, group) }
  return [...groups].map(([endpoint, rows]) => {
    // Header-only observations and cancellations aren't complete request latency.
    const durations = rows.filter(r => r.phase === 'data').map(r => r.duration).sort((a,b) => a-b)
    const attempts = rows.filter(r => !['cancel','unknown'].includes(r.outcome))
    const failures = attempts.filter(r => r.outcome !== 'ok').length
    const knownCache = rows.filter(r => ['hit','miss'].includes(r.cache))
    return { endpoint, count: rows.length, measured: durations.length,
      p50: durations.length ? durations[Math.ceil(durations.length * .5)-1] : null,
      p95: durations.length ? durations[Math.ceil(durations.length * .95)-1] : null,
      failures, failureRate: attempts.length ? failures / attempts.length : 0,
      unknown: rows.filter(r => r.outcome === 'unknown').length,
      cache: knownCache.length ? knownCache.filter(r => r.cache === 'hit').length / knownCache.length : null,
      wait: durations.reduce((a,b) => a+b, 0),
    }
  })
}

export function installApiMetrics() {
  const target = import.meta.env.VITE_TELEMETRY_URL
  if (!target) return
  const origin = location.origin, pbOrigin = new URL(import.meta.env.VITE_PB_URL ?? 'http://localhost:8090').origin
  const nativeFetch = window.fetch.bind(window)
  const queue: ApiSample[] = []
  const device = matchMedia('(max-width: 600px)').matches ? 'mobile' : matchMedia('(max-width: 1024px)').matches ? 'tablet' : 'desktop'
  const environment = import.meta.env.VITE_TELEMETRY_ENV === 'production' ? 'production' : 'test'
  let sending = false
  const push = (sample: ApiSample) => {
    // Reserve room for API calls when a map pan produces hundreds of tiles.
    if (/^(tiles|images)\//.test(sample.endpoint) && queue.filter(s => /^(tiles|images)\//.test(s.endpoint)).length >= 25) return
    if (queue.length < 100) queue.push(sample)
  }
  const flush = async () => {
    if (sending || !queue.length) return
    sending = true
    const events = queue.splice(0, 25)
    try { await nativeFetch(target, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events }), keepalive: true, signal: AbortSignal.timeout(5000) }) }
    catch { /* Best effort, no retry loop or impact on application requests. */ }
    finally { sending = false }
  }
  const base = (endpoint: string): ApiSample => ({ endpoint, device, environment, duration: 0, headers: 0, status: 0, phase: 'error', outcome: 'unknown', bytes: null, server: null, upstream: null, cache: 'unknown' })
  window.fetch = async (input, init) => {
    const raw = input instanceof Request ? input.url : String(input)
    const endpoint = endpointLabel(raw, origin, pbOrigin)
    if (!endpoint) return nativeFetch(input, init)
    const start = performance.now(), sample = base(endpoint)
    const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined)
    const failure = (error: unknown) => {
      if (signal?.reason?.name === 'TimeoutError' || (error instanceof Error && error.name === 'TimeoutError')) return 'timeout'
      if (error instanceof Error && error.name === 'AbortError') return 'cancel'
      return error instanceof SyntaxError ? 'decode' : 'network'
    }
    try {
      const response = await nativeFetch(input, init)
      sample.headers = Math.round(performance.now()-start); sample.status = response.status
      sample.outcome = response.ok ? 'ok' : 'http'
      const length = response.headers.get('content-length')
      sample.bytes = Number(length) || null
      const cache = response.headers.get('x-vercel-cache')?.toLowerCase()
      sample.cache = cache === 'hit' ? 'hit' : cache === 'miss' ? 'miss' : 'unknown'
      const timing = response.headers.get('server-timing') ?? ''
      for (const key of ['server','upstream'] as const) {
        const value = timing.match(new RegExp(`(?:^|,)\\s*${key};dur=([\\d.]+)`))
        sample[key] = value ? Number(value[1]) : null
      }
      let recorded = false
      const finish = (phase: ApiSample['phase']) => {
        if (recorded) return
        recorded = true; clearTimeout(timer)
        sample.phase = phase; sample.duration = phase === 'headers' ? sample.headers : Math.round(performance.now()-start)
        push(sample)
      }
      // Don't clone or drain bodies: observe only the application's normal reads.
      const timer = setTimeout(() => finish('headers'), 60000)
      for (const method of ['json','text','blob','arrayBuffer','formData'] as const) {
        const read = response[method].bind(response)
        Object.defineProperty(response, method, { value: async () => {
          try { const value = await read(); finish('data'); return value }
          catch (error) { sample.outcome = failure(error); finish('error'); throw error }
        } })
      }
      return response
    } catch (error) {
      sample.duration = Math.round(performance.now()-start)
      sample.outcome = failure(error)
      push(sample); throw error
    }
  }
  // Image/tile requests don't use fetch. Cross-origin TAO restrictions may hide sizes/status.
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
        if (entry.initiatorType !== 'img') continue
        const label = endpointLabel(entry.name, origin, pbOrigin)
        if (!label || (!label.startsWith('tiles/') && label !== 'images/qpf')) continue
        const sample = base(label)
        sample.phase = 'data'; sample.duration = Math.round(entry.duration)
        sample.outcome = 'unknown'; sample.bytes = entry.encodedBodySize || null
        push(sample)
      }
    })
    observer.observe({ type: 'resource', buffered: false })
  }
  setInterval(() => { void flush() }, 15000)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void flush() })
}
