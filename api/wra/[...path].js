export default async function handler(req, res) {
  const segments = req.query.path ?? []
  const pathname = Array.isArray(segments) ? segments.join('/') : segments
  const search = new URL(req.url, 'http://localhost').search
  const target = `https://gweb.wra.gov.tw/HydroInfoMobile/${pathname}${search}`

  try {
    const upstream = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://gweb.wra.gov.tw/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
      },
    })

    const body = await upstream.text()
    res.status(upstream.status)
      .setHeader('Content-Type', upstream.headers.get('Content-Type') ?? 'text/html')
      .send(body)
  } catch (err) {
    res.status(502).json({ error: String(err) })
  }
}
