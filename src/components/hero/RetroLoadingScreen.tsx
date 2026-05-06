import { useEffect, useState } from 'react'

const BAR_COLORS = [
  '#7a0000', '#920000', '#ab0000', '#c40000',
  '#d42800', '#e04800', '#e86800', '#ef8800',
  '#f0a800', '#f0c000', '#e8d400', '#d8dc00',
  '#b8dc00', '#94d400', '#68c800', '#3ec000',
  '#18b800', '#00ae00', '#00a600', '#009c00',
]

const STARS = Array.from({ length: 40 }, (_, i) => ({
  left: `${(i * 73.1 + 11.3) % 100}%`,
  top: `${(i * 47.7 + 23.9) % 88}%`,
  size: i % 3 === 0 ? 2 : 1,
  opacity: 0.3 + (i % 7) * 0.09,
}))

interface RetroLoadingScreenProps {
  progress: number
  visible: boolean
}

export default function RetroLoadingScreen({ progress, visible }: RetroLoadingScreenProps) {
  const [exiting, setExiting] = useState(false)
  const filledCells = Math.round(progress * BAR_COLORS.length)

  useEffect(() => {
    if (!visible) setExiting(true)
  }, [visible])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Press Start 2P", cursive',
        opacity: exiting ? undefined : 1,
        animation: exiting ? 'crt-off 0.62s ease-in forwards' : 'none',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {exiting && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 'calc(50% - 1px)',
            height: 2,
            background: '#fff',
            boxShadow: '0 0 18px 6px rgba(255,255,255,0.9), 0 0 40px 14px rgba(200,220,255,0.45)',
            animation: 'crt-line-fade 0.7s ease-in forwards',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
      )}

      {STARS.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            background: '#fff',
            opacity: s.opacity,
          }}
        />
      ))}

      <div
        style={{
          position: 'absolute',
          top: 28,
          left: 32,
          color: '#fff',
          fontSize: 10,
          lineHeight: 1.9,
          userSelect: 'none',
        }}
      >
        <div>1P</div>
        <div>00</div>
      </div>

      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div
          className="retro-blink"
          style={{
            color: '#fff',
            fontSize: 20,
            letterSpacing: 5,
            marginBottom: 36,
          }}
        >
          LOADING...
        </div>

        <div
          style={{
            display: 'flex',
            gap: 4,
            width: 'min(480px, 88vw)',
          }}
        >
          {BAR_COLORS.map((color, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 32,
                background: i < filledCells ? color : '#111',
                border: '1px solid #2a2a2a',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
