import { getSessionToken, jsonResponse } from '../../lib/server/github'
import { saveImage } from '../../lib/server/events'

export async function POST(req: Request) {
  const token = getSessionToken(req)
  if (!token) return jsonResponse({ error: 'Not logged in' }, 401)

  const body = (await req.json()) as { filename?: unknown; dataUrl?: unknown }
  if (typeof body.filename !== 'string' || typeof body.dataUrl !== 'string') {
    return jsonResponse({ error: 'Expected { filename, dataUrl }' }, 400)
  }

  const base64 = body.dataUrl.slice(body.dataUrl.indexOf(',') + 1)
  try {
    const path = await saveImage(token, body.filename, base64)
    return jsonResponse({ path })
  } catch (err) {
    console.error('Failed to upload image:', err)
    return jsonResponse({ error: 'Failed to upload to GitHub' }, 500)
  }
}
