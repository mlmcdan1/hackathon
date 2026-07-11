import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useTexture, Html } from '@react-three/drei'
import { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import * as THREE from 'three'

useGLTF.preload('/Glitchy.glb')

const MODEL_PATH = '/final_project/models/game_boy_challenge.glb'

const GAMEBOY_DATA = [
  {
    id: 0,
    color: 'green' as const,
    texture: '/final_project/textures/body_green.jpg',
    position: [-2.8, 0, 0] as [number, number, number],
    accentColor: '#33ff33',
    event: {
      title: 'Augusta Dev Hackathon I',
      date: 'Spring 2024',
      description:
        'Our inaugural hackathon brought together developers, designers, and dreamers from across the CSRA. Teams competed over 24 hours to build real solutions.',
      participants: '120+',
      projects: '18',
      prize: '$2,500',
    },
  },
  {
    id: 1,
    color: 'yellow' as const,
    texture: '/final_project/textures/body_yellow.jpg',
    position: [0, 0, 0] as [number, number, number],
    accentColor: '#ffe600',
    event: {
      title: 'Augusta Dev Hackathon II',
      date: 'Fall 2024',
      description:
        'The second edition pushed boundaries with an AI-focused theme. Participants leveraged cutting-edge tools to solve problems facing Augusta businesses.',
      participants: '180+',
      projects: '24',
      prize: '$5,000',
    },
  },
  {
    id: 2,
    color: 'red' as const,
    texture: '/final_project/textures/body_red.jpg',
    position: [2.8, 0, 0] as [number, number, number],
    accentColor: '#ff4444',
    event: {
      title: 'Augusta Dev Hackathon III',
      date: 'Spring 2025',
      description:
        'The biggest one yet. Three tracks, five sponsors, and a community that refused to stop building. A weekend that changed careers and launched startups.',
      participants: '250+',
      projects: '32',
      prize: '$10,000',
    },
  },
]

useGLTF.preload(MODEL_PATH)

const FALL_CONFIG = [
  { rotX: 0.3, rotZ: -0.5, xDrift: -0.6, delay: 0.00 },
  { rotX: 0.2, rotZ:  0.1, xDrift:  0.0, delay: 0.12 },
  { rotX: 0.3, rotZ:  0.5, xDrift:  0.6, delay: 0.06 },
]

const DEFAULT_CAM = new THREE.Vector3(0, 1.8, 5.6)
// Zoom frames the top portion + screen — D-pad/buttons cropped at bottom
const ZOOM_CAM = new THREE.Vector3(0, 1.5, 2.8)

// Screen center in the outer group's LOCAL space (derived from GLTF transform chain)
// Scale chain: GLTF 0.0065 → inner group 1.9 → outer group 1.4 (at zoom)
// Screen center in world ≈ [0, 1.06, 0.35] → local [0, 0.757, 0.25]
const SCREEN_LOCAL: [number, number, number] = [0, 0.757, 0.25]

// ─── 3D Scene ────────────────────────────────────────────────────────────────

function GameboysInScene({
  activeIndex,
  hoveredIndex,
  exitProgressRef,
  zoomedIndexRef,
  onHover,
  onClick,
  onZoomComplete,
  zoomReady,
  zoomedData,
  onClose,
}: {
  activeIndex: number
  hoveredIndex: number | null
  exitProgressRef: React.RefObject<number>
  zoomedIndexRef: React.RefObject<number | null>
  onHover: (i: number | null) => void
  onClick: (i: number) => void
  onZoomComplete: () => void
  zoomReady: boolean
  zoomedData: typeof GAMEBOY_DATA[0] | null
  onClose: () => void
}) {
  const { gl } = useThree()
  const { scene } = useGLTF(MODEL_PATH)
  const greenTex  = useTexture('/final_project/textures/body_green.jpg')
  const yellowTex = useTexture('/final_project/textures/body_yellow.jpg')
  const redTex    = useTexture('/final_project/textures/body_red.jpg')

  const clones = useMemo(() => {
    const textures = [greenTex, yellowTex, redTex]
    return GAMEBOY_DATA.map((_cfg, i) => {
      const tex = textures[i]
      tex.colorSpace = THREE.SRGBColorSpace
      tex.flipY = false
      const clone = scene.clone(true)
      clone.traverse((node) => {
        const mesh = node as THREE.Mesh
        if (mesh.isMesh && mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial
          if (mat.name === 'GameBoy_Mat') {
            const m = mat.clone()
            m.map = tex
            m.color.set('#ffffff')
            m.needsUpdate = true
            mesh.material = m
          }
        }
      })
      return clone
    })
  }, [scene, greenTex, yellowTex, redTex])

  const ref0 = useRef<THREE.Group>(null)
  const ref1 = useRef<THREE.Group>(null)
  const ref2 = useRef<THREE.Group>(null)
  const refs = [ref0, ref1, ref2]

  const zoomCompleteCalledRef = useRef(false)

  useFrame((state, delta) => {
    const dt     = Math.min(delta * 4,  1)
    const fastDt = Math.min(delta * 5,  1)
    const pointer = state.pointer
    const toeIn   = [0.46, 0, -0.46]
    const exit    = exitProgressRef.current ?? 0
    const zi      = zoomedIndexRef.current

    // ── ZOOM MODE ──────────────────────────────────────────────────────────
    if (zi !== null) {
      state.camera.position.lerp(ZOOM_CAM, delta * 1.8)

      refs.forEach((ref, i) => {
        if (!ref.current) return
        if (i === zi) {
          ref.current.position.x  += (0 - ref.current.position.x) * fastDt
          ref.current.position.y  += (0 - ref.current.position.y) * fastDt
          ref.current.rotation.y  += (0 - ref.current.rotation.y) * dt
          ref.current.rotation.x  += (0 - ref.current.rotation.x) * fastDt
          ref.current.rotation.z  += (0 - ref.current.rotation.z) * fastDt
          ref.current.scale.setScalar(ref.current.scale.x + (1.4 - ref.current.scale.x) * dt)
        } else {
          const dir = i < zi ? -1 : 1
          ref.current.position.x  += (dir * 14 - ref.current.position.x) * fastDt
          ref.current.scale.setScalar(ref.current.scale.x + (0.6 - ref.current.scale.x) * dt)
        }
      })

      const dist = state.camera.position.distanceTo(ZOOM_CAM)
      if (dist < 0.25 && !zoomCompleteCalledRef.current) {
        zoomCompleteCalledRef.current = true
        onZoomComplete()
      }
      return
    }

    // ── UNZOOM ─────────────────────────────────────────────────────────────
    zoomCompleteCalledRef.current = false
    state.camera.position.lerp(DEFAULT_CAM, delta * 2.5)

    // ── NORMAL / FALL MODE ─────────────────────────────────────────────────
    refs.forEach((ref, i) => {
      if (!ref.current) return
      const isActive  = activeIndex === i
      const isHovered = hoveredIndex === i
      const cfg       = FALL_CONFIG[i]

      const staggeredExit = Math.max(0, Math.min(1, (exit - cfg.delay) / (1 - cfg.delay)))
      const g = staggeredExit * staggeredExit

      const baseScale = isActive ? 1.3 : 0.85
      const baseY     = isActive ? 0.25 : 0
      const mouseRotY = isHovered ? pointer.x *  0.35 : 0
      const mouseRotX = isHovered ? pointer.y * -0.15 : 0

      const targetScale = baseScale * (1 - g * 0.25)
      const targetY     = baseY + g * -40
      const targetX     = GAMEBOY_DATA[i].position[0] + g * cfg.xDrift
      const targetRotY  = toeIn[i] + mouseRotY
      const targetRotX  = mouseRotX + g * cfg.rotX
      const targetRotZ  = g * cfg.rotZ

      const s = ref.current.scale.x
      ref.current.scale.setScalar(s + (targetScale - s) * fastDt)
      ref.current.position.x += (targetX - ref.current.position.x) * fastDt
      ref.current.position.y += (targetY - ref.current.position.y) * fastDt
      ref.current.rotation.y += (targetRotY - ref.current.rotation.y) * dt
      ref.current.rotation.x += (targetRotX - ref.current.rotation.x) * fastDt
      ref.current.rotation.z += (targetRotZ - ref.current.rotation.z) * fastDt
    })
  })

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 10, 5]} intensity={1.4} castShadow />
      <pointLight position={[-4, 4, 4]} intensity={0.5} color="#a855f7" />
      <pointLight position={[4, 4, 4]} intensity={0.3} color="#33ff33" />
      {GAMEBOY_DATA.map((cfg, i) => (
        <group
          key={cfg.color}
          ref={refs[i]}
          position={cfg.position}
          onPointerEnter={(e) => { e.stopPropagation(); onHover(i); gl.domElement.style.cursor = "url('/cursor-pointer.svg') 4 0, pointer" }}
          onPointerLeave={(e) => { e.stopPropagation(); onHover(null); gl.domElement.style.cursor = "url('/cursor-default.svg') 0 0, default" }}
          onClick={(e) => { e.stopPropagation(); onClick(i) }}
        >
          <group rotation={[0, 0, -0.34]} scale={1.9}>
            <primitive object={clones[i]} />
          </group>

          {/* Screen overlay — renders HTML at the physical screen position */}
          {zoomReady && zoomedData?.id === i && (
            <Html
              position={SCREEN_LOCAL}
              center
              zIndexRange={[100, 0]}
              style={{ pointerEvents: 'auto' }}
            >
              <div
                className="gb-on-screen"
                style={{ '--accent': zoomedData.accentColor } as React.CSSProperties}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="gb-on-screen__scanlines" aria-hidden />
                <div className="gb-on-screen__inner">
                  <span className="gb-on-screen__date">{zoomedData.event.date}</span>
                  <h2 className="gb-on-screen__title">{zoomedData.event.title}</h2>
                  <p className="gb-on-screen__desc">{zoomedData.event.description}</p>
                  <div className="gb-on-screen__stats">
                    <div className="gb-on-screen__stat">
                      <span className="gb-on-screen__stat-val">{zoomedData.event.participants}</span>
                      <span className="gb-on-screen__stat-lbl">devs</span>
                    </div>
                    <div className="gb-on-screen__stat">
                      <span className="gb-on-screen__stat-val">{zoomedData.event.projects}</span>
                      <span className="gb-on-screen__stat-lbl">built</span>
                    </div>
                    <div className="gb-on-screen__stat">
                      <span className="gb-on-screen__stat-val">{zoomedData.event.prize}</span>
                      <span className="gb-on-screen__stat-lbl">prize</span>
                    </div>
                  </div>
                  <button className="gb-on-screen__exit" onClick={onClose}>
                    ◄ EXIT
                  </button>
                </div>
              </div>
            </Html>
          )}
        </group>
      ))}
    </>
  )
}

// ─── Warp Stars: hyperspace particles inside the gameboys canvas ─────────────
// Lives in the same R3F scene — CSS overlays can't stack over WebGL.
// Stars fly from deep z=-25 toward the camera, cycling back when they pass.
// Speed and opacity are driven by exitProgress so they feel tied to the scroll.

const STAR_COUNT = 350

function WarpStars({ exitProgressRef, escapeRef }: { exitProgressRef: React.RefObject<number>; escapeRef: React.RefObject<number> }) {
  const pointsRef = useRef<THREE.Points>(null)
  const matRef    = useRef<THREE.PointsMaterial>(null)

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3)
    const speeds    = new Float32Array(STAR_COUNT)
    for (let i = 0; i < STAR_COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 18
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14
      positions[i * 3 + 2] = -5 - Math.random() * 20
      speeds[i] = 0.02 + Math.random() * 0.06   // was 0.06–0.24, pulled way back
    }
    return { positions, speeds }
  }, [])

  useFrame((_, delta) => {
    if (!pointsRef.current || !matRef.current) return
    const exit  = exitProgressRef.current ?? 0
    const riseP  = Math.max(0, Math.min(1, (exit - 0.40) / 0.10))
    const escape = escapeRef.current ?? 0

    // Fade in as Glitchy rises; fade out as the section scrolls away
    matRef.current.opacity = Math.max(0, riseP - escape * 2.5)

    if (riseP <= 0 || matRef.current.opacity <= 0) return

    const pos      = pointsRef.current.geometry.attributes.position.array as Float32Array
    const warpSpeed = 1 + riseP * 3.5  // was *9 — calmer acceleration

    for (let i = 0; i < STAR_COUNT; i++) {
      pos[i * 3 + 2] += speeds[i] * warpSpeed * delta
      // Reset star to back of scene when it passes the camera
      if (pos[i * 3 + 2] > 6) {
        pos[i * 3 + 0] = (Math.random() - 0.5) * 18
        pos[i * 3 + 1] = (Math.random() - 0.5) * 14
        pos[i * 3 + 2] = -20 - Math.random() * 5
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={0.055}
        color="#ffffff"
        transparent
        opacity={0}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

// ─── Transition: Glitchy rises as gameboys fall ──────────────────────────────
// Lives in the SAME canvas as the gameboys — purely a scroll-driven transition.
// Camera [0,1.8,5.6] fov 54 → visible Y range at z=0 ≈ [-3, +3]
// At exitProgress 0→0.5: gameboys falling, Glitchy snapped off-screen (y=-6)
// At exitProgress 0.5→1.0: Glitchy rises scroll-driven from y=-3.5 → y=0.4

function GlitchyTransition({ exitProgressRef, escapeRef }: { exitProgressRef: React.RefObject<number>; escapeRef: React.RefObject<number> }) {
  const { scene } = useGLTF('/Glitchy.glb')
  const clone     = useMemo(() => scene.clone(true), [scene])
  const groupRef  = useRef<THREE.Group>(null)
  const posYRef   = useRef(-6)   // smoothed Y — lerps toward scroll-driven target

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const exit   = exitProgressRef.current ?? 0
    const escape = escapeRef.current ?? 0
    const t      = state.clock.getElapsedTime()

    const riseP = Math.max(0, Math.min(1, (exit - 0.5) / 0.5))

    groupRef.current.rotation.y = 0

    if (riseP <= 0) {
      // Hard snap off-screen so it's ready instantly when scroll reverses
      posYRef.current = -6
      groupRef.current.position.y = -6
      return
    }

    // Compute scroll-driven target
    let targetY: number
    if (escape > 0) {
      targetY = 0.4 + escape * 6.5
    } else if (riseP >= 0.98) {
      targetY = 0.4 + Math.sin(t * 0.75) * 0.07
    } else {
      const eased = 1 - Math.pow(1 - riseP, 2)
      targetY = -3.5 + eased * 3.9
    }

    // Exponential lerp — frame-rate independent, gives Glitchy a floating-weight feel
    // tau ≈ 0.55s: reaches ~84% of target per second, smooth but not sluggish
    const lerp = 1 - Math.pow(0.16, delta)
    posYRef.current += (targetY - posYRef.current) * lerp
    groupRef.current.position.y = posYRef.current
  })

  return (
    <group ref={groupRef} position={[0, -6, 0]} scale={1.6}>
      <pointLight position={[-3, 4, 3]} intensity={1.3} color="#a855f7" />
      <pointLight position={[ 3, -1, 3]} intensity={0.9} color="#22d3ee" />
      <primitive object={clone} />
    </group>
  )
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export default function GameboysSection() {
  const [hoveredIndex, setHoveredIndex]   = useState<number | null>(null)
  const [activeIndex, setActiveIndex]     = useState(0)
  const [zoomedIndex, setZoomedIndex]     = useState<number | null>(null)
  const [zoomReady, setZoomReady]         = useState(false)
  const timerRef                          = useRef<ReturnType<typeof setInterval> | null>(null)
  const wrapperRef                        = useRef<HTMLDivElement>(null)
  const headerRef                         = useRef<HTMLDivElement>(null)
  const exitProgressRef                   = useRef<number>(0)
  const escapeRef                         = useRef<number>(0)
  const zoomedIndexRef                    = useRef<number | null>(null)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    // Cache the constants that truly never change (sizes, not positions)
    const windowH     = window.innerHeight
    const pinDistance = el.offsetHeight - windowH    // 250vh - 100vh = 150vh total sticky range
    const holdDistance = windowH * 0.5               //  50vh hold: just enough to land and look around
    const animDistance = pinDistance - holdDistance  // 100vh fall animation

    let rafId: number | null = null

    const onScroll = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        // Read position fresh each frame — avoids stale value from font/layout shifts at mount
        const scrolledIn = Math.max(0, -el.getBoundingClientRect().top)

        // Hold: first 150vh pinned → exitProgress stays 0 (gameboys fully visible, interactive)
        // Fall: next   50vh pinned → exitProgress 0→1 (fall animation)
        exitProgressRef.current = Math.max(0, Math.min(1, (scrolledIn - holdDistance) / animDistance))
        escapeRef.current = Math.max(0, (scrolledIn - pinDistance) / windowH)

        if (headerRef.current) {
          const opacity = Math.max(0, 1 - exitProgressRef.current / 0.25)
          headerRef.current.style.opacity = String(opacity)
          headerRef.current.style.pointerEvents = opacity < 0.05 ? 'none' : 'auto'
        }
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  const startCycle = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % 3)
    }, 3000)
  }, [])

  const stopCycle = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  useEffect(() => {
    startCycle()
    return stopCycle
  }, [startCycle, stopCycle])

  const handleHover = useCallback((i: number | null) => {
    setHoveredIndex(i)
    if (i !== null) { stopCycle(); setActiveIndex(i) }
    else startCycle()
  }, [startCycle, stopCycle])

  const handleClick = useCallback((i: number) => {
    if (exitProgressRef.current > 0.05) return
    if (zoomedIndexRef.current !== null) return
    zoomedIndexRef.current = i
    setZoomedIndex(i)
    stopCycle()
  }, [stopCycle])

  const handleZoomComplete = useCallback(() => {
    setZoomReady(true)
  }, [])

  const handleBack = useCallback(() => {
    setZoomReady(false)
    setZoomedIndex(null)
    zoomedIndexRef.current = null
    startCycle()
  }, [startCycle])

  const displayActive = hoveredIndex !== null ? hoveredIndex : activeIndex
  const zoomedData = zoomedIndex !== null ? GAMEBOY_DATA[zoomedIndex] : null

  return (
    <div ref={wrapperRef} className="gb-scroll-space">
      <section className="gb-section">
        <div ref={headerRef} className="gb-section__header">
          <h2 className="gb-section__heading">Events</h2>
          <p className="gb-section__eyebrow">Click a gameboy to explore</p>
        </div>

        <div className="gb-section__canvas-wrap">
          <Canvas
            camera={{ position: [0, 1.8, 5.6], fov: 54 }}
            gl={{ antialias: true, alpha: false }}
            style={{ width: '100%', height: '100%', cursor: "url('/cursor-default.svg') 0 0, default" }}
          >
            <color attach="background" args={['#05030a']} />
            <GameboysInScene
              activeIndex={displayActive}
              hoveredIndex={hoveredIndex}
              exitProgressRef={exitProgressRef}
              zoomedIndexRef={zoomedIndexRef}
              onHover={handleHover}
              onClick={handleClick}
              onZoomComplete={handleZoomComplete}
              zoomReady={zoomReady}
              zoomedData={zoomedData}
              onClose={handleBack}
            />
            <WarpStars exitProgressRef={exitProgressRef} escapeRef={escapeRef} />
            <GlitchyTransition exitProgressRef={exitProgressRef} escapeRef={escapeRef} />
          </Canvas>
        </div>
      </section>
    </div>
  )
}
