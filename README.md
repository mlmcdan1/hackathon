# Augusta Dev Hackathon Website

A retro-styled hackathon platform for Augusta-area developers.

A fully static front-end for discovering hackathons — no backend, no
database, no accounts. The visual direction leans into retro gaming, CRT
screens, and early-console UI.

## Project Goal

A community-facing site for Augusta developers that:

- showcases a strong landing experience
- gives visitors a dedicated hackathons listing + detail pages
- stays free to host, with zero backend/hosting cost

## Tech Stack

<p>
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=0B0F18" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white" alt="React Router" />
  <img src="https://img.shields.io/badge/Three.js-111111?style=for-the-badge&logo=threedotjs&logoColor=white" alt="Three.js" />
</p>

- `React 19` + `TypeScript` + `Vite`
- `React Router` for navigation
- `Three.js` / `@react-three/fiber` — 3D hero scene, fog canvas, gameboy models
- `Lenis` — smooth scroll

Notable front-end work:

- custom `Three.js` hero with fog shader (direct ShaderMaterial, no Vanta npm package)
- GLTF-based 3D scene with gameboy models and PS1-style textures
- custom CRT / old-monitor overlay effects
- retro loading and transition treatments
- IntersectionObserver on fog canvas to pause off-screen rAF loop

## Theme and Visual Direction

The site is intentionally retro.

Current directions across the project:

- arcade / CRT / old-TV influence
- retro console inspiration
- synthwave / neon accents on the hackathon experience

The goal is not a plain corporate hackathon site. It is meant to feel playful, nostalgic, and a little experimental.

## Colors Used

Core colors already defined in the project include:

| Color | Name | Hex |
|---|---|---|
| <span style="display:inline-block;width:48px;height:16px;background:#FF5C00;border:1px solid #999;"></span> | Nick orange | `#FF5C00` |
| <span style="display:inline-block;width:48px;height:16px;background:#FFD200;border:1px solid #999;"></span> | Yellow | `#FFD200` |
| <span style="display:inline-block;width:48px;height:16px;background:#97FF00;border:1px solid #999;"></span> | Green | `#97FF00` |
| <span style="display:inline-block;width:48px;height:16px;background:#FF00E5;border:1px solid #999;"></span> | Magenta | `#FF00E5` |
| <span style="display:inline-block;width:48px;height:16px;background:#00E0FF;border:1px solid #999;"></span> | Cyan | `#00E0FF` |
| <span style="display:inline-block;width:48px;height:16px;background:#8B00FF;border:1px solid #999;"></span> | Purple | `#8B00FF` |
| <span style="display:inline-block;width:48px;height:16px;background:#0066FF;border:1px solid #999;"></span> | Blue | `#0066FF` |
| <span style="display:inline-block;width:48px;height:16px;background:#FF007A;border:1px solid #999;"></span> | Pink | `#FF007A` |
| <span style="display:inline-block;width:48px;height:16px;background:#333333;border:1px solid #999;"></span> | Dark border | `#333333` |

Additional theme directions already in use:

- dark CRT blacks and deep violets
- neon cyan / magenta / electric blue gradients

## Fonts Used

- `Inter`
- `Outfit`
- `Bungee`
- `Press Start 2P`
- `Space Mono`

## Current Build Status

### Completed

- [x] Landing page / hero experience
- [x] Standalone hackathons listing page with filters
- [x] Hackathon detail page (countdown, event info)
- [x] About page
- [x] Retro transitions, CRT effects, loading screen
- [x] Static event data, no backend
- [x] Scroll performance fix (fog canvas IntersectionObserver, Lenis lerp tuning)

## Event Data

There is no database. Events live in [`src/data/events.json`](src/data/events.json)
and are bundled into the site at build time. To add, edit, or retire an event,
edit that file and redeploy — each entry's shape matches the `EventRecord`
type in [`src/lib/eventUtils.ts`](src/lib/eventUtils.ts) (`published: false`
keeps a draft entry out of the public listing).

## Important Project Files

- `src/pages/HackathonPage/HackathonPage.tsx` — Landing page and hero experience
- `src/pages/HackathonSectionPage/HackathonSectionPage.tsx` — Hackathons route wrapper
- `src/components/HackathonSection.tsx` — Hackathons listing page content
- `src/pages/HackathonDetailPage/HackathonDetailPage.tsx` — Hackathon detail page
- `src/pages/AboutPage/AboutPage.tsx` — About page
- `src/components/hero/HeroCanvas.tsx` — Main 3D hero scene
- `src/components/hero/FogCanvas.tsx` — Fog background shader (direct Three.js ShaderMaterial)
- `src/lib/eventUtils.ts` — Static event data + display/status helpers
- `src/data/events.json` — Event data (edit this to update events)

## Running Locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

The build output in `dist/` is a fully static site — host it anywhere that
serves static files (Vercel, Netlify, GitHub Pages, Cloudflare Pages, etc.).
`vercel.json` includes the SPA rewrite needed for client-side routing.

## Notes

- Fog canvas uses a direct Three.js ShaderMaterial with the Vanta FOG fragment shader — do NOT use the Vanta npm package
- Floor mesh uses `MeshBasicMaterial` (not `MeshStandardMaterial`) so lights don't affect its color
