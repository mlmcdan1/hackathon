import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
    video: '/video/collab.mp4',
    event: {
      title: 'Augusta Dev Hackathon I',
      date: 'Spring 2024',
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
    video: '/video/tech.mp4',
    event: {
      title: 'Augusta Dev Hackathon II',
      date: 'Fall 2024',
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
    video: '/video/drone.mp4',
    event: {
      title: 'Augusta Dev Hackathon III',
      date: 'Spring 2025',
      participants: '250+',
      projects: '32',
      prize: '$10,000',
    },
  },
]

useGLTF.preload(MODEL_PATH)

// UV bounds of the screen faces — verified from emissive texture pixel analysis of game_boy_challenge.glb
const SCREEN_U = { min: 0.0100, max: 0.2590 }
const SCREEN_V = { min: 0.4195, max: 0.6880 }

// Extract only the screen faces as a standalone geometry with UVs remapped to [0,1].
// Returns null if no screen faces are found — caller falls back gracefully.
function extractScreenFaces(orig: THREE.BufferGeometry): THREE.BufferGeometry | null {
  try {
    const posAttr = orig.attributes.position as THREE.BufferAttribute
    const uvAttr  = orig.attributes.uv       as THREE.BufferAttribute
    const idxAttr = orig.index
    if (!posAttr || !uvAttr || !idxAttr) return null

    const arr    = idxAttr.array
    const uRange = SCREEN_U.max - SCREEN_U.min
    const vRange = SCREEN_V.max - SCREEN_V.min

    // Collect original vertex indices that belong to screen triangles
    const screenOrigIdx: number[] = []
    for (let t = 0; t < arr.length; t += 3) {
      const a = arr[t], b = arr[t + 1], c = arr[t + 2]
      if (
        [a, b, c].every((vi) => {
          const u = uvAttr.getX(vi), v = uvAttr.getY(vi)
          return u >= SCREEN_U.min && u <= SCREEN_U.max &&
                 v >= SCREEN_V.min && v <= SCREEN_V.max
        })
      ) {
        screenOrigIdx.push(a, b, c)
      }
    }
    if (screenOrigIdx.length === 0) return null

    // Deduplicate and map original → new compact indices
    const uniq   = Array.from(new Set(screenOrigIdx))
    const vtxMap = new Map(uniq.map((vi, si) => [vi, si] as [number, number]))

    const newPos = new Float32Array(uniq.length * 3)
    const newUV  = new Float32Array(uniq.length * 2)

    uniq.forEach((vi, si) => {
      newPos[si * 3]     = posAttr.getX(vi)
      newPos[si * 3 + 1] = posAttr.getY(vi)
      newPos[si * 3 + 2] = posAttr.getZ(vi)
      const origU = uvAttr.getX(vi)
      const origV = uvAttr.getY(vi)
      // This model's UV is rotated 90° relative to screen orientation:
      //   screen left→right is driven by V (not U), and V=VMAX is screen-left
      //   screen top→bottom is driven by U (not V), and U=UMAX is screen-top
      // So we swap axes and flip both so canvas (0,0) = screen top-left.
      newUV[si * 2]     = (SCREEN_V.max - origV) / vRange  // canvas x
      newUV[si * 2 + 1] = (SCREEN_U.max - origU) / uRange  // canvas y
    })

    const newIdx = new Uint16Array(screenOrigIdx.length)
    screenOrigIdx.forEach((vi, ti) => { newIdx[ti] = vtxMap.get(vi) ?? 0 })

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(newPos, 3))
    geo.setAttribute('uv',       new THREE.BufferAttribute(newUV,  2))
    geo.setIndex(new THREE.BufferAttribute(newIdx, 1))
    geo.computeBoundingSphere()
    return geo
  } catch {
    return null
  }
}

const FALL_CONFIG = [
  { rotX: 0.3, rotZ: -0.5, xDrift: -0.6, delay: 0.00 },
  { rotX: 0.2, rotZ:  0.1, xDrift:  0.0, delay: 0.12 },
  { rotX: 0.3, rotZ:  0.5, xDrift:  0.6, delay: 0.06 },
]

const DEFAULT_CAM = new THREE.Vector3(0, 1.8, 5.6)
// Zoom close enough that the Game Boy screen fills the view
const ZOOM_CAM = new THREE.Vector3(0, 1.0, 1.6)

// Shared temp vector for camera lookAt lerp — avoids per-frame allocations
const _lookAtTarget = new THREE.Vector3()

// ─── Helpers ─────────────────────────────────────────────────────────────────

// ─── 3D Scene ────────────────────────────────────────────────────────────────

function GameboysInScene({
  activeIndex,
  hoveredIndex,
  exitProgressRef,
  zoomedIndexRef,
  zoomedIndex,
  onHover,
  onClick,
  onZoomComplete,
}: {
  activeIndex: number
  hoveredIndex: number | null
  exitProgressRef: React.RefObject<number>
  zoomedIndexRef: React.RefObject<number | null>
  zoomedIndex: number | null
  onHover: (i: number | null) => void
  onClick: (i: number) => void
  onZoomComplete: () => void
}) {
  const { gl } = useThree()
  const { scene } = useGLTF(MODEL_PATH)
  const greenTex  = useTexture('/final_project/textures/body_green.jpg')
  const yellowTex = useTexture('/final_project/textures/body_yellow.jpg')
  const redTex    = useTexture('/final_project/textures/body_red.jpg')

  const camLookAtRef = useRef(new THREE.Vector3(0, 0, 0))

  // VideoTexture objects — video elements are attached to the DOM (1×1px invisible)
  // so the browser compositor delivers frames and requestVideoFrameCallback fires.
  // Src and DOM attachment live in the effect (not useState) so Strict Mode re-runs work.
  const [videoTextures] = useState<THREE.VideoTexture[]>(() =>
    GAMEBOY_DATA.map(() => {
      const v = document.createElement('video')
      // 'metadata' is enough to seek to the thumbnail frame below — the full
      // clip (18-61MB each) only needs to buffer once the user zooms in.
      v.loop = true; v.muted = true; v.playsInline = true; v.preload = 'metadata'
      v.style.cssText = 'position:fixed;top:-1px;left:-1px;width:1px;height:1px;opacity:0;pointer-events:none'
      const tex = new THREE.VideoTexture(v)
      tex.flipY = false
      return tex
    })
  )

  // Set src, add to DOM, seek to t=1.0s for a still-frame thumbnail.
  // Uses AbortController so Strict Mode cleanup→re-run is safe and idempotent.
  useEffect(() => {
    const controllers: AbortController[] = []
    videoTextures.forEach((tex, i) => {
      const v = tex.image as HTMLVideoElement
      const ac = new AbortController()
      controllers.push(ac)

      v.src = GAMEBOY_DATA[i].video
      if (!v.parentNode) document.body.appendChild(v)

      const onMeta   = () => { v.currentTime = 1.0 }
      const onSeeked = () => {
        // Play exactly one frame so compositor delivers the seeked still to VideoTexture
        v.play().catch(() => {})
        v.requestVideoFrameCallback(() => { v.pause() })
      }
      v.addEventListener('loadedmetadata', onMeta,   { once: true, signal: ac.signal })
      v.addEventListener('seeked',         onSeeked, { once: true, signal: ac.signal })
      v.load()
    })
    return () => {
      controllers.forEach(ac => ac.abort())
      videoTextures.forEach((tex) => {
        const v = tex.image as HTMLVideoElement
        v.pause(); v.src = ''; if (v.parentNode) v.remove()
        // DO NOT tex.dispose() — the VideoTexture object must survive Strict Mode re-runs
      })
    }
  }, [videoTextures])

  // Play the zoomed Game Boy's video; pause all others
  useEffect(() => {
    videoTextures.forEach((tex, i) => {
      const v = tex.image as HTMLVideoElement
      if (i === zoomedIndex) { v.play().catch(() => {}) }
      else { v.pause() }
    })
  }, [zoomedIndex, videoTextures])

  const clones = useMemo(() => {
    const bodyTextures = [greenTex, yellowTex, redTex]

    return GAMEBOY_DATA.map((_cfg, i) => {
      const bodyTex = bodyTextures[i]
      bodyTex.colorSpace = THREE.SRGBColorSpace
      bodyTex.flipY = false

      const clone = scene.clone(true)
      clone.traverse((node) => {
        const mesh = node as THREE.Mesh
        if (!mesh.isMesh || !mesh.material) return
        const mat = mesh.material as THREE.MeshStandardMaterial
        if (mat.name !== 'GameBoy_Mat') return

        // Body mesh — single material, untouched geometry (same as original)
        const bodyMat = mat.clone()
        bodyMat.map = bodyTex
        bodyMat.color.set('#ffffff')
        bodyMat.needsUpdate = true
        mesh.material = bodyMat

        // Screen — separate child mesh so body geometry is never modified
        try {
          const screenGeo = extractScreenFaces(mesh.geometry)
          if (screenGeo && mesh.parent) {
            const screenMat = new THREE.MeshBasicMaterial({
              map: videoTextures[i],
              side: THREE.DoubleSide,
              polygonOffset: true,
              polygonOffsetFactor: -1,
              polygonOffsetUnits: -1,
            })
            mesh.parent.add(new THREE.Mesh(screenGeo, screenMat))
          }
        } catch {
          // Screen extraction failed; Game Boys still render with body texture only
        }
      })
      return clone
    })
  }, [scene, greenTex, yellowTex, redTex, videoTextures])

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

    // Smoothly rotate camera between screen-center (zoomed) and origin (normal)
    _lookAtTarget.set(0, zi !== null ? 1.2 : 0, 0)
    camLookAtRef.current.lerp(_lookAtTarget, delta * 2.5)
    state.camera.lookAt(camLookAtRef.current)

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
      // -0.34 is the base lean; zoom mode lerps outer group Z to 0, clearing it
      const targetRotZ  = -0.34 + g * cfg.rotZ

      const s = ref.current.scale.x
      ref.current.scale.setScalar(s + (targetScale - s) * fastDt)
      ref.current.position.x += (targetX - ref.current.position.x) * fastDt
      ref.current.position.y += (targetY - ref.current.position.y) * fastDt
      ref.current.rotation.y += (targetRotY - ref.current.rotation.y) * dt
      ref.current.rotation.x += (targetRotX - ref.current.rotation.x) * fastDt
      ref.current.rotation.z += (targetRotZ - ref.current.rotation.z) * fastDt
    })

    // Belt-and-suspenders: force VideoTexture to re-upload each frame while zoomed.
    // THREE.VideoTexture's requestVideoFrameCallback chain can stall after a pause;
    // this ensures the playing video always reaches the GPU regardless.
    if (zi !== null) {
      const tex = videoTextures[zi]
      const v   = tex.image as HTMLVideoElement
      if (v.readyState >= v.HAVE_CURRENT_DATA) tex.needsUpdate = true
    }
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
          onPointerEnter={(e) => { e.stopPropagation(); onHover(i); gl.domElement.style.cursor = 'pointer' }}
          onPointerLeave={(e) => { e.stopPropagation(); onHover(null); gl.domElement.style.cursor = 'default' }}
          onClick={(e) => { e.stopPropagation(); onClick(i) }}
        >
          <group scale={1.9}>
            <primitive object={clones[i]} />
          </group>
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

  // ESC to close the zoom view (active as soon as a gameboy is zoomed, not just once fully zoomed in)
  useEffect(() => {
    if (zoomedIndex === null) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleBack() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [zoomedIndex, handleBack])

  // Lock scroll and hide section header while zoomed in
  useEffect(() => {
    if (zoomedIndex !== null) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      if (headerRef.current) {
        headerRef.current.style.transition = 'opacity 0.25s ease'
        headerRef.current.style.opacity = '0'
        headerRef.current.style.pointerEvents = 'none'
      }
      return () => {
        document.body.style.overflow = prev
        if (headerRef.current) {
          headerRef.current.style.opacity = ''
          headerRef.current.style.pointerEvents = ''
        }
      }
    }
  }, [zoomedIndex])

  const displayActive = hoveredIndex !== null ? hoveredIndex : activeIndex
  const zoomedData = zoomedIndex !== null ? GAMEBOY_DATA[zoomedIndex] : null

  return (
    <div ref={wrapperRef} className="gb-scroll-space">
      <section className={`gb-section${zoomedIndex !== null ? ' gb-section--zoomed' : ''}`}>
        <div ref={headerRef} className="gb-section__header">
          <h2 className="gb-section__heading">Events</h2>
          <p className="gb-section__eyebrow">Click a gameboy to explore</p>
        </div>

        <div className="gb-section__canvas-wrap">
          <Canvas
            camera={{ position: [0, 1.8, 5.6], fov: 54 }}
            gl={{ antialias: true, alpha: false }}
            style={{ width: '100%', height: '100%', cursor: 'default' }}
          >
            <color attach="background" args={['#05030a']} />
            <GameboysInScene
              activeIndex={displayActive}
              hoveredIndex={hoveredIndex}
              exitProgressRef={exitProgressRef}
              zoomedIndexRef={zoomedIndexRef}
              zoomedIndex={zoomedIndex}
              onHover={handleHover}
              onClick={handleClick}
              onZoomComplete={handleZoomComplete}
            />
            <WarpStars exitProgressRef={exitProgressRef} escapeRef={escapeRef} />
            <GlitchyTransition exitProgressRef={exitProgressRef} escapeRef={escapeRef} />
          </Canvas>

          {zoomedIndex !== null && createPortal(
            <button className="gb-info-panel__exit" onClick={handleBack} aria-label="Close (Esc)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>ESC</span>
            </button>,
            document.body
          )}

          {zoomReady && zoomedData && (
            <div className="gb-info-panel">
              <div className="gb-info-panel__meta">
                <p className="gb-info-panel__date">{zoomedData.event.date}</p>
                <h3 className="gb-info-panel__title">{zoomedData.event.title}</h3>
              </div>
              <div className="gb-info-panel__stats">
                <div className="gb-info-panel__stat">
                  <span className="gb-info-panel__stat-val">{zoomedData.event.participants}</span>
                  <span className="gb-info-panel__stat-lbl">devs</span>
                </div>
                <div className="gb-info-panel__stat">
                  <span className="gb-info-panel__stat-val">{zoomedData.event.projects}</span>
                  <span className="gb-info-panel__stat-lbl">built</span>
                </div>
                <div className="gb-info-panel__stat">
                  <span className="gb-info-panel__stat-val">{zoomedData.event.prize}</span>
                  <span className="gb-info-panel__stat-lbl">prize pool</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
