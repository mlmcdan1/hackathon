import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { simplex2 } from '../../lib/simplexNoise'

gsap.registerPlugin(ScrollTrigger)

// Ported from a reference CodePen (Fabio Ottaviani) that builds a "noise
// tube" out of 5,000 individually-positioned divs, each revealed (opacity
// 0 → 1) via a single GSAP ScrollTrigger timeline scrubbed against page
// scroll. We keep the exact positioning math (two simplex channels driving
// translateX / rotate / non-uniform scale, thin hsla outline stroke keyed
// by index) but draw it on one <canvas> instead of 5,000 DOM nodes.
//
// A `gsap.ticker` loop runs continuously alongside the scroll-driven
// reveal, slowly drifting hue (color creeps down the tube's length) and
// each ring's rotation (a gentle swirl in place) — the reveal alone read
// as static once a shape had faded in, since scroll only ever controlled
// visibility, never motion. Kept deliberately slow (a full color cycle
// takes over a minute) so it's a calm ambient presence, not something
// distracting you from the actual page content.
const SHAPE_COUNT = 1800
// Fixed, generously-tall backing height rather than one measured from this
// zone's actual content height. Measuring that height in JS (via
// ResizeObserver) has to race React StrictMode's double-mount and the
// lazy-loaded sections mounting in below — a race that intermittently lost
// in practice. A fixed height sidesteps the race entirely; the parent zone
// clips it down to size with `overflow: hidden` in CSS, so any excess is
// simply invisible, never a layout problem.
const TOTAL_HEIGHT = 7500
const BASE_RADIUS = 10 // half of the reference's 20px circle
const REVEAL_WINDOW = 0.15 // how much scroll-progress it takes one shape to fade in
const HUE_DRIFT_PER_SEC = 5 // degrees/sec the color appears to travel down the tube
const SPIN_RAD_PER_SEC = 0.06 // how fast each ring slowly swirls in place

interface Shape {
  y: number
  xOffset: number
  baseRotation: number
  scaleX: number
  scaleY: number
  hue: number
  spinDir: 1 | -1
}

const SHAPES: Shape[] = Array.from({ length: SHAPE_COUNT }, (_, i) => {
  const n1 = simplex2(i * 0.003, i * 0.0033)
  const n2 = simplex2(i * 0.002, i * 0.001)
  return {
    y: (i / SHAPE_COUNT) * TOTAL_HEIGHT,
    xOffset: n2 * 200,
    baseRotation: (n2 * 270 * Math.PI) / 180,
    scaleX: 3 + n1 * 2,
    scaleY: 3 + n2 * 2,
    hue: Math.floor(i * 0.3) % 360,
    spinDir: i % 2 === 0 ? 1 : -1,
  }
})

// revealHeight is the ACTUAL visible height of this zone (measured fresh
// every frame — see the tick loop below), not the canvas's fixed 7500px
// backing height. Using the fixed height here was the real bug: a shape's
// reveal point was previously `shape.y / TOTAL_HEIGHT`, so on a page where
// the visible zone was only, say, 4000px tall, every visible shape had
// finished revealing by roughly 4000/7500 ≈ 53% of the way through the
// scroll range — the whole animation front-loaded into the first half of
// the scroll, then did nothing for the rest, reading as "already done"
// almost as soon as you started scrolling.
function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  progress: number,
  time: number,
  revealHeight: number
) {
  ctx.clearRect(0, 0, width, TOTAL_HEIGHT)
  const centerX = width / 2

  for (const shape of SHAPES) {
    const revealAt = gsap.utils.clamp(0, 1, shape.y / revealHeight)
    const reveal = gsap.utils.clamp(0, 1, (progress - revealAt) / REVEAL_WINDOW)
    if (reveal <= 0) continue

    const hue = (shape.hue + time * HUE_DRIFT_PER_SEC) % 360
    const rotation = shape.baseRotation + time * SPIN_RAD_PER_SEC * shape.spinDir

    ctx.save()
    ctx.translate(centerX + shape.xOffset, shape.y)
    ctx.rotate(rotation)
    ctx.beginPath()
    ctx.ellipse(0, 0, BASE_RADIUS * shape.scaleX, BASE_RADIUS * shape.scaleY, 0, 0, Math.PI * 2)
    ctx.strokeStyle = `hsla(${hue}, 70%, 70%, ${0.6 * reveal})`
    ctx.lineWidth = 0.8
    ctx.stroke()
    ctx.restore()
  }
}

export default function ScrollTubeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = canvas?.parentElement
    const ctx = canvas?.getContext('2d')
    if (!canvas || !container || !ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    // Width is available immediately and doesn't grow over time the way
    // this zone's height does (lazy sections add height, not width), so
    // there's no equivalent race here — safe to read once up front.
    const width = Math.max(1, Math.round(container.getBoundingClientRect().width))
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(TOTAL_HEIGHT * dpr)
    canvas.style.height = `${TOTAL_HEIGHT}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const progressRef = { current: 0 }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      drawFrame(ctx, width, 1, 0, container.getBoundingClientRect().height || TOTAL_HEIGHT)
      return
    }

    drawFrame(ctx, width, 0, 0, container.getBoundingClientRect().height || TOTAL_HEIGHT)

    const ctxGsap = gsap.context(() => {
      ScrollTrigger.create({
        trigger: container,
        start: 'top 75%',
        end: 'bottom bottom',
        scrub: 1,
        onUpdate: (self) => {
          progressRef.current = self.progress
        },
      })
    })

    // Only animate while the tube's zone is anywhere near the viewport —
    // same reasoning as gating the site's WebGL canvases: no point paying
    // for a continuous redraw loop while it's scrolled far out of view.
    let isNearViewport = true
    const io = new IntersectionObserver(([entry]) => { isNearViewport = entry.isIntersecting }, {
      rootMargin: '50% 0px',
    })
    io.observe(container)

    const start = performance.now()
    const tick = () => {
      if (!isNearViewport) return
      const time = (performance.now() - start) / 1000
      // Measured fresh every frame rather than cached — cheap (one layout
      // read) and always correct the instant lazy content below finishes
      // growing this zone, with no observer/timing race to get wrong.
      const revealHeight = container.getBoundingClientRect().height || TOTAL_HEIGHT
      drawFrame(ctx, width, progressRef.current, time, revealHeight)
    }
    gsap.ticker.add(tick)

    return () => {
      gsap.ticker.remove(tick)
      io.disconnect()
      ctxGsap.revert()
    }
  }, [])

  return <canvas ref={canvasRef} className="hp-scroll-tube-bg" aria-hidden="true" />
}
