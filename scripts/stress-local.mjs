import http from 'node:http'
import { performance } from 'node:perf_hooks'

const base = process.argv[2] ?? 'http://127.0.0.1:3001'
const heavy = process.argv.includes('--heavy')

function requestPath(path) {
  return new Promise(resolve => {
    const started = performance.now()
    const req = http.get(base + path, res => {
      let bytes = 0
      res.on('data', chunk => { bytes += chunk.length })
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 400,
          status: res.statusCode,
          ms: performance.now() - started,
          bytes,
          path,
        })
      })
    })

    req.on('error', err => {
      resolve({
        ok: false,
        error: err.code || err.message,
        ms: performance.now() - started,
        path,
      })
    })

    req.setTimeout(10000, () => {
      req.destroy()
      resolve({
        ok: false,
        error: 'timeout',
        ms: performance.now() - started,
        path,
      })
    })
  })
}

function percentile(values, p) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]
}

async function getHtml() {
  return new Promise((resolve, reject) => {
    http.get(base + '/', res => {
      let text = ''
      res.setEncoding('utf8')
      res.on('data', chunk => { text += chunk })
      res.on('end', () => resolve(text))
    }).on('error', reject)
  })
}

async function runCase(name, paths, total, concurrency) {
  let next = 0
  let done = 0
  let ok = 0
  let fail = 0
  let bytes = 0
  const latencies = []
  const statuses = {}
  const errors = {}
  const started = performance.now()

  async function worker() {
    while (next < total) {
      const path = paths[next++ % paths.length]
      const result = await requestPath(path)
      done += 1
      bytes += result.bytes || 0
      latencies.push(result.ms)
      if (result.ok) ok += 1
      else fail += 1
      const statusKey = result.status || 'ERR'
      statuses[statusKey] = (statuses[statusKey] || 0) + 1
      if (result.error) errors[result.error] = (errors[result.error] || 0) + 1
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker))
  const durationSec = (performance.now() - started) / 1000
  const avg = latencies.reduce((sum, ms) => sum + ms, 0) / latencies.length

  return {
    name,
    total,
    concurrency,
    durationSec: Number(durationSec.toFixed(2)),
    rps: Number((done / durationSec).toFixed(1)),
    ok,
    fail,
    statuses,
    errors,
    bytesMB: Number((bytes / 1024 / 1024).toFixed(2)),
    latencyMs: {
      avg: Number(avg.toFixed(1)),
      p50: Number(percentile(latencies, 50).toFixed(1)),
      p95: Number(percentile(latencies, 95).toFixed(1)),
      p99: Number(percentile(latencies, 99).toFixed(1)),
      max: Number(Math.max(...latencies).toFixed(1)),
    },
  }
}

const html = await getHtml()
const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(match => match[1])
const paths = ['/', ...assets]

console.log(JSON.stringify({ base, discoveredAssets: assets }, null, 2))
console.log(JSON.stringify([
  await runCase('homepage-50c-1000req', ['/'], 1000, 50),
  await runCase('assets-50c-1000req', assets.length ? assets : ['/'], 1000, 50),
  await runCase('mixed-100c-3000req', paths, 3000, 100),
  ...(heavy
    ? [await runCase('mixed-250c-10000req', paths, 10000, 250)]
    : []),
], null, 2))
