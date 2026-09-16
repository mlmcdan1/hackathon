// Sends the admin to GitHub to sign in. `repo` scope is required to commit
// event/image changes on their behalf once they authorize.
export function GET(req: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) return new Response('Missing GITHUB_CLIENT_ID environment variable', { status: 500 })

  const { origin } = new URL(req.url)
  const authorizeUrl = new URL('https://github.com/login/oauth/authorize')
  authorizeUrl.searchParams.set('client_id', clientId)
  authorizeUrl.searchParams.set('redirect_uri', `${origin}/api/auth/callback`)
  authorizeUrl.searchParams.set('scope', 'repo')

  return new Response(null, { status: 302, headers: { Location: authorizeUrl.toString() } })
}
