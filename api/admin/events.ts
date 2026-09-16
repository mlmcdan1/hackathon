import { getSessionToken } from '../_lib/github'
import { listEvents, uniqueIdFromTitle, saveEvent, type EventFields } from '../_lib/events'

const REQUIRED_FIELDS: (keyof EventFields)[] = ['title', 'description', 'category', 'location', 'startDate', 'endDate']

function validateFields(body: unknown): body is EventFields {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return REQUIRED_FIELDS.every((key) => typeof b[key] === 'string' && b[key] !== '')
}

export async function GET(req: Request) {
  const token = getSessionToken(req)
  if (!token) return Response.json({ error: 'Not logged in' }, { status: 401 })
  try {
    return Response.json(await listEvents(token))
  } catch (err) {
    console.error('Failed to list events:', err)
    return Response.json({ error: 'Failed to load hackathons from GitHub' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const token = getSessionToken(req)
  if (!token) return Response.json({ error: 'Not logged in' }, { status: 401 })

  const body = await req.json()
  if (!validateFields(body)) return Response.json({ error: 'Missing required fields' }, { status: 400 })

  try {
    const id = await uniqueIdFromTitle(token, body.title)
    await saveEvent(token, id, body, `Add hackathon: ${body.title}`)
    return Response.json({ id, ...body })
  } catch (err) {
    console.error('Failed to create event:', err)
    return Response.json({ error: 'Failed to save to GitHub' }, { status: 500 })
  }
}
