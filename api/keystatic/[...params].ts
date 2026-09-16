// Serves the Keystatic admin UI's local-mode API calls at /keystatic —
// reads/writes files on disk via `process.cwd()`, no GitHub OAuth, no env
// vars. Only meaningful when run locally (`npx vercel dev`); the deployed
// site has no persistent filesystem for this to write to.
import { makeGenericAPIRouteHandler } from '@keystatic/core/api/generic'
import keystaticConfig from '../../keystatic.config'

const handler = makeGenericAPIRouteHandler({ config: keystaticConfig })

// Vercel's Node runtime treats a bare `export default` as the legacy
// `(req, res) => void` signature and silently discards a returned Response
// (logged as a warning, then the function hangs until it times out) — it
// only recognizes the Web fetch-style API via named HTTP-method exports.
// Keystatic's handler only ever receives GET or POST, so both are wired to
// the same logic here.
async function handleRequest(req: Request) {
  try {
    const res = await handler({
      headers: req.headers,
      method: req.method,
      url: req.url,
      json: () => req.json(),
    })

    // Build the Headers object explicitly instead of handing the raw
    // [key, value][] array straight to `new Response()`'s init — the login
    // and OAuth-callback responses each carry two separate Set-Cookie
    // entries (access token + refresh token), and .append() is what
    // reliably keeps repeated header names distinct rather than merged.
    const headers = new Headers()
    if (res.headers instanceof Headers) {
      res.headers.forEach((value, key) => headers.append(key, value))
    } else if (Array.isArray(res.headers)) {
      for (const [key, value] of res.headers) headers.append(key, String(value))
    } else if (res.headers) {
      for (const [key, value] of Object.entries(res.headers)) headers.append(key, String(value))
    }

    return new Response(res.body as ConstructorParameters<typeof Response>[0], {
      status: res.status,
      statusText: res.statusText ?? '',
      headers,
    })
  } catch (err) {
    console.error('Keystatic API route error:', err)
    return new Response('Internal error in Keystatic API route — check Vercel function logs.', { status: 500 })
  }
}

export const GET = handleRequest
export const POST = handleRequest
