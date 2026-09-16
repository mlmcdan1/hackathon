import { getSessionToken, githubGetUser, jsonResponse } from '../_lib/github'

export async function GET(req: Request) {
  const token = getSessionToken(req)
  if (!token) return jsonResponse({ loggedIn: false })

  const user = await githubGetUser(token)
  if (!user) return jsonResponse({ loggedIn: false })

  return jsonResponse({ loggedIn: true, login: user.login, avatar: user.avatar_url })
}
