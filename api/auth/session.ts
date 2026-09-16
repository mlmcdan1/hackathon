import { getSessionToken, githubGetUser } from '../_lib/github'

export async function GET(req: Request) {
  const token = getSessionToken(req)
  if (!token) return Response.json({ loggedIn: false })

  const user = await githubGetUser(token)
  if (!user) return Response.json({ loggedIn: false })

  return Response.json({ loggedIn: true, login: user.login, avatar: user.avatar_url })
}
