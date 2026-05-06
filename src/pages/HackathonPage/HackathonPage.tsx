import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import FogCanvas from '../../components/hero/FogCanvas'
import HeroCanvas, { heroAssetPromise } from '../../components/hero/HeroCanvas'
import HackathonNavbar from '../../components/navigation/HackathonNavbar'
import TvTestPatternScreen from '../../components/hero/TvTestPatternScreen'
import AuthModal from '../../components/auth/AuthModal'
import './HackathonPage.css'

const HERO_TRIGGER_PROGRESS = 0.72
const HERO_VISIBLE_PROGRESS = 0.78
const PROGRESS_LERP = 0.08
const PROGRESS_SNAP = 0.0015
const HERO_ZOOM_DURATION_MS = 2600
const HERO_EXIT_DELAY_MS = 2100
const SECTION_TRANSITION_MS = 760
const SECTION_SWITCH_DELTA = 90

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
  const [heroScrollProgress, setHeroScrollProgress] = useState(0)
  const [activeSection, setActiveSection] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [loaderProgress, setLoaderProgress] = useState(0)
  const [loaderVisible, setLoaderVisible] = useState(true)
  const [loaderMounted, setLoaderMounted] = useState(true)
  const [heroReady, setHeroReady] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
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
  }, [])

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const startTime = Date.now()

    const interval = setInterval(() => {
      if (cancelled) return
      const elapsed = (Date.now() - startTime) / 1000
      setLoaderProgress(Math.min(0.92, 1 - Math.exp(-elapsed * 1.0)))
    }, 60)

    heroAssetPromise.then(() => {
      if (cancelled) return
      clearInterval(interval)
      setLoaderProgress(1)
      setTimeout(() => {
        if (cancelled) return
        setLoaderVisible(false)
        setTimeout(() => {
          if (!cancelled) {
            setLoaderMounted(false)
            setHeroReady(true)
          }
        }, 700)
      }, 320)
    })

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const finishTransition = () => {
    isTransitioningRef.current = false
    setIsTransitioning(false)
  }

  const navigateToHackathons = () => {
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
  }

  const transitionToSection = (nextSection: number) => {
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
  }

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
  }, [])

  const visibleHeroProgress = Math.min(heroScrollProgress, HERO_VISIBLE_PROGRESS)

  const pageStyle = {
    '--hero-progress': visibleHeroProgress,
    '--section-index': activeSection,
  } as CSSProperties

  return (
    <div
      ref={pageRef}
      className={`hackathon-page${isTransitioning ? ' hackathon-page--transitioning' : ''}${heroReady ? ' hackathon-page--hero-ready' : ''}`}
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
        onSignOut={() => supabase.auth.signOut()}
      />

      <div className="scene-viewport">
        <section
          className={`scene-section hero-scene scene-section--${getSceneState(0, activeSection)}`}
          aria-label="Hero section"
        >
          <div className="hero-stage">
            <FogCanvas />
            <div className="hero-atmosphere hero-atmosphere--back" aria-hidden="true" />
            <div className="canvas-container">
              <HeroCanvas scrollProgress={heroScrollProgress} />
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
            <FogCanvas overlay fogOpacity={0.6} />
          </div>

          <div className="scene-hint">Scroll or swipe to enter</div>
        </section>

      </div>

      {loaderMounted && (
        <TvTestPatternScreen progress={loaderProgress} visible={loaderVisible} />
      )}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  )
}
