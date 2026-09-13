import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'

const MODEL_PATH = '/final_project/models/game_boy_challenge.glb'
useGLTF.preload(MODEL_PATH)
useTexture.preload('/final_project/textures/body_green.jpg')

// Same idle-presentation model used on the phases section — one static
// texture, gentle rock + bob, no video/zoom. Kept deliberately simple: the
// motion that matters here is the scroll-driven parallax on its wrapper
// (see .explore-parallax in HackathonPage.css), not the model itself.
function Model() {
  const { scene } = useGLTF(MODEL_PATH)
  const tex = useTexture('/final_project/textures/body_green.jpg')
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
    groupRef.current.rotation.y = 0.6 + Math.sin(t * 0.35) * 0.15
    groupRef.current.position.y = Math.sin(t * 0.7) * 0.1
  })

  return (
    <group ref={groupRef} rotation={[0, 0.6, -0.1]} scale={2.1}>
      <primitive object={clone} />
    </group>
  )
}

export default function ParallaxGameboy() {
  return (
    <Canvas
      camera={{ position: [0, 1.4, 5.2], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      dpr={[1, 1.5]}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 6, 4]} intensity={1.2} />
      <pointLight position={[-3, 2, 3]} intensity={0.4} color="#ffd857" />
      <Suspense fallback={null}>
        <Model />
      </Suspense>
    </Canvas>
  )
}
