import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { makeGenericAPIRouteHandler } from '@keystatic/core/api/generic'
import keystaticConfig from '../keystatic.config'

// Runs Keystatic's local-mode API handler directly inside Vite's own dev
// server, so `npm run dev` alone is enough to use /keystatic — no separate
// CLI, and no interaction with vercel.json's SPA rewrite (which fights
// Vite's dev-time module serving when run through `vercel dev`).
export function keystaticDevMiddleware(): Plugin {
  const handler = makeGenericAPIRouteHandler({ config: keystaticConfig })

  return {
    name: 'keystatic-dev-middleware',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url || !req.url.startsWith('/api/keystatic')) return next()

        try {
          const headers = new Headers()
          for (const [key, value] of Object.entries(req.headers)) {
            if (value === undefined) continue
            headers.set(key, Array.isArray(value) ? value.join(', ') : value)
          }

          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const bodyText = Buffer.concat(chunks).toString('utf-8')

          const result = await handler({
            headers,
            method: req.method ?? 'GET',
            url: new URL(req.url, `http://${req.headers.host}`).toString(),
            json: async () => JSON.parse(bodyText),
          })

          const resHeaders: Record<string, string> = {}
          if (result.headers instanceof Headers) {
            result.headers.forEach((value, key) => {
              resHeaders[key] = value
            })
          } else if (Array.isArray(result.headers)) {
            for (const [key, value] of result.headers) resHeaders[key] = String(value)
          } else if (result.headers) {
            for (const [key, value] of Object.entries(result.headers)) resHeaders[key] = String(value)
          }

          res.writeHead(result.status ?? 500, resHeaders)
          res.end(result.body ?? undefined)
        } catch (err) {
          console.error('Keystatic dev middleware error:', err)
          res.writeHead(500)
          res.end('Internal error in Keystatic dev middleware — check the terminal running `npm run dev`.')
        }
      })
    },
  }
}
