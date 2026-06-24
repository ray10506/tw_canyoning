export default async function handler(req, res) {
  const { stationId } = req.query
  const url = `https://www.cwa.gov.tw/Data/js/rainfall/Plot_Hr/${stationId}.js?_=${Date.now()}`

  try {
    const upstream = await fetch(url, {
      headers: {
        'Referer': 'https://www.cwa.gov.tw/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': '*/*',
      },
    })
    const body = await upstream.text()
    res.status(upstream.status)
      .setHeader('Content-Type', 'application/javascript; charset=utf-8')
      .send(body)
  } catch (err) {
    res.status(502).json({ error: String(err) })
  }
}
