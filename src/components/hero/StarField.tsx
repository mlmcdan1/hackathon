import { useMemo } from 'react'

function generateShadows(count: number, spread: number): string {
  const parts: string[] = []
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * spread)
    const y = Math.floor(Math.random() * spread)
    parts.push(`${x}px ${y}px #fff`)
  }
  return parts.join(', ')
}

// Generated once at module load — stable for the session
const SHADOWS_SM = generateShadows(700, 2000)
const SHADOWS_MD = generateShadows(200, 2000)
const SHADOWS_LG = generateShadows(100, 2000)

interface StarFieldProps {
  opacity: number
}

export default function StarField({ opacity }: StarFieldProps) {
  const style = useMemo(() => ({ opacity, transition: 'opacity 0.6s ease' }), [opacity])

  return (
    <div className="sf-starfield" style={style} aria-hidden="true">
      <div className="sf-stars sf-stars--sm" style={{ boxShadow: SHADOWS_SM }} />
      <div className="sf-stars sf-stars--md" style={{ boxShadow: SHADOWS_MD }} />
      <div className="sf-stars sf-stars--lg" style={{ boxShadow: SHADOWS_LG }} />
    </div>
  )
}
