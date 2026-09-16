import { getSessionToken } from '../../_lib/github'
import { saveEvent, deleteEvent, isValidId, type EventFields } from '../../_lib/events'

const REQUIRED_FIELDS: (keyof EventFields)[] = ['title', 'description', 'category', 'location', 'startDate', 'endDate']

function validateFields(body: unknown): body is EventFields {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return REQUIRED_FIELDS.every((key) => typeof b[key] === 'string' && b[key] !== '')
}

function idFromUrl(req: Request): string | null {
  const { pathname } = new URL(req.url)
  const id = pathname.slice(pathname.lastIndexOf('/') + 1)
  return isValidId(id) ? id : null
}

export async function PUT(req: Request) {
  const token = getSessionToken(req)
  if (!token) return Response.json({ error: 'Not logged in' }, { status: 401 })

  const id = idFromUrl(req)
  if (!id) return Response.json({ error: 'Invalid event id' }, { status: 400 })

  const body = await req.json()
  if (!validateFields(body)) return Response.json({ error: 'Missing required fields' }, { status: 400 })

  try {
    await saveEvent(token, id, body, `Update hackathon: ${body.title}`)
    return Response.json({ id, ...body })
  } catch (err) {
    console.error('Failed to update event:', err)
    return Response.json({ error: 'Failed to save to GitHub' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const token = getSessionToken(req)
  if (!token) return Response.json({ error: 'Not logged in' }, { status: 401 })

  const id = idFromUrl(req)
  if (!id) return Response.json({ error: 'Invalid event id' }, { status: 400 })

  try {
    await deleteEvent(token, id)
    return Response.json({ ok: true })
  } catch (err) {
    console.error('Failed to delete event:', err)
    return Response.json({ error: 'Failed to delete on GitHub' }, { status: 500 })
  }
}
