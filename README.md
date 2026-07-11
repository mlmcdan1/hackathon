# Augusta Dev Hackathon Website

A retro-styled hackathon platform for Augusta-area developers.

This project is being built as a creative front-end experience for discovering hackathons, signing in, exploring a profile page, and giving admins AI-powered tools to manage events. The visual direction intentionally leans into retro gaming, CRT screens, and early-console UI while still feeling modern enough to expand with AI features.

## Project Goal

Build a community-facing website for Augusta developers that:

- showcases a strong landing experience
- gives users a dedicated hackathons page
- provides a profile experience for participants
- grows into an AI-assisted platform for users and admins

## Glitchy

Glitchy is the AI assistant built into the platform — a chatbot character powered by Google Gemini that helps users brainstorm hackathon project ideas. He lives in the floating chat widget on the bottom-right of every page.

- Powered by `gemini-2.5-flash` with model fallback chain
- Knows about live upcoming events via Supabase
- Has a distinct personality: creative, energetic, and idea-focused
- Supports boilerplate generation via AI Studio link

Current 3D asset: `public/Glitchy.glb`

## Tech Stack

<p>
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=0B0F18" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white" alt="React Router" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=0B0F18" alt="Supabase" />
  <img src="https://img.shields.io/badge/Three.js-111111?style=for-the-badge&logo=threedotjs&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google Gemini" />
</p>

- `React 19` + `TypeScript` + `Vite`
- `React Router` for navigation
- `Supabase` — auth, live events table, RLS policies, admin management
- `Three.js` / `@react-three/fiber` — 3D hero scene, fog canvas, gameboy models
- `@google/genai` — Gemini AI for Glitchy (user chatbot) and admin hackathon generator
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
- PS1-inspired treatment on the profile page
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
- metallic PS1-inspired blue-gray surfaces on the profile page

## Fonts Used

- `Inter`
- `Outfit`
- `Bungee`
- `Press Start 2P`
- `Space Mono`

## Current Build Status

### Completed

- [x] Landing page / hero experience
- [x] Standalone hackathons page
- [x] Profile page
- [x] About page
- [x] Reset password page
- [x] Supabase auth integration (sign-in, sign-up, sign-out, reset password)
- [x] Retro transitions, CRT effects, loading screen
- [x] Live Supabase events table with RLS policies
- [x] Admin portal — full event CRUD (create, edit, delete, publish toggle)
- [x] Admin portal — AI hackathon generator (conversational, powered by Gemini)
- [x] Admin portal — admin user management (grant / revoke via email)
- [x] Glitchy chatbot — live on every page, knows about real events
- [x] About page navigation fix
- [x] Scroll performance fix (fog canvas IntersectionObserver, Lenis lerp tuning)

### In Progress / Next

- [ ] Profile data persistence (currently shows UI with auth-derived name only)
- [ ] Event registration flow for users
- [ ] Glitchy 3D model integration into chat widget

## Data / Backend Status

- `Supabase auth` — connected, real sign-in / sign-up / sign-out / reset password
- `Supabase events table` — live, RLS-protected, seeded with 8 starter events
- `Supabase admins table` — live, admin management via website UI
- Admin access — controlled by `raw_app_meta_data.role = "admin"` in Supabase user JSON OR the `admins` table OR `VITE_ADMIN_EMAIL` env var (frontend bypass)
- Profile page — auth session for name only; stats/projects/skills are still placeholder UI

## Supabase Setup

The migration script lives at `scripts/supabase-migration.sql`. It creates:

1. `events` table with RLS policies
2. `admins` table with RLS policies
3. `is_admin()` SQL function — checks `admins` table + JWT `app_metadata.role`
4. `get_user_id_by_email()` helper for admin management UI
5. Seed events (8 starter hackathons)

To grant admin access to a user, either:
- Set `raw_app_meta_data.role = "admin"` in Supabase → Authentication → Users
- Or insert into the `admins` table via the website's Admin Management panel

## Environment Variables

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GEMINI_API_KEY=        # Glitchy user chatbot
VITE_ADMIN_GEMINI_API_KEY=  # Admin AI hackathon generator (separate quota)
VITE_ADMIN_EMAIL=           # Super-admin email bypass (frontend only)
```

## Important Project Files

- `src/pages/HackathonPage/HackathonPage.tsx` — Landing page and hero experience
- `src/pages/HackathonSectionPage/HackathonSectionPage.tsx` — Hackathons route wrapper
- `src/components/HackathonSection.tsx` — Hackathons page content (live Supabase data)
- `src/pages/AdminPage/AdminPage.tsx` — Full admin portal with AI generator
- `src/pages/Profile/Profile.tsx` — Profile page
- `src/pages/AboutPage/AboutPage.tsx` — About page
- `src/components/chat/ChatWidget.tsx` — Glitchy AI chatbot widget
- `src/components/auth/AuthModal.tsx` — Sign in / sign up / reset password modal
- `src/components/hero/HeroCanvas.tsx` — Main 3D hero scene
- `src/components/hero/FogCanvas.tsx` — Fog background shader (direct Three.js ShaderMaterial)
- `src/lib/eventUtils.ts` — Supabase CRUD functions for events
- `scripts/supabase-migration.sql` — Full DB migration (run once in Supabase SQL Editor)

## Running Locally

```bash
npm install
npm run dev
```

Copy `.env.local.example` to `.env.local` and fill in your Supabase and Gemini keys.

Production build:

```bash
npm run build
```

## Notes

- Fog canvas uses a direct Three.js ShaderMaterial with the Vanta FOG fragment shader — do NOT use the Vanta npm package
- Floor mesh uses `MeshBasicMaterial` (not `MeshStandardMaterial`) so lights don't affect its color
- Two Gemini API keys intentionally separate user chatbot and admin AI quota
- `is_admin()` Supabase function checks both the `admins` table and `app_metadata.role` JWT claim
