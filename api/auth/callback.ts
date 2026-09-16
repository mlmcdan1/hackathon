import { sessionCookie } from '../../lib/server/github'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  if (!code) return new Response('Missing authorization code from GitHub.', { status: 400 })

  const clientId = process.env.GITHUB_CLIENT_ID ?? process.env.KEYSTATIC_GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET ?? process.env.KEYSTATIC_GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return new Response('Missing GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET environment variables', { status: 500 })
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  })
  const tokenData = (await tokenRes.json()) as {
    access_token?: string
    error?: string
    error_description?: string
  }
  if (!tokenData.access_token) {
    return new Response(
      `GitHub sign-in failed: ${tokenData.error_description ?? tokenData.error ?? 'unknown error'}`,
      { status: 401 },
    )
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/admin',
      'Set-Cookie': sessionCookie(tokenData.access_token),
    },
  })
}
