function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char])
}

function row(label, value) {
  if (!value) return ''
  const safe = escapeHtml(value).replace(/\n/g, '<br>')
  return `<tr>
    <td style="padding:5px 16px 5px 0;color:#888;white-space:nowrap;vertical-align:top">${label}</td>
    <td style="padding:5px 0;color:#222">${safe}</td>
  </tr>`
}

export const config = { api: { bodyParser: { sizeLimit: '7mb' } } }

// ponytail: per-instance memory, so it only slows a single abuser hitting a warm instance.
// The real limit belongs in a Vercel Firewall rate-limit rule on /api/report and /api/routes/submit.
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 5
const recent = new Map()
function rateLimited(req) {
  const ip = String(req.headers?.['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown'
  const now = Date.now()
  const hits = (recent.get(ip) ?? []).filter(time => now - time < RATE_WINDOW_MS)
  hits.push(now)
  recent.set(ip, hits)
  if (recent.size > 5000) recent.clear()
  return hits.length > RATE_MAX
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (rateLimited(req)) return res.status(429).json({ error: '回報太頻繁，請稍後再試' })

  const { reportKind, contactEmail } = req.body ?? {}
  if (contactEmail && (typeof contactEmail !== 'string' || contactEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)))
    return res.status(400).json({ error: '聯絡信箱格式錯誤' })
  const gpxFile = reportKind === 'route' ? (req.body.gpxFile ?? null) : null
  let subject, html

  if (reportKind === 'route') {
    const r = req.body.route ?? {}
    if (!r.name?.trim() || !r.region || !r.grading?.trim() || !r.gps?.trim())
      return res.status(400).json({ error: '名稱、縣市、難度、GPS 為必填' })

    const limits = { name: 120, name_en: 120, region: 80, type: 40, grading: 40, gps: 80, max_drop: 40, approach: 1000, total_time: 100, deep_pool: 40, ab_shuttle: 1000, note: 4000 }
    for (const [field, max] of Object.entries(limits)) {
      if (r[field] != null && (typeof r[field] !== 'string' || r[field].length > max))
        return res.status(400).json({ error: `${field} 格式錯誤或超過長度限制` })
    }
    const coords = r.gps.trim().split(/[,\s]+/).map(Number)
    if (coords.length !== 2 || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1]) || Math.abs(coords[0]) > 90 || Math.abs(coords[1]) > 180)
      return res.status(400).json({ error: 'GPS 格式須為有效的 latitude, longitude' })
    if (gpxFile && (typeof gpxFile.name !== 'string' || !gpxFile.name.toLowerCase().endsWith('.gpx') || typeof gpxFile.content !== 'string' || Buffer.byteLength(gpxFile.content, 'base64') > 5 * 1024 * 1024))
      return res.status(400).json({ error: 'GPX 必須是 5 MB 以下的 .gpx 檔案' })

    subject = `[台灣溪降] 路線回報：${r.name}`
    html = `
      <h2 style="font-family:sans-serif;margin:0 0 16px">🗺️ 路線回報：${escapeHtml(r.name)}</h2>
      <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
        ${row('名稱',     r.name)}
        ${row('英文名稱', r.name_en)}
        ${row('縣市',     r.region)}
        ${row('類型',     r.type)}
        ${row('難度',     r.grading)}
        ${row('GPS 座標', r.gps)}
        ${row('最大落差', r.max_drop)}
        ${row('入口方式', r.approach)}
        ${row('總時間',   r.total_time)}
        ${row('深水區',   r.deep_pool)}
        ${row('接駁',     r.ab_shuttle)}
        ${row('GPX 檔案', gpxFile?.name)}
        ${row('備注',     r.note)}
        ${row('聯絡信箱', contactEmail)}
      </table>`

  } else {
    const { type, message } = req.body ?? {}
    if (typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: 'Message required' })
    if (message.length > 4000) return res.status(400).json({ error: '內容超過 4000 字' })

    const typeLabel = type === 'bug' ? '🐛 Bug 回報' : type === 'suggestion' ? '💡 功能建議' : '📝 一般回報'
    subject = `[台灣溪降] ${typeLabel}`
    html = `
      <p style="font-family:sans-serif"><strong>類型：</strong>${typeLabel}</p>
      <p style="font-family:sans-serif"><strong>內容：</strong><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
      ${contactEmail ? `<p style="font-family:sans-serif"><strong>聯絡信箱：</strong>${escapeHtml(contactEmail)}</p>` : ''}`
  }

  const key = process.env.RESEND_API_KEY
  if (!key) return res.status(500).json({ error: 'RESEND_API_KEY not set' })

  const emailPayload = { from: 'onboarding@resend.dev', to: 'terry30136@gmail.com', subject, html }
  if (gpxFile?.name && gpxFile?.content) {
    emailPayload.attachments = [{ filename: gpxFile.name, content: gpxFile.content }]
  }

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(emailPayload),
  })

  // Resend's error text can describe our account setup; keep it server-side.
  if (!r.ok) return res.status(502).json({ error: 'Send failed' })

  res.status(reportKind === 'route' ? 202 : 200).json(
    reportKind === 'route' ? { ok: true, status: 'pending_review' } : { ok: true },
  )
}
