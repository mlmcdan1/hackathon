# Event editor handoff

The live editor is at `https://hackathon-lime-rho.vercel.app/manage-events`.

It is a static page. It has no database, API route, account on a CMS, or
Vercel environment variables. The editor talks straight from the client's
browser to GitHub and writes only to `src/data/events.json` (and, when used,
`public/event-images/`). Each save is a normal commit to the site's GitHub
repository, so the existing Vercel Git integration publishes it.

## One-time client setup

1. Give the client a GitHub account that has write access to `mlmcdan1/hackathon`. If ownership is transferred, keep the repository name or update `REPOSITORY` in `src/pages/AdminPage/AdminPage.tsx` once before handoff.
2. While signed into that account, open [GitHub's fine-grained token page](https://github.com/settings/personal-access-tokens/new).
3. Set a short description such as “Hackathon event editor”, set the resource owner and select **only** this repository, and grant only **Contents: Read and write** under Repository permissions. Choose an expiry date the client can manage (for example, one year).
4. Generate the token, copy it, visit `/manage-events`, paste it, and choose **Open editor**.

The token is held in `sessionStorage`: it is not committed, sent to Vercel, or
stored after that browser tab is closed. The client can use **Forget editor
key** whenever they are done. Revoking the token in GitHub instantly prevents
further changes.

## Routine editing

Open the editor, paste the editor key, make the change, and choose Save. Wait
roughly one or two minutes for Vercel's existing Git-triggered deployment.
The form supports drafts, deletions, tags, and images under 900 KB.

The editor intentionally commits each image immediately so it can reference it
from the event record; cancelling the event afterward may leave an unused
image in `public/event-images/`, which is harmless.
