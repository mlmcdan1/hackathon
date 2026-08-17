import { useEffect, useRef, useState } from 'react'

export function useNavScroll(scrolledThreshold = 40, hiddenThreshold = 80) {
  const [scrolled, setScrolled] = useState(false)
  const [hidden,   setHidden]   = useState(false)

  const lastYRef    = useRef(0)
  const scrolledRef = useRef(false)
  const hiddenRef   = useRef(false)

  useEffect(() => {
    const onScroll = () => {
      const y     = window.scrollY
      const delta = y - lastYRef.current
      lastYRef.current = y

      const nextScrolled = y > scrolledThreshold
      if (nextScrolled !== scrolledRef.current) {
        scrolledRef.current = nextScrolled
        setScrolled(nextScrolled)
      }

      const nextHidden = y > hiddenThreshold && delta > 0
      if (nextHidden !== hiddenRef.current) {
        hiddenRef.current = nextHidden
        setHidden(nextHidden)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [scrolledThreshold, hiddenThreshold])

  return { scrolled, hidden }
}
