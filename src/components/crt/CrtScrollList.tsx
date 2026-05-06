import { useEffect, useId, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import './CrtScrollList.css'

interface CrtScrollListProps {
  items: ReactNode[]
  ariaLabel?: string
  className?: string
  itemClassName?: string
  height?: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function easeOutQuad(value: number) {
  return 1 - (1 - value) * (1 - value)
}

export default function CrtScrollList({
  items,
  ariaLabel = 'Scrollable CRT list',
  className = '',
  itemClassName = '',
  height = '70vh',
}: CrtScrollListProps) {
  const filterId = useId().replace(/:/g, '')
  const viewportRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])
  const frameRef = useRef<number | null>(null)
  const ghostResetRef = useRef<number | null>(null)
  const lastScrollTopRef = useRef(0)

  const displacementMap = useMemo(() => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id="blur">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        <rect width="100" height="100" fill="rgb(128,128,0)" />
        <ellipse cx="22" cy="50" rx="24" ry="28" fill="rgb(92,128,0)" filter="url(#blur)" />
        <ellipse cx="78" cy="50" rx="24" ry="28" fill="rgb(164,128,0)" filter="url(#blur)" />
        <ellipse cx="50" cy="22" rx="28" ry="24" fill="rgb(128,92,0)" filter="url(#blur)" />
        <ellipse cx="50" cy="78" rx="28" ry="24" fill="rgb(128,164,0)" filter="url(#blur)" />
        <circle cx="50" cy="50" r="23" fill="rgb(128,128,0)" />
      </svg>
    `

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const setGhosting = (velocity: number) => {
      const magnitude = Math.abs(velocity)
      const opacity = clamp(magnitude / 42, 0, 0.18)
      const offsetY = clamp(velocity * 0.12, -7, 7)
      const offsetX = clamp(velocity * 0.03, -1.5, 1.5)

      viewport.style.setProperty('--crt-ghost-opacity', opacity.toFixed(3))
      viewport.style.setProperty('--crt-ghost-y', `${offsetY.toFixed(2)}px`)
      viewport.style.setProperty('--crt-ghost-x', `${offsetX.toFixed(2)}px`)

      if (ghostResetRef.current !== null) {
        window.clearTimeout(ghostResetRef.current)
      }

      ghostResetRef.current = window.setTimeout(() => {
        viewport.style.setProperty('--crt-ghost-opacity', '0')
        viewport.style.setProperty('--crt-ghost-y', '0px')
        viewport.style.setProperty('--crt-ghost-x', '0px')
        ghostResetRef.current = null
      }, 110)
    }

    const syncItems = () => {
      frameRef.current = null

      const viewportRect = viewport.getBoundingClientRect()
      const viewportCenter = viewportRect.top + viewportRect.height / 2
      const influenceRadius = viewportRect.height * 0.44

      itemRefs.current.forEach((item) => {
        if (!item) return

        const rect = item.getBoundingClientRect()
        const itemCenter = rect.top + rect.height / 2
        const distance = Math.abs(itemCenter - viewportCenter)
        const closeness = clamp(1 - distance / influenceRadius, 0, 1)
        const emphasis = easeOutQuad(closeness)

        item.style.setProperty('--crt-item-scale', (1 + emphasis * 0.01).toFixed(3))
        item.style.setProperty('--crt-item-opacity', `${(0.92 + emphasis * 0.08).toFixed(3)}`)
        item.style.setProperty('--crt-item-lift', `${(emphasis * -1.2).toFixed(2)}px`)
      })
    }

    const requestSync = () => {
      if (frameRef.current !== null) return
      frameRef.current = window.requestAnimationFrame(syncItems)
    }

    const onScroll = () => {
      const nextTop = viewport.scrollTop
      setGhosting(nextTop - lastScrollTopRef.current)
      lastScrollTopRef.current = nextTop
      requestSync()
    }
    lastScrollTopRef.current = viewport.scrollTop
    requestSync()
    viewport.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', requestSync)

    return () => {
      viewport.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', requestSync)
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
      }
      if (ghostResetRef.current !== null) {
        window.clearTimeout(ghostResetRef.current)
      }
    }
  }, [items])

  return (
    <div className={`crt-scroll-list ${className}`.trim()} style={{ '--crt-list-height': height } as React.CSSProperties}>
      <svg className="crt-scroll-list__defs" aria-hidden="true" focusable="false">
        <defs>
          <filter id={filterId} x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
            <feImage href={displacementMap} preserveAspectRatio="none" result="bulgeMap" x="0" y="0" width="100%" height="100%" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="bulgeMap"
              scale="18"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div ref={viewportRef} className="crt-scroll-list__viewport" aria-label={ariaLabel}>
        <div className="crt-scroll-list__surface" style={{ filter: `url(#${filterId})` }}>
          {items.map((item, index) => (
            <div
              key={index}
              ref={(element) => {
                itemRefs.current[index] = element
              }}
              className={`crt-scroll-list__item ${itemClassName}`.trim()}
            >
              <div className="crt-scroll-list__item-shell">
                {item}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="crt-scroll-list__glass" aria-hidden="true" />
      <div className="crt-scroll-list__center-glow" aria-hidden="true" />
      <div className="crt-scroll-list__rgb" aria-hidden="true" />
      <div className="crt-scroll-list__scanlines" aria-hidden="true" />
      <div className="crt-scroll-list__vignette" aria-hidden="true" />
    </div>
  )
}
