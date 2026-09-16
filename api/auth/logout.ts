import { clearSessionCookie } from '../../lib/server/github'

export function GET() {
  return new Response(null, {
    status: 302,
    headers: { Location: '/admin', 'Set-Cookie': clearSessionCookie() },
  })
}
