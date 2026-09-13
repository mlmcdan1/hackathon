import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import * as THREE from 'three'
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
  body: string
  detail: string
}

const PHASES: Phase[] = [
  {
    id: 'build',
    title: 'Build',
    texture: '/final_project/textures/body_green.jpg',
    body: 'Turn your ideas into reality.',
    detail: 'A hackathon is a dedicated event to build software, apps, or hardware from scratch. Whether you want to learn a new skill, test a creative idea, or just have fun building something new, this is your time to dive in and create.',
  },
  {
    id: 'team',
    title: 'Team',
    texture: '/final_project/textures/body_yellow.jpg',
    body: 'Work solo or collaborate with a group.',
    detail: "You can bring your own team, work by yourself, or meet other developers and designers at the kickoff. It's a great opportunity to collaborate, share knowledge, and learn from mentors who are there to help you succeed.",
  },
  {
    id: 'pitch',
    title: 'Pitch & Prizes',
    texture: '/final_project/textures/body_red.jpg',
    body: 'Demo your project and celebrate.',
    detail: "At the end of the event, you'll show what you built. It's a supportive environment focused on celebrating the creative process. See what other teams made, get feedback, and compete for prizes based on the actual project you created.",
  },
]

// Idle presentation model — rocks gently in place rather than spinning, so the
// screen face stays roughly forward-facing (kept simple deliberately: the
// screen content/overlay treatment is a separate, not-yet-decided piece).
function PhaseModel({ texture }: { texture: string }) {
  const { scene } = useGLTF(MODEL_PATH)
  const tex = useTexture(texture)
  const groupRef = useRef<THREE.Group>(null)

  const clone = useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.flipY = false
    const c = scene.clone(true)
    c.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (!mesh.isMesh || !mesh.material) return
      const mat = mesh.material as THREE.MeshStandardMaterial
      if (mat.name !== 'GameBoy_Mat') return
      const bodyMat = mat.clone()
      bodyMat.map = tex
      bodyMat.color.set('#ffffff')
      bodyMat.needsUpdate = true
      mesh.material = bodyMat
    })
    return c
  }, [scene, tex])

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.getElapsedTime()
    groupRef.current.rotation.y = 0.5 + Math.sin(t * 0.4) * 0.12
    groupRef.current.position.y = Math.sin(t * 0.8) * 0.08
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
            <PhaseModel texture={phase.texture} />
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
