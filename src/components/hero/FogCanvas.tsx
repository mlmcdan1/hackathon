import { useEffect, useRef } from 'react'
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer.js'
import { Scene } from 'three/src/scenes/Scene.js'
import { OrthographicCamera } from 'three/src/cameras/OrthographicCamera.js'
import { PlaneGeometry } from 'three/src/geometries/PlaneGeometry.js'
import { ShaderMaterial } from 'three/src/materials/ShaderMaterial.js'
import { Mesh } from 'three/src/objects/Mesh.js'
import { Vector2 } from 'three/src/math/Vector2.js'
import { Vector3 } from 'three/src/math/Vector3.js'
import { Color } from 'three/src/math/Color.js'
import { AdditiveBlending, NormalBlending } from 'three/src/constants.js'

const VERT = `
varying vec2 vUv;
void main() { 
  vUv = uv;
  gl_Position = vec4(position, 1.0); 
}`

const FRAG = `
varying vec2 vUv;
uniform float iTime;
uniform vec2 iMouse;
uniform float isOverlay;
uniform float blurFactor;
uniform vec3 baseColor;
uniform vec3 lowlightColor;
uniform vec3 midtoneColor;
uniform vec3 highlightColor;
uniform float zoom;

float random(in vec2 st) {
  return fract(sin(dot(st.xy, vec2(0.129898, 0.78233))) * 437.585453123);
}

float noise(in vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(in vec2 st) {
  float v = 0.0;
  float a = blurFactor;
  vec2 shift = vec2(100.0);
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 6; ++i) {
    v += a * noise(st);
    st = rot * st * 2.0 + shift;
    a *= (1.0 - blurFactor);
  }
  return v;
}

void main() {
  // Use safe UV coordinates instead of physical screen pixels
  vec2 st = vUv * 3.0 * zoom;

  // Vanta-style mouse parallax
  st += iMouse * 0.15;

  vec2 q = vec2(fbm(st), fbm(st + vec2(1.0)));
  vec2 dir = vec2(0.15, 0.126);
  vec2 r = vec2(
    fbm(st + q + vec2(1.7, 9.2) + dir.x * iTime),
    fbm(st + q + vec2(8.3, 2.8) + dir.y * iTime)
  );

  float f = fbm(st + r);
  float fogIntensity = f*f*f + 0.6*f*f + 0.5*f;

  if (isOverlay > 0.5) {
    // Overlay mode: pure fog wisps, transparent background
    // Darken the color emission further so it acts like subtle smoke rather than bright light
    vec3 overlayColor = mix(midtoneColor, highlightColor, clamp(r.x, 0.0, 1.0)) * 0.5;
    
    // Keep it thick enough to be seen, but just slightly scaled back
    float alpha = clamp(fogIntensity * 0.85, 0.0, 1.0);
    
    // Mask out the left side completely (where the text is), fading in towards the right
    float textMask = smoothstep(0.35, 0.65, vUv.x);
    alpha *= textMask;
    
    gl_FragColor = vec4(overlayColor, alpha);
  } else {
    // Background mode: standard Vanta fog
    vec3 color = mix(baseColor, lowlightColor, clamp(f * f * 4.0, 0.0, 1.0));
    color = mix(color, midtoneColor, clamp(length(q), 0.0, 1.0));
    color = mix(color, highlightColor, clamp(r.x, 0.0, 1.0));
    vec3 finalColor = mix(baseColor, color, fogIntensity);
    gl_FragColor = vec4(finalColor, 1.0);
  }
}
`

function toVec3(hex: string) {
  const c = new Color(hex)
  return new Vector3(c.r, c.g, c.b)
}

interface FogCanvasProps {
  overlay?: boolean;
  fogOpacity?: number;
}

export default function FogCanvas({ overlay = false, fogOpacity = 1 }: FogCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new WebGLRenderer({ antialias: false, alpha: overlay, powerPreference: 'low-power' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1))
    
    // Guarantee true transparency for the overlay
    if (overlay) {
      renderer.setClearColor(0x000000, 0)
    }

    Object.assign(renderer.domElement.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', pointerEvents: 'none'
    })
    container.appendChild(renderer.domElement)

    const scene = new Scene()
    // Use orthographic camera to guarantee a perfect 1:1 screen mapping
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const uniforms = {
      iTime:       { value: 0 },
      iMouse:      { value: new Vector2(0, 0) },
      isOverlay:   { value: overlay ? 1.0 : 0.0 },
      blurFactor:  { value: 0.6 },
      zoom:        { value: 0.9 },
      baseColor:      { value: toVec3('#03020a') },
      lowlightColor:  { value: toVec3('#0a0330') },
      midtoneColor:   { value: toVec3('#200c5a') },
      highlightColor: { value: toVec3('#4e1aaa') },
    }

    const material = new ShaderMaterial({ 
      uniforms, 
      vertexShader: VERT, 
      fragmentShader: FRAG,
      transparent: overlay,
      blending: overlay ? AdditiveBlending : NormalBlending,
      depthWrite: false
    })
    scene.add(new Mesh(new PlaneGeometry(2, 2), material))

    const startTime = performance.now()
    let frameId = 0
    let disposed = false
    let visible = true

    const resize = () => {
      const w = container.clientWidth || 1
      const h = container.clientHeight || 1
      renderer.setSize(w, h)
    }

    const handleMouseMove = (e: MouseEvent) => {
      uniforms.iMouse.value.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      )
    }

    const animate = () => {
      if (disposed || !visible) return
      frameId = requestAnimationFrame(animate)
      uniforms.iTime.value = ((performance.now() - startTime) / 1000) * (overlay ? 1.1 : 0.8)
      renderer.render(scene, camera)
    }

    // Pause the rAF loop when the canvas is off-screen — the fog shader is
    // expensive and there's no reason to run it while the hero is not visible.
    const io = new IntersectionObserver(
      ([entry]) => {
        const wasVisible = visible
        visible = entry.isIntersecting
        if (visible && !wasVisible && !disposed) animate()
      },
      { threshold: 0 }
    )
    io.observe(container)

    resize()
    animate()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      disposed = true
      io.disconnect()
      cancelAnimationFrame(frameId)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', resize)
      material.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [overlay])

  // Overlay gets a higher z-index to float over the 3D canvas and text
  const zIndex = overlay ? 50 : -10
  return <div ref={containerRef} style={{ position: 'absolute', inset: 0, zIndex, opacity: fogOpacity, transition: 'opacity 760ms cubic-bezier(0.2, 0.84, 0.24, 1)', pointerEvents: 'none' }} aria-hidden="true" />
}
