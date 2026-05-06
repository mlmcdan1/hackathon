import { useEffect, useRef, useState } from 'react'
import './TvTestPatternScreen.css'

interface Props {
  progress: number
  visible: boolean
}

const COLOR_BARS = [
  '#d400b4',
  '#a000d4',
  '#00c8d4',
  '#00d44a',
  '#b4d400',
]

const GLITCH_LINES = [
  { top: '18%', opacity: 0.55, height: 3 },
  { top: '34%', opacity: 0.4,  height: 2 },
  { top: '51%', opacity: 0.6,  height: 4 },
  { top: '67%', opacity: 0.35, height: 2 },
  { top: '78%', opacity: 0.5,  height: 3 },
]

const LEFT_STRIPS = [
  { bg: '#fff', h: '12%' },
  { bg: '#000', h: '8%' },
  { bg: '#fff', h: '8%' },
  { bg: '#000', h: '12%' },
  { bg: '#fff', h: '8%' },
  { bg: '#000', h: '6%' },
  { bg: '#fff', h: '6%' },
  { bg: '#000', h: '12%' },
  { bg: '#fff', h: '8%' },
]

function StaticCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const tickRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width  = Math.floor(canvas.offsetWidth  / 3)
      canvas.height = Math.floor(canvas.offsetHeight / 3)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = () => {
      tickRef.current++
      // draw every other frame so it feels like 30 fps static, not 60
      if (tickRef.current % 2 === 0) {
        const { width, height } = canvas
        const img = ctx.createImageData(width, height)
        const d = img.data
        for (let i = 0; i < d.length; i += 4) {
          const v = Math.random() * 255 | 0
          d[i]   = v
          d[i+1] = v
          d[i+2] = v
          d[i+3] = Math.random() < 0.18 ? (60 + Math.random() * 80 | 0) : 0
        }
        ctx.putImageData(img, 0, 0)
      }
      frameRef.current = requestAnimationFrame(draw)
    }

    frameRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frameRef.current)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="tvtp-static"
      aria-hidden="true"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

export default function TvTestPatternScreen({ progress, visible }: Props) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (!visible) setExiting(true)
  }, [visible])

  return (
    <div className={`tvtp-root${exiting ? ' tvtp-root--exit' : ''}`}>

      {/* CRT scanlines */}
      <div className="tvtp-scanlines" aria-hidden="true" />

      {/* Chromatic aberration */}
      <div className="tvtp-chroma" aria-hidden="true" />

      {/* TV static noise */}
      <StaticCanvas />

      {/* Tracking / groove line */}
      <div className="tvtp-groove" aria-hidden="true" />

      <div className="tvtp-layout">

        {/* Left alternating white/black strips */}
        <div className="tvtp-left-strips">
          {LEFT_STRIPS.map((s, i) => (
            <div key={i} style={{ background: s.bg, height: s.h, width: '100%' }} />
          ))}
        </div>

        {/* Center: color bars + initialising band + glitch */}
        <div className="tvtp-center">

          <div className="tvtp-bars">
            {COLOR_BARS.map((c, i) => (
              <div key={i} className="tvtp-bar" style={{ background: c }} />
            ))}

            {/* Initialising band */}
            <div className="tvtp-init-band">
              <span className="tvtp-init-text">- + - INITIALISING - + -</span>
            </div>

            {/* Glitch interference lines */}
            {GLITCH_LINES.map((l, i) => (
              <div
                key={i}
                className="tvtp-glitch-line"
                style={{ top: l.top, opacity: l.opacity, height: l.height }}
                aria-hidden="true"
              />
            ))}
          </div>

          {/* Bottom gradient bar */}
          <div className="tvtp-gradient-bar" />

          {/* Bottom text row */}
          <div className="tvtp-bottom-text">
            <div className="tvtp-color-squares">
              <div style={{ background: '#00d44a', width: 24, height: 24 }} />
              <div style={{ background: '#d400b4', width: 24, height: 24 }} />
              <div style={{ background: '#00d44a', width: 16, height: 24 }} />
            </div>
            <span className="tvtp-kanji">赤<br />緑</span>
            <div className="tvtp-jp-text">
              <span>読み込み中</span>
              <span>これは悪い翻訳です</span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="tvtp-right">
          <div className="tvtp-kr-text">
            <span>나</span>
            <span>중</span>
            <span>에</span>
            <span>보</span>
            <span>자</span>
          </div>

          <div className="tvtp-right-info">
            <div className="tvtp-flag">
              <div style={{ background: '#000', flex: 1 }} />
              <div style={{ background: '#D00000', flex: 1 }} />
              <div style={{ background: '#FFCE00', flex: 1 }} />
            </div>
            <div className="tvtp-channel">30</div>
          </div>

          <div className="tvtp-right-stripes">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ background: i % 2 === 0 ? '#fff' : '#000', height: 6 }} />
            ))}
          </div>
        </div>
      </div>

      {/* Progress bar at very bottom */}
      <div className="tvtp-progress-track">
        <div className="tvtp-progress-fill" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  )
}
