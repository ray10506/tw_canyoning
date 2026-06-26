export default async function handler(req, res) {
  const search = new URL(req.url, 'http://localhost').search
  const target = `https://gweb.wra.gov.tw/HydroInfoMobile/Chart${search}`
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://gweb.wra.gov.tw/HydroInfoMobile',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    'Connection': 'close',
  }

  try {
    let upstream
    let lastError
    for (let attempt = 1; attempt <= 3; attempt++) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12000)
      try {
        upstream = await fetch(target, {
          headers,
          signal: controller.signal,
        })
        break
      } catch (err) {
        lastError = err
        console.error(`[wra/Chart] fetch attempt ${attempt} failed:`, err)
        if (attempt === 3) throw err
        await new Promise(resolve => setTimeout(resolve, attempt * 400))
      } finally {
        clearTimeout(timeout)
      }
    }

    if (!upstream) throw lastError ?? new Error('WRA upstream request failed')

    const body = await upstream.text()
    const contentType = upstream.headers.get('Content-Type') ?? 'text/html'
    console.log('[wra/Chart] target:', target)
    console.log('[wra/Chart] status:', upstream.status)
    console.log('[wra/Chart] content-type:', contentType)
    console.log('[wra/Chart] body preview:', body.slice(0, 500))

    if (!upstream.ok) {
      return res.status(502).json({
        error: 'WRA upstream request failed',
        upstreamStatus: upstream.status,
        upstreamContentType: contentType,
        upstreamBodyPreview: body.slice(0, 500),
      })
    }

    res.status(upstream.status)
      .setHeader('Content-Type', contentType)
      .send(body)
  } catch (err) {
    console.error('[wra/Chart] fetch error:', err)
    res.status(502).json({
      error: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.name : undefined,
      cause: err instanceof Error && err.cause instanceof Error
        ? {
            name: err.cause.name,
            message: err.cause.message,
            code: err.cause.code,
          }
        : undefined,
      target,
    })
  }
}
