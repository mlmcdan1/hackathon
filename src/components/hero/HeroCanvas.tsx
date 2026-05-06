import { useEffect, useRef } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { Clock } from 'three/src/core/Clock.js'
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera.js'
import { Box3 } from 'three/src/math/Box3.js'
import { AmbientLight } from 'three/src/lights/AmbientLight.js'
import { DirectionalLight } from 'three/src/lights/DirectionalLight.js'
import { PointLight } from 'three/src/lights/PointLight.js'
import { Group } from 'three/src/objects/Group.js'
import { Object3D } from 'three/src/core/Object3D.js'
import { Scene } from 'three/src/scenes/Scene.js'
import { Vector3 } from 'three/src/math/Vector3.js'
import { Quaternion } from 'three/src/math/Quaternion.js'
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer.js'
import { CanvasTexture } from 'three/src/textures/CanvasTexture.js'
import { VideoTexture } from 'three/src/textures/VideoTexture.js'
import { Color } from 'three/src/math/Color.js'
import { PlaneGeometry } from 'three/src/geometries/PlaneGeometry.js'
import { Mesh } from 'three/src/objects/Mesh.js'
import { AdditiveBlending } from 'three/src/constants.js'
import { MeshBasicMaterial } from 'three/src/materials/MeshBasicMaterial.js'
import { MeshStandardMaterial } from 'three/src/materials/MeshStandardMaterial.js'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

interface HeroCanvasProps {
  scrollProgress: number
}

const HERO_CONFIG = {
  cameraZ: 8,
  cameraY: 1.65,
  cameraX: -1.0,
  stageX: 1.05,
  stageY: -0.42,
  stageZ: -3.25,
  stageRotY: 0.32,
  modelScale: 8.15,
  modelRotY: -0.2,
  cameraFov: 30,
  cameraZoomFov: 22,
  lookAtX: -0.2,
  lookAtY: 1.02,
  lookAtZ: -3.2,
  stageZoomY: -0.34,
  stageZoomZ: -2.86,
  stageZoomRotY: 0,
  modelZoomScale: 8.3,
  screenZoomDistance: 2.2,
}

const heroModelLoader = new GLTFLoader()
export const heroAssetPromise = heroModelLoader.loadAsync('/ps1/scene.gltf')
void heroAssetPromise

function getCachedHeroModel() {
  return heroAssetPromise.then((asset: GLTF) => clone(asset.scene) as Group)
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function normalizeModel(model: Group) {
  const bounds = new Box3().setFromObject(model)
  const size = new Vector3()
  const center = new Vector3()

  bounds.getSize(size)
  bounds.getCenter(center)

  if (size.y > 0) {
    const scale = 1 / size.y
    model.scale.setScalar(scale)
  }

  const normalizedBounds = new Box3().setFromObject(model)
  const normalizedCenter = new Vector3()
  normalizedBounds.getCenter(normalizedCenter)

  model.position.sub(normalizedCenter)
  model.position.y -= normalizedBounds.min.y
}

function createRadialFalloffTexture(size: number) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return new CanvasTexture(canvas)
  }

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.45)')
  gradient.addColorStop(0.72, 'rgba(255,255,255,0.12)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  return new CanvasTexture(canvas)
}


function createCRTOverlayTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return new CanvasTexture(canvas)

  for (let y = 0; y < 512; y += 4) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.fillRect(0, y, 512, 1)
  }

  const vignette = ctx.createRadialGradient(256, 256, 72, 256, 256, 308)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(0.58, 'rgba(0,0,0,0)')
  vignette.addColorStop(0.82, 'rgba(0,0,0,0.24)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.7)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, 512, 512)

  return new CanvasTexture(canvas)
}

function createGlareTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return new CanvasTexture(canvas)

  const g1 = ctx.createRadialGradient(174, 56, 0, 174, 56, 82)
  g1.addColorStop(0, 'rgba(255,253,245,0.62)')
  g1.addColorStop(0.28, 'rgba(255,253,245,0.2)')
  g1.addColorStop(0.65, 'rgba(255,253,245,0.04)')
  g1.addColorStop(1, 'rgba(255,253,245,0)')
  ctx.fillStyle = g1
  ctx.fillRect(0, 0, 256, 256)

  const g2 = ctx.createRadialGradient(56, 196, 0, 56, 196, 28)
  g2.addColorStop(0, 'rgba(255,253,245,0.11)')
  g2.addColorStop(1, 'rgba(255,253,245,0)')
  ctx.fillStyle = g2
  ctx.fillRect(0, 0, 256, 256)

  return new CanvasTexture(canvas)
}

export default function HeroCanvas({ scrollProgress }: HeroCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLVideoElement>(null)
  const scrollProgressRef = useRef(scrollProgress)
  const isActiveRef = useRef(true)
  const animationFrameRef = useRef(0)

  useEffect(() => {
    scrollProgressRef.current = scrollProgress
  }, [scrollProgress])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new Scene()

    const overlayVideo = overlayRef.current
    if (!overlayVideo) return

    const camera = new PerspectiveCamera(30, 1, 0.1, 1000)
    const renderer = new WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    container.appendChild(renderer.domElement)

    const ambientLight = new AmbientLight('#ffeede', 0.95)
    const keyLight = new DirectionalLight('#ffe6d2', 1.9)
    keyLight.position.set(5, 6, 10)

    const fillLight = new DirectionalLight('#a78bfa', 0.9)
    fillLight.position.set(-6, 3, 8)

    const rimLight = new PointLight('#d8b4fe', 4.8, 18)
    rimLight.position.set(7, 4, -3)

    const accentLight = new PointLight('#89d0ff', 3.6, 14)
    accentLight.position.set(-4, 1.5, 7)

    const screenGlowLight = new PointLight('#fff0c4', 0, 20)
    const floorGlowLight = new PointLight('#f2d1ff', 0, 18)
    const screenGlowTarget = new Object3D()

    scene.add(ambientLight, keyLight, fillLight, rimLight, accentLight, screenGlowLight, floorGlowLight, screenGlowTarget)

    const stageGroup = new Group()
    scene.add(stageGroup)

    let model: Group | null = null
    let screenMesh: Mesh | null = null
    let floorGlowMesh: Mesh | null = null
    let screenAuraMesh: Mesh | null = null
    let backdropMesh: Mesh | null = null
    let contactShadowMesh: Mesh | null = null
    let consoleShadowMesh: Mesh | null = null
    let disposed = false
    const startCameraPosition = new Vector3()
    const startLookAt = new Vector3(HERO_CONFIG.lookAtX, HERO_CONFIG.lookAtY, HERO_CONFIG.lookAtZ)
    const screenWorldPosition = new Vector3()
    const screenWorldQuaternion = new Quaternion()
    const screenWorldNormal = new Vector3()
    const screenGlowPosition = new Vector3()
    const flickerAnchor = new Vector3()
    const zoomCameraPosition = new Vector3()
    const lookAtTarget = new Vector3()
    const cameraPosition = new Vector3()
    const clock = new Clock()
    const colorCanvas = document.createElement('canvas')
    colorCanvas.width = 1
    colorCanvas.height = 1
    const colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true })
    const currentColor = new Color('#f0d0ff')
    const targetColor = new Color('#f0d0ff')
    let frameCount = 0
    let smoothedFlicker = 0.8

    const floorGlowMaterial = new MeshBasicMaterial({
      color: '#ffe5ba',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
      side: 2,
    })
    const screenAuraMaterial = new MeshBasicMaterial({
      color: '#fff1d2',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
      side: 2,
    })
    const falloffTexture = createRadialFalloffTexture(512)

    floorGlowMaterial.map = falloffTexture
    screenAuraMaterial.map = falloffTexture

    const backdropMaterial = new MeshBasicMaterial({
      map: falloffTexture,
      color: '#f4ddff',
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      blending: AdditiveBlending,
      side: 2,
    })
    const contactShadowMaterial = new MeshBasicMaterial({
      map: falloffTexture,
      color: '#050306',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: 2,
    })
    const consoleShadowMaterial = new MeshBasicMaterial({
      map: falloffTexture,
      color: '#08060a',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: 2,
    })
    const crtOverlayTexture = createCRTOverlayTexture()
    crtOverlayTexture.flipY = false
    const glareTexture = createGlareTexture()
    glareTexture.flipY = false
    const crtOverlayMaterial = new MeshBasicMaterial({
      map: crtOverlayTexture,
      transparent: true,
      depthWrite: false,
      side: 2,
    })
    const glareMaterial = new MeshBasicMaterial({
      map: glareTexture,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: 2,
    })

    floorGlowMesh = new Mesh(new PlaneGeometry(3.2, 2), floorGlowMaterial)
    floorGlowMesh.rotation.x = -Math.PI / 2
    scene.add(floorGlowMesh)

    screenAuraMesh = new Mesh(new PlaneGeometry(2.3, 1.9), screenAuraMaterial)
    scene.add(screenAuraMesh)

    backdropMesh = new Mesh(new PlaneGeometry(8.8, 5.8), backdropMaterial)
    backdropMesh.position.set(1.8, 0.95, -6.8)
    scene.add(backdropMesh)

    contactShadowMesh = new Mesh(new PlaneGeometry(3, 1.55), contactShadowMaterial)
    contactShadowMesh.rotation.x = -Math.PI / 2
    scene.add(contactShadowMesh)

    consoleShadowMesh = new Mesh(new PlaneGeometry(2.3, 1.2), consoleShadowMaterial)
    consoleShadowMesh.rotation.x = -Math.PI / 2
    scene.add(consoleShadowMesh)

    const applyConfig = () => {
      const progress = easeInOutCubic(scrollProgressRef.current)
      const zoomProgress = easeInOutCubic(clamp(progress / 0.84, 0, 1))
      stageGroup.position.set(
        HERO_CONFIG.stageX,
        HERO_CONFIG.stageY + (HERO_CONFIG.stageZoomY - HERO_CONFIG.stageY) * zoomProgress,
        HERO_CONFIG.stageZ + (HERO_CONFIG.stageZoomZ - HERO_CONFIG.stageZ) * zoomProgress,
      )
      stageGroup.rotation.y = HERO_CONFIG.stageRotY + (HERO_CONFIG.stageZoomRotY - HERO_CONFIG.stageRotY) * zoomProgress

      if (model) {
        model.scale.setScalar(HERO_CONFIG.modelScale + (HERO_CONFIG.modelZoomScale - HERO_CONFIG.modelScale) * zoomProgress)
        model.position.set(0, 0, 0)
        model.rotation.set(0, HERO_CONFIG.modelRotY, 0)
      }

      startCameraPosition.set(HERO_CONFIG.cameraX, HERO_CONFIG.cameraY, HERO_CONFIG.cameraZ)

      if (screenMesh) {
        screenMesh.getWorldPosition(screenWorldPosition)
        screenMesh.getWorldQuaternion(screenWorldQuaternion)
        screenWorldNormal.set(0, 0, 1).applyQuaternion(screenWorldQuaternion).normalize()
        screenGlowPosition.copy(screenWorldPosition).addScaledVector(screenWorldNormal, 1.2)
        screenGlowLight.position.copy(screenGlowPosition)
        screenGlowTarget.position.copy(screenWorldPosition).add(new Vector3(-0.3, -0.08, 0))
        
        const time = clock.getElapsedTime()
        const pulseA = 0.5 + 0.5 * Math.sin(time * 8.8)
        const pulseB = 0.5 + 0.5 * Math.sin(time * 17.4 + 1.4)
        const pulseC = 0.5 + 0.5 * Math.sin(time * 31.2 + 0.3)
        const targetFlicker = 0.72 + pulseA * 0.18 + pulseB * 0.1 + pulseC * 0.08
        
        smoothedFlicker += (targetFlicker - smoothedFlicker) * 0.1
        const flicker = smoothedFlicker

        frameCount++
        if (frameCount % 4 === 0 && colorCtx && overlayVideo.readyState >= 2) {
          try {
            colorCtx.drawImage(overlayVideo, 0, 0, 1, 1)
            const imageData = colorCtx.getImageData(0, 0, 1, 1)
            targetColor.setRGB(
              imageData.data[0] / 255,
              imageData.data[1] / 255,
              imageData.data[2] / 255
            )
          } catch {
            // Ignore cross-origin errors
          }
        }
        currentColor.lerp(targetColor, 0.08)
        
        const hsl = { h: 0, s: 0, l: 0 }
        currentColor.getHSL(hsl)
        const vibrantColor = currentColor.clone().setHSL(hsl.h, Math.min(1, hsl.s * 1.5), Math.max(0.4, Math.min(1, hsl.l * 1.2)))

        screenGlowLight.color.copy(vibrantColor)
        floorGlowLight.color.copy(vibrantColor)

        screenGlowLight.intensity = (11 + (1 - zoomProgress) * 5.5) * flicker
        floorGlowLight.position.copy(screenWorldPosition).add(new Vector3(0.18, -1.28, 0.92))
        floorGlowLight.intensity = (5.6 + (1 - zoomProgress) * 2.2) * (0.82 + flicker * 0.35)

        flickerAnchor.copy(screenWorldPosition).addScaledVector(screenWorldNormal, 0.28)

        if (floorGlowMesh) {
          floorGlowMesh.position.set(flickerAnchor.x + 0.1, screenWorldPosition.y - 1.26, flickerAnchor.z + 0.72)
          floorGlowMesh.scale.set(0.92 + flicker * 0.12, 0.58 + flicker * 0.08, 1)
          floorGlowMaterial.opacity = 0.04 + flicker * 0.065
          floorGlowMaterial.color.copy(vibrantColor)
        }

        if (screenAuraMesh) {
          screenAuraMesh.position.copy(flickerAnchor).add(new Vector3(0.02, 0.04, 0.16))
          screenAuraMesh.quaternion.copy(screenWorldQuaternion)
          screenAuraMesh.scale.set(0.98 + flicker * 0.06, 0.9 + flicker * 0.05, 1)
          screenAuraMaterial.opacity = 0.045 + flicker * 0.045
          screenAuraMaterial.color.copy(vibrantColor)
        }

        if (backdropMesh) {
          backdropMesh.position.set(
            HERO_CONFIG.stageX + 0.55,
            1.2 + Math.sin(time * 0.22) * 0.05,
            HERO_CONFIG.stageZ - 4.7,
          )
          backdropMesh.scale.set(1.12 + pulseA * 0.02, 1.08 + pulseB * 0.016, 1)
          backdropMaterial.opacity = 0.035 + flicker * 0.02
          backdropMaterial.color.copy(vibrantColor)
        }

        if (contactShadowMesh) {
          contactShadowMesh.position.set(flickerAnchor.x - 0.02, screenWorldPosition.y - 1.245, flickerAnchor.z + 0.76)
          contactShadowMesh.scale.set(0.98, 0.7, 1)
          contactShadowMaterial.opacity = 0.36 - flicker * 0.07
        }

        if (consoleShadowMesh) {
          consoleShadowMesh.position.set(flickerAnchor.x + 1.58, screenWorldPosition.y - 1.245, flickerAnchor.z + 0.88)
          consoleShadowMesh.scale.set(1.04, 0.78, 1)
          consoleShadowMaterial.opacity = 0.28 - flicker * 0.04
        }

        zoomCameraPosition.copy(screenWorldPosition).addScaledVector(screenWorldNormal, HERO_CONFIG.screenZoomDistance)
        cameraPosition.copy(startCameraPosition).lerp(zoomCameraPosition, zoomProgress)
        lookAtTarget.copy(startLookAt).lerp(screenWorldPosition, zoomProgress)
      } else {
        screenGlowLight.intensity = 0
        floorGlowLight.intensity = 0
        floorGlowMaterial.opacity = 0
        screenAuraMaterial.opacity = 0
        backdropMaterial.opacity = 0

        contactShadowMaterial.opacity = 0
        consoleShadowMaterial.opacity = 0
        cameraPosition.copy(startCameraPosition)
        lookAtTarget.copy(startLookAt)
      }

      camera.position.copy(cameraPosition)
      camera.fov = HERO_CONFIG.cameraFov + (HERO_CONFIG.cameraZoomFov - HERO_CONFIG.cameraFov) * progress
      camera.updateProjectionMatrix()
      camera.lookAt(lookAtTarget)
    }

    const resize = () => {
      const width = container.clientWidth || 1
      const height = container.clientHeight || 1
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      renderer.render(scene, camera)
    }

    resize()
    applyConfig()
    window.addEventListener('resize', resize)

    getCachedHeroModel()
      .then((cachedScene) => {
        if (disposed) return
        model = cachedScene
        
        const videoTexture = new VideoTexture(overlayVideo)
        videoTexture.colorSpace = 'srgb'
        videoTexture.flipY = true

        // Glass mesh bounds from GLTF: x[-0.922,0.841] y[-1.036,0.628] z[-0.067,0.046]
        // Screen is shifted up from geometric center (-0.204) because the CRT bezel is
        // asymmetric — thicker at the bottom (controls/brand), thinner at the top.
        const SCREEN_W = 1.60
        const SCREEN_H = 1.46
        const SCREEN_POS = { x: -0.040, y: -0.13, z: 0.048 }

        const tvNode = model.getObjectByName('glass_and_fence_25') as Mesh
        if (tvNode) {
          const screenMat = new MeshStandardMaterial({
            map: videoTexture,
            emissive: new Color(0xffffff),
            emissiveMap: videoTexture,
            emissiveIntensity: 1.4,
            side: 2,
          })
          
          // Create a custom curved plane to simulate a CRT screen curvature
          const screenGeo = new PlaneGeometry(SCREEN_W, SCREEN_H, 32, 32)
          const posAttrib = screenGeo.attributes.position
          for (let i = 0; i < posAttrib.count; i++) {
            const nx = posAttrib.getX(i) / (SCREEN_W / 2)
            const ny = posAttrib.getY(i) / (SCREEN_H / 2)
            // Parabolic curve: pushes the edges back to fit inside the bezel without clipping
            const z = -(Math.pow(nx, 2) + Math.pow(ny, 2)) * 0.03
            posAttrib.setZ(i, z)
          }
          screenGeo.computeVertexNormals()

          screenMesh = new Mesh(screenGeo, screenMat)
          screenMesh.position.set(SCREEN_POS.x, SCREEN_POS.y, SCREEN_POS.z)
          tvNode.add(screenMesh)

          const crtOverlayMesh = new Mesh(screenGeo, crtOverlayMaterial)
          crtOverlayMesh.position.set(0, 0, 0.002)
          tvNode.add(crtOverlayMesh)

          const glareMesh = new Mesh(screenGeo, glareMaterial)
          glareMesh.position.set(0, 0, 0.004)
          tvNode.add(glareMesh)
        }

        normalizeModel(model)
        model.traverse((node) => {
          if (node.name === 'power_10' || node.name === 'power.001_11') {
            node.visible = false
          }
        })
        stageGroup.add(model)
        applyConfig()
        void overlayVideo.play().catch(() => {})
      })
      .catch((error: unknown) => {
        console.error('Failed to load PS1 hero model', error)
      })

    const animate = () => {
      if (disposed || !isActiveRef.current) return

      animationFrameRef.current = window.requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()

      applyConfig()

      if (model) {
        model.rotation.x = Math.sin(elapsed * 0.4) * 0.006
        model.rotation.y = HERO_CONFIG.modelRotY + Math.sin(elapsed * 0.18) * 0.02
        model.rotation.z = Math.cos(elapsed * 0.28) * 0.005
      }

      renderer.render(scene, camera)
    }

    const startAnimation = () => {
      if (disposed || !isActiveRef.current || animationFrameRef.current !== 0) return
      animationFrameRef.current = window.requestAnimationFrame(animate)
      void overlayVideo.play().catch(() => {})
    }

    const stopAnimation = () => {
      if (animationFrameRef.current !== 0) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = 0
      }
      overlayVideo.pause()
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        isActiveRef.current = entry?.isIntersecting ?? false

        if (isActiveRef.current) {
          applyConfig()
          renderer.render(scene, camera)
          startAnimation()
          return
        }

        stopAnimation()
      },
      {
        threshold: 0.08,
        rootMargin: '160px 0px',
      },
    )

    observer.observe(container)
    startAnimation()

    return () => {
      disposed = true
      observer.disconnect()
      stopAnimation()
      window.removeEventListener('resize', resize)
      overlayVideo.pause()
      falloffTexture.dispose()
      crtOverlayTexture.dispose()
      glareTexture.dispose()
      crtOverlayMaterial.dispose()
      glareMaterial.dispose()
      backdropMaterial.dispose()
      contactShadowMaterial.dispose()
      consoleShadowMaterial.dispose()
      floorGlowMaterial.dispose()
      screenAuraMaterial.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }} aria-hidden="true">
      <video
        ref={overlayRef}
        src="/video/Retro_Hackathon_Video_Generation.mp4"
        muted
        loop
        playsInline
        autoPlay
        style={{
          position: 'absolute',
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}