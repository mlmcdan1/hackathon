import { getSessionToken, jsonResponse } from '../../lib/server/github'
import { listEvents, uniqueIdFromTitle, saveEvent, type EventFields } from '../../lib/server/events'

const REQUIRED_FIELDS: (keyof EventFields)[] = ['title', 'description', 'category', 'location', 'startDate', 'endDate']

function validateFields(body: unknown): body is EventFields {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return REQUIRED_FIELDS.every((key) => typeof b[key] === 'string' && b[key] !== '')
}

export async function GET(req: Request) {
  const token = getSessionToken(req)
  if (!token) return jsonResponse({ error: 'Not logged in' }, 401)
  try {
    return jsonResponse(await listEvents(token))
  } catch (err) {
    console.error('Failed to list events:', err)
    return jsonResponse({ error: 'Failed to load hackathons from GitHub' }, 500)
  }
}

export async function POST(req: Request) {
  const token = getSessionToken(req)
  if (!token) return jsonResponse({ error: 'Not logged in' }, 401)

  const body = await req.json()
  if (!validateFields(body)) return jsonResponse({ error: 'Missing required fields' }, 400)

  try {
    const id = await uniqueIdFromTitle(token, body.title)
    await saveEvent(token, id, body, `Add hackathon: ${body.title}`)
    return jsonResponse({ id, ...body })
  } catch (err) {
    console.error('Failed to create event:', err)
    return jsonResponse({ error: 'Failed to save to GitHub' }, 500)
  }
}
