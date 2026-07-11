import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { useRef, useState, useEffect } from 'react'
import * as THREE from 'three'

useGLTF.preload('/Glitchy.glb')

const START_Y   = -3.8
const END_Y     =  0.0
const RISE_SECS =  2.6

function GlitchyModel({
  triggered,
  isHoveringRef,
  rotRef,
}: {
  triggered: boolean
  isHoveringRef: React.RefObject<boolean>
  rotRef: React.RefObject<{ x: number; y: number }>
}) {
  const { scene }    = useGLTF('/Glitchy.glb')
  const groupRef     = useRef<THREE.Group>(null)
  const startTimeRef = useRef<number | null>(null)

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const t = state.clock.getElapsedTime()

    if (!triggered) {
      groupRef.current.position.y = START_Y
      return
    }

    if (startTimeRef.current === null) startTimeRef.current = t
    const elapsed  = t - startTimeRef.current
    const progress = Math.min(1, elapsed / RISE_SECS)
    const eased    = 1 - Math.pow(1 - progress, 3)
    const settled  = progress >= 1

    // Position
    if (!settled) {
      groupRef.current.position.y = START_Y + eased * (END_Y - START_Y)
    } else {
      groupRef.current.position.y = END_Y + Math.sin(t * 0.75) * 0.07
    }

    // Auto-spin only when user is not hovering; freeze so user has full drag control
    if (!isHoveringRef.current) {
      if (!settled) {
        rotRef.current.y += delta * (1.8 * (1 - eased) + 0.3 * eased)
      } else {
        rotRef.current.y += delta * 0.28
      }
    }

    groupRef.current.rotation.y = rotRef.current.y
    groupRef.current.rotation.x = rotRef.current.x
  })

  return (
    <group ref={groupRef} position={[0, START_Y, 0]} scale={1.55}>
      <primitive object={scene} />
    </group>
  )
}

export default function GlitchySection() {
  const sectionRef    = useRef<HTMLDivElement>(null)
  const [triggered, setTriggered] = useState(false)
  const [textIn,    setTextIn]    = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const isHoveringRef = useRef(false)
  const isDraggingRef = useRef(false)
  const lastPosRef    = useRef({ x: 0, y: 0 })
  const rotRef        = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (triggered) return
    const el = sectionRef.current
    if (!el) return

    const check = () => {
      const rect = el.getBoundingClientRect()
      if (rect.top <= window.innerHeight * 0.55) {
        setTriggered(true)
        setTimeout(() => setTextIn(true), 1800)
      }
    }

    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [triggered])

  const handlePointerEnter = () => {
    isHoveringRef.current = true
  }

  const handlePointerLeave = () => {
    isHoveringRef.current = false
    isDraggingRef.current = false
    setIsDragging(false)
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true
    setIsDragging(true)
    lastPosRef.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - lastPosRef.current.x
    const dy = e.clientY - lastPosRef.current.y
    rotRef.current.y += dx * 0.008
    rotRef.current.x = Math.max(-1.2, Math.min(1.2, rotRef.current.x + dy * 0.008))
    lastPosRef.current = { x: e.clientX, y: e.clientY }
  }

  const handlePointerUp = () => {
    isDraggingRef.current = false
    setIsDragging(false)
  }

  return (
    <section ref={sectionRef} className="glitchy-section">

      <div
        className="glitchy-canvas-wrap"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          gl={{ antialias: true, alpha: false }}
          style={{ width: '100%', height: '100%' }}
        >
          <color attach="background" args={['#05030a']} />
          <ambientLight intensity={0.45} />
          <directionalLight position={[4, 8, 4]} intensity={1.5} />
          <pointLight position={[-3, 3, 3]} intensity={1.0} color="#a855f7" />
          <pointLight position={[3, -2, 3]} intensity={0.7} color="#22d3ee" />
          <GlitchyModel triggered={triggered} isHoveringRef={isHoveringRef} rotRef={rotRef} />
        </Canvas>
      </div>

      <div className={`glitchy-info${textIn ? ' glitchy-info--visible' : ''}`}>
        <span className="glitchy-info__tag">AI Companion</span>
        <h2 className="glitchy-info__name">GLITCHY</h2>
        <p className="glitchy-info__desc">
          Your AI-powered hackathon companion. Ask Glitchy anything — rules,
          team ideas, tech stack advice, or just vibe. Built to help you ship
          faster and think bigger.
        </p>
        <button className="glitchy-info__cta" type="button">
          Talk to Glitchy
        </button>
      </div>

    </section>
  )
}
