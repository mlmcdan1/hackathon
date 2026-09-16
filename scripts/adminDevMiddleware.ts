import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import {
  listEvents,
  getEvent,
  saveEvent,
  deleteEvent,
  uniqueIdFromTitle,
  regenerateEventsJson,
  saveUploadedImage,
  type EventFields,
} from './eventsStore.ts'

// Serves the custom admin panel's API from inside Vite's own dev server —
// reads/writes src/content/events/*.json and public/events-images/
// directly on disk. Dev-only; the deployed site has no persistent
// filesystem for this to write to.

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks)
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  const text = JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(text)
}

const REQUIRED_FIELDS: (keyof EventFields)[] = [
  'title',
  'description',
  'category',
  'location',
  'startDate',
  'endDate',
]

function validateFields(body: unknown): body is EventFields {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return REQUIRED_FIELDS.every((key) => typeof b[key] === 'string' && b[key] !== '')
}

export function adminDevMiddleware(): Plugin {
  return {
    name: 'admin-dev-middleware',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const url = req.url ?? ''

        // Locally there's no GitHub login — deployed production uses real
        // OAuth (api/auth/*), but `npm run dev` just always looks logged in
        // so editing content while developing doesn't need any setup.
        if (url === '/api/auth/session') {
          return sendJson(res, 200, { loggedIn: true, login: 'local-dev' })
        }

        if (!url.startsWith('/api/admin/')) return next()

        try {
          if (url === '/api/admin/events' && req.method === 'GET') {
            return sendJson(res, 200, await listEvents())
          }

          if (url === '/api/admin/events' && req.method === 'POST') {
            const body = JSON.parse((await readBody(req)).toString('utf-8'))
            if (!validateFields(body)) return sendJson(res, 400, { error: 'Missing required fields' })
            const id = await uniqueIdFromTitle(body.title)
            await saveEvent(id, body)
            await regenerateEventsJson()
            return sendJson(res, 200, { id, ...body })
          }

          const eventMatch = url.match(/^\/api\/admin\/events\/([a-z0-9-]+)$/)
          if (eventMatch) {
            const id = eventMatch[1]
            if (req.method === 'GET') {
              const event = await getEvent(id)
              if (!event) return sendJson(res, 404, { error: 'Not found' })
              return sendJson(res, 200, event)
            }
            if (req.method === 'PUT') {
              const body = JSON.parse((await readBody(req)).toString('utf-8'))
              if (!validateFields(body)) return sendJson(res, 400, { error: 'Missing required fields' })
              await saveEvent(id, body)
              await regenerateEventsJson()
              return sendJson(res, 200, { id, ...body })
            }
            if (req.method === 'DELETE') {
              await deleteEvent(id)
              await regenerateEventsJson()
              return sendJson(res, 200, { ok: true })
            }
          }

          if (url === '/api/admin/images' && req.method === 'POST') {
            const body = JSON.parse((await readBody(req)).toString('utf-8'))
            if (typeof body.filename !== 'string' || typeof body.dataUrl !== 'string') {
              return sendJson(res, 400, { error: 'Expected { filename, dataUrl }' })
            }
            const base64 = body.dataUrl.slice(body.dataUrl.indexOf(',') + 1)
            const path = await saveUploadedImage(body.filename, Buffer.from(base64, 'base64'))
            return sendJson(res, 200, { path })
          }

          return sendJson(res, 404, { error: 'Not found' })
        } catch (err) {
          console.error('Admin dev middleware error:', err)
          return sendJson(res, 500, { error: 'Internal error — check the terminal running `npm run dev`.' })
        }
      })
    },
  }
}
