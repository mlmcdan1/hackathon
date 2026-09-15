// Vercel Edge Function backing the Keystatic admin UI at /keystatic.
// Handles GitHub OAuth (login/callback) and the git-write API calls the UI
// makes when an editor saves an entry — nothing here touches a database,
// it all just proxies to GitHub as the signed-in editor. Requires
// KEYSTATIC_GITHUB_CLIENT_ID, KEYSTATIC_GITHUB_CLIENT_SECRET and
// KEYSTATIC_SECRET to be set as Vercel environment variables.
import { makeGenericAPIRouteHandler } from '@keystatic/core/api/generic'
import keystaticConfig from '../../keystatic.config'

// Keystatic's field builders (fields.text(), fields.image(), etc., used in
// keystatic.config.ts) double as the admin UI's form definitions, so they
// pull in the full @keystar/ui component tree — too heavy for Vercel's
// restricted Edge runtime allowlist. This runs as a normal Node.js
// serverless function instead, which has no such module restriction.
const handler = makeGenericAPIRouteHandler({ config: keystaticConfig })

export default async function (req: Request) {
  const res = await handler({
    headers: req.headers,
    method: req.method,
    url: req.url,
    json: () => req.json(),
  })
  return new Response(res.body as ConstructorParameters<typeof Response>[0], res)
}
