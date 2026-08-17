import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'

useGLTF.preload('/3DModels/GameboyCartridges.glb')
useGLTF.preload('/3DModels/DreamwaveController.glb')
useGLTF.preload('/3DModels/xboxController.glb')

interface ModelDef {
  path: string
  position: [number, number, number]
  targetSize: number
  initRot: [number, number, number]
  floatOffset: number
  floatSpeed: number
  rockAmp: number
}

function FloatingModel({ path, position, targetSize, initRot, floatOffset, floatSpeed, rockAmp }: ModelDef) {
  const { scene } = useGLTF(path)
  const ref = useRef<THREE.Group>(null)

  const { scale, offset } = useMemo(() => {
    scene.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    if (!maxDim || !isFinite(maxDim)) return { scale: 1, offset: new THREE.Vector3() }
    const s = targetSize / maxDim
    return { scale: s, offset: center.clone().multiplyScalar(-s) }
  }, [scene, targetSize])

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.getElapsedTime()
    ref.current.position.y = position[1] + Math.sin(t * floatSpeed + floatOffset) * 0.16
    ref.current.rotation.y = initRot[1] + Math.sin(t * 0.28 + floatOffset) * rockAmp
    ref.current.rotation.z = initRot[2] + Math.sin(t * 0.20 + floatOffset * 1.3) * (rockAmp * 0.22)
  })

  return (
    <group ref={ref} position={position} rotation={initRot}>
      <group position={[offset.x, offset.y, offset.z]} scale={[scale, scale, scale]}>
        <primitive object={scene} />
      </group>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Camera z=12, fov=55 vertical, ~16:9 → X ±10,  Y ±6.25
//
// PENTAGON COMPOSITION
//
//   [GB Cartridges]   EXPLORE HACKATHONS text   [Xbox]
//
//        [N64]          [EXPLORE btn]        [Dreamwave]
//
//                      [ARCADE — hero]
//
// Two tall pillars on sides, two lower flanks, hero dead center-bottom.
// Side pillars partially bleed off edges (like inkgames reference).
// ─────────────────────────────────────────────────────────────────────────────
const SCENE_MODELS: ModelDef[] = [

  // LEFT — GB cartridges: stack of colorful carts, face-on so labels read clearly
  {
    path: '/3DModels/GameboyCartridges.glb',
    position: [-6.5, -1.0, 0.8],
    targetSize: 5.0,
    initRot: [0.12, 0.20, 0.08],
    floatOffset: 0.0,
    floatSpeed: 0.50,
    rockAmp: 0.14,
  },

  // CENTER BOTTOM — Dreamwave: white PS1-style pad, lower anchor
  {
    path: '/3DModels/DreamwaveController.glb',
    position: [0.5, -4.2, 2.5],
    targetSize: 4.5,
    initRot: [0.40, 0.10, -0.08],
    floatOffset: 1.0,
    floatSpeed: 0.62,
    rockAmp: 0.18,
  },

  // RIGHT — Xbox: black body + colorful ABXY, face tilted up to show buttons
  {
    path: '/3DModels/xboxController.glb',
    position: [6.8, -1.0, 0.8],
    targetSize: 5.0,
    initRot: [0.52, -0.22, -0.10],
    floatOffset: 1.8,
    floatSpeed: 0.55,
    rockAmp: 0.14,
  },
]

function Scene() {
  return (
    <>
      <ambientLight intensity={1.4} />
      {/* warm key from upper-right */}
      <directionalLight position={[5, 12, 8]} intensity={1.8} color="#fff6e8" />
      {/* cool rim from upper-left */}
      <directionalLight position={[-8, 6, 4]} intensity={0.9} color="#d0e8ff" />
      {/* soft ground bounce */}
      <pointLight position={[0, -5, 7]} intensity={0.4} color="#ffffff" />
      <Suspense fallback={null}>
        {SCENE_MODELS.map((m) => (
          <FloatingModel key={m.path} {...m} />
        ))}
      </Suspense>
    </>
  )
}

export default function ExploreSection({ onExplore }: { onExplore: () => void }) {
  return (
    <div className="explore-3d">
      <div className="explore-3d__canvas">
        <Canvas
          camera={{ position: [0, 0, 12], fov: 55 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: '100%', height: '100%', background: 'transparent' }}
        >
          <Scene />
        </Canvas>
      </div>

      <div className="explore-3d__content">
        <p className="explore-3d__eyebrow">Augusta Dev</p>
        <h2 className="explore-3d__heading">Explore<br />Hackathons</h2>
        <button type="button" className="explore-3d__cta" onClick={onExplore}>
          EXPLORE
        </button>
      </div>
    </div>
  )
}
