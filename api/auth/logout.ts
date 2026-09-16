import { clearSessionCookie } from '../_lib/github'

export function GET() {
  return new Response(null, {
    status: 302,
    headers: { Location: '/admin', 'Set-Cookie': clearSessionCookie() },
  })
}
