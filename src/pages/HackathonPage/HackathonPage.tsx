import type { CSSProperties } from 'react'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import HackathonNavbar from '../../components/navigation/HackathonNavbar'
import AuthModal from '../../components/auth/AuthModal'
import RetroLoadingScreen from '../../components/hero/RetroLoadingScreen'
import './HackathonPage.css'

const HERO_TRIGGER_PROGRESS = 0.72
const HERO_VISIBLE_PROGRESS = 0.78
const PROGRESS_LERP = 0.08
const PROGRESS_SNAP = 0.0015
const HERO_ZOOM_DURATION_MS = 2600
const HERO_EXIT_DELAY_MS = 2100
const SECTION_TRANSITION_MS = 760
const SECTION_SWITCH_DELTA = 90
const HeroCanvas = lazy(() => import('../../components/hero/HeroCanvas'))
const FogCanvas = lazy(() => import('../../components/hero/FogCanvas'))

function shouldUseLightEffects() {
  if (typeof window === 'undefined') return false

  const nav = navigator as Navigator & { deviceMemory?: number }
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const compactViewport = window.innerWidth < 1100
  const lowCpu = (navigator.hardwareConcurrency ?? 8) <= 4
  const lowMemory = (nav.deviceMemory ?? 8) <= 4

  return prefersReducedMotion || coarsePointer || compactViewport || lowCpu || lowMemory
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

const sectionLinks = [
  { label: 'Overview', index: 0 },
  { label: 'Hackathons', index: 1 },
]


function getSceneState(sceneIndex: number, activeSection: number) {
  if (sceneIndex === activeSection) return 'active'
  if (sceneIndex < activeSection) return 'before'
  return 'after'
}

function findScrollableAncestor(target: EventTarget | null, boundary: HTMLElement) {
  if (!(target instanceof Element)) return null

  let current: HTMLElement | null = target as HTMLElement

  while (current && current !== boundary) {
    const style = window.getComputedStyle(current)
    const overflowY = style.overflowY === 'visible' ? style.overflow : style.overflowY
    const canScroll = (overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight + 1

    if (canScroll) return current
    current = current.parentElement
  }

  return null
}

function canScrollInDirection(element: HTMLElement, deltaY: number) {
  if (deltaY > 0) {
    return element.scrollTop + element.clientHeight < element.scrollHeight - 1
  }

  if (deltaY < 0) {
    return element.scrollTop > 1
  }

  return false
}

export default function HackathonPage() {
  const navigate = useNavigate()
  const [useLightEffects] = useState(() => shouldUseLightEffects())
  const [enhanceHero, setEnhanceHero] = useState(false)
  const [heroVisualReady, setHeroVisualReady] = useState(() => useLightEffects)
  const [heroScrollProgress, setHeroScrollProgress] = useState(0)
  const [activeSection, setActiveSection] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [loadingMounted, setLoadingMounted] = useState(() => !useLightEffects)
  const [loadingVisible, setLoadingVisible] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const loadingProgressRef = useRef(0)

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return

    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? null)
      setUserName(data.session?.user.user_metadata?.first_name ?? null)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null)
      setUserName(session?.user.user_metadata?.first_name ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (useLightEffects) return
    const start = performance.now()
    const FILL_DURATION = 1200
    let frameId: number
    const tick = (now: number) => {
      const t = Math.min((now - start) / FILL_DURATION, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setLoadingProgress(prev => {
        const next = Math.max(prev, eased * 0.85)
        loadingProgressRef.current = next
        return next
      })
      if (t < 1) frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [useLightEffects])

  const pageRef = useRef<HTMLDivElement>(null)
  const targetProgressRef = useRef(0)
  const displayProgressRef = useRef(0)
  const activeSectionRef = useRef(0)
  const isTransitioningRef = useRef(false)
  const animationFrameRef = useRef(0)
  const transitionTimeoutRef = useRef<number | null>(null)
  const sectionDeltaRef = useRef(0)
  const zoomStartTimeRef = useRef(-1)
  const zoomStartProgressRef = useRef(0)

  useEffect(() => {
    activeSectionRef.current = activeSection
  }, [activeSection])

  useEffect(() => {
    if (useLightEffects) return

    const win = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }

    const startEnhancement = () => {
      setEnhanceHero(true)
    }

    const idleId = win.requestIdleCallback?.(startEnhancement, { timeout: 1200 })
    const timeoutId = window.setTimeout(startEnhancement, 900)

    return () => {
      if (idleId !== undefined) {
        win.cancelIdleCallback?.(idleId)
      }
      window.clearTimeout(timeoutId)
    }
  }, [useLightEffects])

  useEffect(() => {
    if (useLightEffects) return

    let lastTimestamp = -1

    const animateProgress = (timestamp: number) => {
      if (lastTimestamp < 0) lastTimestamp = timestamp
      const deltaMs = Math.min(timestamp - lastTimestamp, 100)
      lastTimestamp = timestamp

      let next: number

      if (zoomStartTimeRef.current >= 0) {
        const elapsed = timestamp - zoomStartTimeRef.current
        const t = Math.min(elapsed / HERO_ZOOM_DURATION_MS, 1)
        next = zoomStartProgressRef.current + (1 - zoomStartProgressRef.current) * easeInOutCubic(t)
        if (t >= 1) zoomStartTimeRef.current = -1
      } else {
        const alpha = 1 - Math.pow(1 - PROGRESS_LERP, deltaMs / (1000 / 60))
        const current = displayProgressRef.current
        const target = targetProgressRef.current
        const lerped = current + (target - current) * alpha
        next = Math.abs(lerped - target) <= PROGRESS_SNAP ? target : lerped
      }

      displayProgressRef.current = next
      setHeroScrollProgress(next)

      animationFrameRef.current = window.requestAnimationFrame(animateProgress)
    }

    animationFrameRef.current = window.requestAnimationFrame(animateProgress)

    return () => {
      if (animationFrameRef.current !== 0) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [useLightEffects])

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [])

  const finishTransition = useCallback(() => {
    isTransitioningRef.current = false
    setIsTransitioning(false)
  }, [])

  const handleHeroReady = useCallback(() => {
    setHeroVisualReady(true)
    const startProgress = loadingProgressRef.current
    const startTime = performance.now()
    const COMPLETE_MS = 450
    const animateToFull = (now: number) => {
      const t = Math.min((now - startTime) / COMPLETE_MS, 1)
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      const next = startProgress + (1 - startProgress) * eased
      loadingProgressRef.current = next
      setLoadingProgress(next)
      if (t < 1) {
        requestAnimationFrame(animateToFull)
      } else {
        window.setTimeout(() => {
          setLoadingVisible(false)
          window.setTimeout(() => setLoadingMounted(false), 600)
        }, 250)
      }
    }
    requestAnimationFrame(animateToFull)
  }, [])

  const navigateToHackathons = useCallback(() => {
    if (isTransitioningRef.current) return

    isTransitioningRef.current = true
    setIsTransitioning(true)
    sectionDeltaRef.current = 0
    targetProgressRef.current = 1
    zoomStartTimeRef.current = performance.now()
    zoomStartProgressRef.current = displayProgressRef.current

    transitionTimeoutRef.current = window.setTimeout(() => {
      navigate('/hackathons')
    }, HERO_EXIT_DELAY_MS)
  }, [navigate])

  const transitionToSection = useCallback((nextSection: number) => {
    if (isTransitioningRef.current) return
    if (nextSection < 0 || nextSection > sectionLinks.length - 1) return
    if (nextSection === activeSectionRef.current) return

    isTransitioningRef.current = true
    setIsTransitioning(true)
    sectionDeltaRef.current = 0

    if (activeSectionRef.current === 0 && nextSection > 0) {
      targetProgressRef.current = 1
      zoomStartTimeRef.current = performance.now()
      zoomStartProgressRef.current = displayProgressRef.current
      transitionTimeoutRef.current = window.setTimeout(() => {
        setActiveSection(nextSection)
        window.setTimeout(finishTransition, SECTION_TRANSITION_MS)
      }, HERO_EXIT_DELAY_MS)
      return
    }

    setActiveSection(nextSection)

    if (nextSection === 0) {
      zoomStartTimeRef.current = -1
      displayProgressRef.current = HERO_TRIGGER_PROGRESS + 0.04
      setHeroScrollProgress(HERO_TRIGGER_PROGRESS + 0.04)
      targetProgressRef.current = 0
    }

    transitionTimeoutRef.current = window.setTimeout(finishTransition, SECTION_TRANSITION_MS)
  }, [finishTransition])

  useEffect(() => {
    const page = pageRef.current
    if (!page) return

    let touchStartY = 0

    const onWheel = (event: WheelEvent) => {
      if (isTransitioningRef.current) return

      if (activeSectionRef.current === 0) {
        event.preventDefault()
        if (event.deltaY > 0) navigateToHackathons()
        return
      }

      const scrollableAncestor = findScrollableAncestor(event.target, page)
      if (scrollableAncestor && canScrollInDirection(scrollableAncestor, event.deltaY)) {
        sectionDeltaRef.current = 0
        return
      }

      event.preventDefault()

      sectionDeltaRef.current += event.deltaY

      if (sectionDeltaRef.current >= SECTION_SWITCH_DELTA) {
        transitionToSection(activeSectionRef.current + 1)
      } else if (sectionDeltaRef.current <= -SECTION_SWITCH_DELTA) {
        transitionToSection(activeSectionRef.current - 1)
      }
    }

    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0
    }

    const onTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY ?? touchStartY
      const deltaY = touchStartY - currentY
      touchStartY = currentY
      event.preventDefault()

      if (isTransitioningRef.current) return

      if (activeSectionRef.current === 0) {
        event.preventDefault()
        if (deltaY > 8) navigateToHackathons()
        return
      }

      const scrollableAncestor = findScrollableAncestor(event.target, page)
      if (scrollableAncestor && canScrollInDirection(scrollableAncestor, deltaY)) {
        sectionDeltaRef.current = 0
        return
      }

      sectionDeltaRef.current += deltaY
      event.preventDefault()

      if (sectionDeltaRef.current >= SECTION_SWITCH_DELTA) {
        transitionToSection(activeSectionRef.current + 1)
      } else if (sectionDeltaRef.current <= -SECTION_SWITCH_DELTA) {
        transitionToSection(activeSectionRef.current - 1)
      }
    }

    page.addEventListener('wheel', onWheel, { passive: false })
    page.addEventListener('touchstart', onTouchStart, { passive: true })
    page.addEventListener('touchmove', onTouchMove, { passive: false })

    return () => {
      page.removeEventListener('wheel', onWheel)
      page.removeEventListener('touchstart', onTouchStart)
      page.removeEventListener('touchmove', onTouchMove)
    }
  }, [navigateToHackathons, transitionToSection])

  const visibleHeroProgress = Math.min(heroScrollProgress, HERO_VISIBLE_PROGRESS)

  const pageStyle = {
    '--hero-progress': visibleHeroProgress,
    '--section-index': activeSection,
  } as CSSProperties

  return (
    <div
      ref={pageRef}
      className={`hackathon-page${isTransitioning ? ' hackathon-page--transitioning' : ''}${!loadingMounted ? ' hackathon-page--hero-ready' : ''}`}
      id="top"
      style={pageStyle}
    >

      <HackathonNavbar
        activeSection={activeSection}
        hidden={false}
        links={sectionLinks}
        onNavigate={(sectionIndex) => {
          if (sectionIndex === 1) navigateToHackathons()
          else transitionToSection(sectionIndex)
        }}
        userEmail={userEmail}
        userName={userName}
        onSignIn={() => setShowAuthModal(true)}
        onSignOut={() => void supabase?.auth.signOut()}
      />

      <div className="scene-viewport">
        <section
          className={`scene-section hero-scene scene-section--${getSceneState(0, activeSection)}`}
          aria-label="Hero section"
        >
          <div className="hero-stage">
            {!useLightEffects && enhanceHero && (
              <Suspense fallback={null}>
                <FogCanvas />
              </Suspense>
            )}
            <div className="hero-atmosphere hero-atmosphere--back" aria-hidden="true" />
            <div className="canvas-container">
              {useLightEffects || !enhanceHero ? (
                <div
                  aria-hidden="true"
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'radial-gradient(circle at 50% 40%, rgba(255, 213, 125, 0.18), rgba(17, 13, 32, 0.92) 55%, #05030a 100%)',
                  }}
                />
              ) : (
                <Suspense
                  fallback={
                    <div
                      aria-hidden="true"
                      style={{
                        width: '100%',
                        height: '100%',
                        background: 'radial-gradient(circle at 50% 40%, rgba(255, 213, 125, 0.18), rgba(17, 13, 32, 0.92) 55%, #05030a 100%)',
                      }}
                    />
                  }
                >
                  <HeroCanvas
                    scrollProgress={heroScrollProgress}
                    onReady={handleHeroReady}
                  />
                </Suspense>
              )}
            </div>
            <div className="hero-atmosphere hero-atmosphere--glow" aria-hidden="true" />
            <div className="hero-grain" aria-hidden="true" />

            <div className="hero-content">
              <h1 className="hero-title-sr">Augusta Dev Hackathon 2026</h1>
              <img
                className="hero-title-art"
                src="/AugustaDevHeader.png"
                alt="Augusta Dev"
              />
              <p className="tagline">Think. Create. Innovate.</p>
              <p className="hero-body">
                Connect with a community of innovators and create without limits.
                Your project starts here.
              </p>
              <button className="cta-button" type="button" onClick={navigateToHackathons}>
                Enter Hackathon
              </button>
            </div>

            <div className="hero-atmosphere hero-atmosphere--front" aria-hidden="true" />
            {!useLightEffects && enhanceHero && (
              <Suspense fallback={null}>
                <FogCanvas overlay fogOpacity={0.45} />
              </Suspense>
            )}
          </div>

          <div className="scene-hint">Scroll or swipe to enter</div>
        </section>

      </div>
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
      {loadingMounted && (
        <RetroLoadingScreen progress={loadingProgress} visible={loadingVisible} />
      )}
    </div>
  )
}
