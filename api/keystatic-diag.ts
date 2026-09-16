// Temporary diagnostic route to confirm the three Keystatic env vars are
// actually reaching the Production runtime, without ever exposing their
// values. Safe to hit directly in a browser; delete once the OAuth login
// issue is resolved.
export default async function () {
  const body = JSON.stringify(
    {
      hasClientId: Boolean(process.env.KEYSTATIC_GITHUB_CLIENT_ID),
      hasClientSecret: Boolean(process.env.KEYSTATIC_GITHUB_CLIENT_SECRET),
      hasSecret: Boolean(process.env.KEYSTATIC_SECRET),
      nodeEnv: process.env.NODE_ENV ?? null,
    },
    null,
    2,
  )
  return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })
}
