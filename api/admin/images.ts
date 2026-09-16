import { getSessionToken } from '../_lib/github'
import { saveImage } from '../_lib/events'

export async function POST(req: Request) {
  const token = getSessionToken(req)
  if (!token) return Response.json({ error: 'Not logged in' }, { status: 401 })

  const body = (await req.json()) as { filename?: unknown; dataUrl?: unknown }
  if (typeof body.filename !== 'string' || typeof body.dataUrl !== 'string') {
    return Response.json({ error: 'Expected { filename, dataUrl }' }, { status: 400 })
  }

  const base64 = body.dataUrl.slice(body.dataUrl.indexOf(',') + 1)
  try {
    const path = await saveImage(token, body.filename, base64)
    return Response.json({ path })
  } catch (err) {
    console.error('Failed to upload image:', err)
    return Response.json({ error: 'Failed to upload to GitHub' }, { status: 500 })
  }
}
