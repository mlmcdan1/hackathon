// Sends the admin to GitHub to sign in. `repo` scope is required to commit
// event/image changes on their behalf once they authorize.
//
// Reuses the GITHUB_CLIENT_ID/SECRET env vars from an earlier, unrelated
// admin attempt (named KEYSTATIC_* — Keystatic itself is gone, but the
// GitHub OAuth App behind those credentials still exists and works fine
// here) so there's one fewer thing to set up in Vercel.
export function GET(req: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID ?? process.env.KEYSTATIC_GITHUB_CLIENT_ID
  if (!clientId) return new Response('Missing GITHUB_CLIENT_ID environment variable', { status: 500 })

  const { origin } = new URL(req.url)
  const authorizeUrl = new URL('https://github.com/login/oauth/authorize')
  authorizeUrl.searchParams.set('client_id', clientId)
  authorizeUrl.searchParams.set('redirect_uri', `${origin}/api/auth/callback`)
  authorizeUrl.searchParams.set('scope', 'repo')

  return new Response(null, { status: 302, headers: { Location: authorizeUrl.toString() } })
}
