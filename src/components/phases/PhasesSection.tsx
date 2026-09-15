import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import * as THREE from 'three'
import buildingGif from '../../assets/gbaGifs/building.gif'
import teamworkGif from '../../assets/gbaGifs/Teamwork.gif'
import trophyGif from '../../assets/gbaGifs/Trophy.gif'
import { loadGifPlayer, type GifPlayer } from './gifPlayer'
import './PhasesSection.css'

const MODEL_PATH = '/final_project/models/game_boy_challenge.glb'
const TEXTURE_PATHS = [
  '/final_project/textures/body_green.jpg',
  '/final_project/textures/body_yellow.jpg',
  '/final_project/textures/body_red.jpg',
]
useGLTF.preload(MODEL_PATH)
// Preload every phase's body texture up front — otherwise the first time a
// given phase's canvas mounts, useTexture() suspends while it fetches/decodes,
// and with no local Suspense boundary that bubbles up to the nearest ancestor
// (in HackathonPage.tsx), unmounting this ENTIRE section — all three phases,
// all their text — back to nothing until it resolves. That's what caused the
// "black background flashes away, the green Explore section shows through"
// bug: the page briefly lost this whole block of layout every time you
// scrolled into a phase whose texture hadn't loaded yet.
TEXTURE_PATHS.forEach((path) => useTexture.preload(path))

interface Phase {
  id: string
  title: string
  texture: string
  gif: string
  body: string
  detail: string
}

const PHASES: Phase[] = [
  {
    id: 'build',
    title: 'Build',
    texture: '/final_project/textures/body_green.jpg',
    gif: buildingGif,
    body: 'Turn your ideas into reality.',
    detail: 'A hackathon is a dedicated event to build software, apps, or hardware from scratch. Whether you want to learn a new skill, test a creative idea, or just have fun building something new, this is your time to dive in and create.',
  },
  {
    id: 'team',
    title: 'Team',
    texture: '/final_project/textures/body_yellow.jpg',
    gif: teamworkGif,
    body: 'Work solo or collaborate with a group.',
    detail: "You can bring your own team, work by yourself, or meet other developers and designers at the kickoff. It's a great opportunity to collaborate, share knowledge, and learn from mentors who are there to help you succeed.",
  },
  {
    id: 'pitch',
    title: 'Pitch & Prizes',
    texture: '/final_project/textures/body_red.jpg',
    gif: trophyGif,
    body: 'Demo your project and celebrate.',
    detail: "At the end of the event, you'll show what you built. It's a supportive environment focused on celebrating the creative process. See what other teams made, get feedback, and compete for prizes based on the actual project you created.",
  },
]

// The screen is not a separate mesh/material in this model — the whole body
// (plastic + screen) is one texture ('GameBoy_Mat'), baked as a single UV
// atlas. This is the screen's pixel rectangle within that 2048x2048 atlas,
// found by cropping the source texture and checking where the flat black
// LCD region actually falls. CANVAS_SIZE downsamples the atlas we composite
// onto — the body doesn't need to be pixel-sharp, so this keeps the
// per-frame GPU texture upload (the real cost of an animated canvas
// texture) far cheaper than re-uploading at full 2048 resolution, times
// three simultaneously-mounted phase models.
const SCREEN_RECT_2048 = { x: 140, y: 948, w: 325, h: 367 }
const CANVAS_SIZE = 1024
const SCREEN_SCALE = CANVAS_SIZE / 2048
const SCREEN_RECT = {
  x: SCREEN_RECT_2048.x * SCREEN_SCALE,
  y: SCREEN_RECT_2048.y * SCREEN_SCALE,
  w: SCREEN_RECT_2048.w * SCREEN_SCALE,
  h: SCREEN_RECT_2048.h * SCREEN_SCALE,
}
// Redraw the gif's current frame at most this often — actual gifs run at
// ~10-15fps anyway, so updating the (comparatively expensive) canvas
// texture at 60fps would spend GPU bandwidth nothing can actually see.
const SCREEN_UPDATE_INTERVAL = 90 // ms

// The screen isn't its own mesh/material (see the comment above
// SCREEN_RECT_2048), and it turns out its UV region is packed into the
// atlas both rotated AND mirrored relative to how the flat texture image
// reads — invisible until now since the screen was always a flat black
// rectangle with nothing legible on it to reveal that. Found by trying
// each 90°-multiple rotation and checking real gif content (recognizable
// text) rather than guessing: pure rotation alone always got either the
// reading direction or the top/bottom layout right, never both — the
// giveaway that a mirror was also needed. 1 = rotate the drawn content
// 90° clockwise; drawGifCover also mirrors it horizontally afterward.
const SCREEN_ROTATION_QUARTERS = 1

// "Cover" fit: scale the gif to fill the screen rect completely (after
// accounting for the rotation above), cropping whichever axis overshoots
// rather than letterboxing or stretching it.
function drawGifCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  rect: typeof SCREEN_RECT,
  quarters = SCREEN_ROTATION_QUARTERS
) {
  if (!sourceWidth || !sourceHeight) return

  const rotated = quarters % 2 !== 0
  const targetW = rotated ? rect.h : rect.w
  const targetH = rotated ? rect.w : rect.h

  const imageRatio = sourceWidth / sourceHeight
  const rectRatio = targetW / targetH
  let sx: number, sy: number, sw: number, sh: number
  if (imageRatio > rectRatio) {
    sh = sourceHeight
    sw = sh * rectRatio
    sx = (sourceWidth - sw) / 2
    sy = 0
  } else {
    sw = sourceWidth
    sh = sw / rectRatio
    sx = 0
    sy = (sourceHeight - sh) / 2
  }

  ctx.save()
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2)
  ctx.rotate((Math.PI / 2) * quarters)
  ctx.scale(-1, 1)
  ctx.drawImage(source, sx, sy, sw, sh, -targetW / 2, -targetH / 2, targetW, targetH)
  ctx.restore()
}

// Idle presentation model — rocks gently in place rather than spinning, so
// the screen face stays roughly forward-facing. The body texture is
// re-composited onto an offscreen canvas once, then the screen's rect
// within that canvas is redrawn each frame with the phase's gif — see
// SCREEN_RECT / drawGifCover above for why this works on a single shared
// UV atlas rather than a separate screen material.
interface ScreenCanvas {
  ctx: CanvasRenderingContext2D
  texture: THREE.CanvasTexture
}

function PhaseModel({ texture, gif }: { texture: string; gif: string }) {
  const { scene } = useGLTF(MODEL_PATH)
  const tex = useTexture(texture)
  const groupRef = useRef<THREE.Group>(null)
  const playerRef = useRef<GifPlayer | null>(null)
  const lastDrawRef = useRef(0)

  // Lazy-initialized ref, not useMemo — the canvas/texture pair needs to be
  // ONE stable instance for this component's whole lifetime that useFrame's
  // closure and the material below are guaranteed to be looking at the
  // same object. useMemo's initializer can run more than once under React
  // StrictMode's dev-only double-invoke; a ref's `.current` mutation
  // persists across that, so this pattern is immune to the two ending up
  // pointed at different canvas instances (which was silently leaving the
  // screen showing the base texture, with the gif being redrawn onto a
  // canvas nothing was actually rendering).
  const screenRef = useRef<ScreenCanvas | null>(null)
  if (!screenRef.current) {
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_SIZE
    canvas.height = CANVAS_SIZE
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const canvasTex = new THREE.CanvasTexture(canvas)
      canvasTex.colorSpace = THREE.SRGBColorSpace
      canvasTex.flipY = false
      screenRef.current = { ctx, texture: canvasTex }
    }
  }

  // Paint the base body texture once the real image is ready.
  useEffect(() => {
    const screen = screenRef.current
    const baseImg = tex.image as HTMLImageElement | undefined
    if (!screen || !baseImg) return
    screen.ctx.drawImage(baseImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
    screen.texture.needsUpdate = true
  }, [tex])

  useEffect(() => {
    const screen = screenRef.current
    return () => screen?.texture.dispose()
  }, [])

  // Decode the gif's frames ourselves (see gifPlayer.ts) rather than
  // relying on a hidden <img> to keep animating on its own — that worked
  // in automated testing but not reliably in a real browser, which applies
  // its own undocumented heuristics about which off-screen/de-prioritized
  // elements still get their frames advanced. Manual decoding removes that
  // dependency: there's no image for the browser to decide whether to
  // animate, just pixel data this component steps through on its own timer.
  useEffect(() => {
    let cancelled = false
    loadGifPlayer(gif).then((player) => {
      if (!cancelled) playerRef.current = player
    })
    return () => {
      cancelled = true
      playerRef.current = null
    }
  }, [gif])

  const clone = useMemo(() => {
    const c = scene.clone(true)
    const screenTexture = screenRef.current?.texture
    c.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (!mesh.isMesh || !mesh.material || !screenTexture) return
      const mat = mesh.material as THREE.MeshStandardMaterial
      if (mat.name !== 'GameBoy_Mat') return
      const bodyMat = mat.clone()
      bodyMat.map = screenTexture
      bodyMat.color.set('#ffffff')
      bodyMat.needsUpdate = true
      mesh.material = bodyMat
    })
    return c
    // screenRef.current is a stable lazy-ref singleton (see above), so it's
    // intentionally not a dependency — it never changes after first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const t = state.clock.getElapsedTime()
    groupRef.current.rotation.y = 0.5 + Math.sin(t * 0.4) * 0.12
    groupRef.current.position.y = Math.sin(t * 0.8) * 0.08

    // Advance playback every real frame (cheap — just bookkeeping) so
    // timing stays accurate; only the comparatively expensive canvas
    // redraw + GPU texture upload below is throttled.
    const player = playerRef.current
    player?.update(delta * 1000)

    const now = state.clock.elapsedTime * 1000
    if (now - lastDrawRef.current < SCREEN_UPDATE_INTERVAL) return
    const screen = screenRef.current
    if (!screen || !player) return
    lastDrawRef.current = now
    const frame = player.currentFrame()
    drawGifCover(screen.ctx, frame, player.width, player.height, SCREEN_RECT)
    screen.texture.needsUpdate = true
  })

  return (
    <group ref={groupRef} rotation={[0, 0.5, -0.08]} scale={2.3}>
      <primitive object={clone} />
    </group>
  )
}

function PhaseSection({
  phase,
  reverse,
}: {
  phase: Phase
  reverse: boolean
}) {
  const localRef = useRef<HTMLElement>(null)
  const textRef = useRef<HTMLDivElement>(null)

  // No visibility gating here, deliberately — these are simple, lightweight
  // canvases (one model, one texture, no video), unlike the heavy always-on
  // canvases (old fog x2, video-heavy gameboys, Glitchy) that caused this
  // page's original GPU crashes. Two earlier attempts at gating this — a
  // shared "only one active" observer, then a per-section observer with a
  // tight margin — both caused visible pop-in/pop-out and load delay as the
  // canvas was repeatedly torn down and rebuilt. Just mount once and stay,
  // like every other element on the page.

  useEffect(() => {
    if (!localRef.current || !textRef.current) return
    const ctx = gsap.context(() => {
      gsap.from(textRef.current, {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power2.out',
        scrollTrigger: { trigger: localRef.current, start: 'top 75%' },
      })
    }, localRef)
    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={localRef}
      className={`phase-section${reverse ? ' phase-section--reverse' : ''}`}
    >
      <div className="phase-section__visual">
        <Canvas
          style={{ width: '100%', height: '100%', display: 'block' }}
          camera={{ position: [0, 1.5, 5.0], fov: 52 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
          dpr={[1, 1.5]}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[4, 6, 4]} intensity={1.2} />
          <pointLight position={[-3, 2, 3]} intensity={0.4} color="#a855f7" />
          {/* Local boundary: if this ever does suspend, only this canvas
              waits — it can no longer take the whole section down with it. */}
          <Suspense fallback={null}>
            <PhaseModel texture={phase.texture} gif={phase.gif} />
          </Suspense>
        </Canvas>
      </div>

      <div ref={textRef} className="phase-section__text">
        <h2 className="phase-section__title">{phase.title}</h2>
        <p className="phase-section__body">{phase.body}</p>
        <p className="phase-section__detail">{phase.detail}</p>
      </div>
    </section>
  )
}

gsap.registerPlugin(ScrollTrigger)

export default function PhasesSection() {
  return (
    <div className="phases-section">
      {PHASES.map((phase, i) => (
        <PhaseSection key={phase.id} phase={phase} reverse={i % 2 === 1} />
      ))}
    </div>
  )
}
