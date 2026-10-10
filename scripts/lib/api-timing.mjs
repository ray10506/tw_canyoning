import { AsyncLocalStorage } from 'node:async_hooks'
const requests = new AsyncLocalStorage()

export async function timedFetch(...args) {
  const context = requests.getStore()
  if (!context) return globalThis.fetch(...args)
  const start = performance.now()
  let charged = 0
  const charge = () => { const elapsed = performance.now()-start; context.upstream += elapsed-charged; charged = elapsed }
  try {
    const response = await globalThis.fetch(...args)
    charge()
    for (const method of ['json','text','arrayBuffer']) {
      const read = response[method].bind(response)
      Object.defineProperty(response, method, { value: async () => {
        try { return await read() } finally { charge() }
      } })
    }
    return response
  } catch (error) { charge(); throw error }
}

export function withApiTiming(handler) {
  return async (req, res) => {
    const context = { upstream: 0 }, start = performance.now()
    const finish = () => {
      if (!res.headersSent) res.setHeader('Server-Timing', `server;dur=${(performance.now()-start).toFixed(1)},upstream;dur=${context.upstream.toFixed(1)}`)
    }
    for (const method of ['json','end']) {
      const send = res[method].bind(res)
      res[method] = (...args) => { finish(); return send(...args) }
    }
    return requests.run(context, () => handler(req, res))
  }
}
