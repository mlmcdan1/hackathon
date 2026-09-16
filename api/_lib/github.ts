// Thin wrapper around GitHub's REST API, used to read/write repo files
// directly as the logged-in admin — no database, no git CLI, no local
// filesystem. Every write here is a real commit to the repo.
const GITHUB_API = 'https://api.github.com'
const SESSION_COOKIE = 'gh_token'

export function repoConfig() {
  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  const branch = process.env.GITHUB_BRANCH || 'main'
  if (!owner || !repo) {
    throw new Error('Missing GITHUB_OWNER / GITHUB_REPO environment variables')
  }
  return { owner, repo, branch }
}

export function getSessionToken(req: Request): string | null {
  const cookie = req.headers.get('cookie') ?? ''
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function sessionCookie(token: string): string {
  const maxAge = 60 * 60 * 24 * 30
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
}

async function gh(token: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers ?? {}),
    },
  })
}

export async function githubGetUser(token: string): Promise<{ login: string; avatar_url: string } | null> {
  const res = await gh(token, '/user')
  if (!res.ok) return null
  return (await res.json()) as { login: string; avatar_url: string }
}

export async function listContentFiles(token: string, dirPath: string): Promise<{ name: string; path: string }[]> {
  const { owner, repo, branch } = repoConfig()
  const res = await gh(token, `/repos/${owner}/${repo}/contents/${dirPath}?ref=${branch}`)
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`GitHub list failed: ${res.status} ${await res.text()}`)
  return (await res.json()) as { name: string; path: string }[]
}

export async function getContentFile(token: string, filePath: string): Promise<{ content: string; sha: string } | null> {
  const { owner, repo, branch } = repoConfig()
  const res = await gh(token, `/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub read failed: ${res.status} ${await res.text()}`)
  return (await res.json()) as { content: string; sha: string }
}

export async function putContentFile(
  token: string,
  filePath: string,
  contentBase64: string,
  message: string,
  sha?: string,
): Promise<void> {
  const { owner, repo, branch } = repoConfig()
  const res = await gh(token, `/repos/${owner}/${repo}/contents/${filePath}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: contentBase64, branch, sha }),
  })
  if (!res.ok) throw new Error(`GitHub write failed: ${res.status} ${await res.text()}`)
}

export async function deleteContentFile(token: string, filePath: string, sha: string, message: string): Promise<void> {
  const { owner, repo, branch } = repoConfig()
  const res = await gh(token, `/repos/${owner}/${repo}/contents/${filePath}`, {
    method: 'DELETE',
    body: JSON.stringify({ message, sha, branch }),
  })
  if (!res.ok) throw new Error(`GitHub delete failed: ${res.status} ${await res.text()}`)
}
