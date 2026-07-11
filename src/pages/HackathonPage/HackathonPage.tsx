import type { CSSProperties } from 'react'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import claudeRetroPC from '../../assets/ClaudeRetroPC.jpeg'
import computerIcon from '../../assets/ComputerIcon.png'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import HackathonNavbar from '../../components/navigation/HackathonNavbar'
import GameboysSection from '../../components/gameboys/GameboysSection'
import GlitchySection from '../../components/glitchy/GlitchySection'
import AuthModal from '../../components/auth/AuthModal'
import RetroLoadingScreen from '../../components/hero/RetroLoadingScreen'
import './HackathonPage.css'

gsap.registerPlugin(ScrollTrigger)

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


const STATS = [
  { value: 47, prefix: '', suffix: '', label: 'Builders' },
  { value: 6, prefix: '', suffix: '', label: 'Events' },
  { value: 12, prefix: '$', suffix: 'K', label: 'In Prizes' },
  { value: 14, prefix: '', suffix: '', label: 'Teams' },
]



// Pre-computed so positions are stable across renders
const MK_EMBERS = Array.from({ length: 28 }, (_, i) => ({
  left: `${((i * 37 + Math.sin(i * 2.3) * 400 + 5000) % 96) + 2}%`,
  bottom: `${((i * 23 + Math.cos(i * 1.7) * 300 + 3000) % 85) + 5}%`,
  width: `${1 + (i % 3)}px`,
  height: `${1 + (i % 3)}px`,
  animationDelay: `${(i * 0.38) % 5}s`,
  animationDuration: `${2.2 + (i * 0.19) % 2.8}s`,
} as CSSProperties))

function StatCounter({
  value,
  prefix,
  suffix,
  label,
  revealed,
}: {
  value: number
  prefix: string
  suffix: string
  label: string
  revealed: boolean
}) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!revealed) return
    let frame = 0
    const total = 80
    const tick = () => {
      frame++
      const t = Math.min(frame / total, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(value * eased))
      if (frame < total) requestAnimationFrame(tick)
    }
    const id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [revealed, value])

  return (
    <div className="hp-stat">
      <span className="hp-stat__val">
        {prefix}{display}{suffix}
      </span>
      <span className="hp-stat__lbl">{label}</span>
    </div>
  )
}

export default function Homepage() {
  const navigate = useNavigate()
  const [useLightEffects] = useState(() => shouldUseLightEffects())
  const [enhanceHero, setEnhanceHero] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loadingMounted, setLoadingMounted] = useState(() => !useLightEffects)
  const [loadingVisible, setLoadingVisible] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const loadingProgressRef = useRef(0)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())

  const [navHidden, setNavHidden] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)
  const navScrolledRef = useRef(false)
  const navHiddenRef  = useRef(false)

  // Lenis smooth scroll, synced to GSAP ticker + navbar hide/show
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.12, smoothWheel: true })
    let lastY = 0
    lenis.on('scroll', ({ scroll }: { scroll: number }) => {
      ScrollTrigger.update()
      const delta    = scroll - lastY
      lastY          = scroll

      // Only call setState when the boolean actually flips — avoids re-renders on every tick
      const scrolled = scroll > 60
      if (scrolled !== navScrolledRef.current) {
        navScrolledRef.current = scrolled
        setNavScrolled(scrolled)
      }

      const hidden = scroll > 80 && delta > 0
      if (hidden !== navHiddenRef.current) {
        navHiddenRef.current = hidden
        setNavHidden(hidden)
      }
    })
    gsap.ticker.add((time) => lenis.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)
    return () => {
      lenis.destroy()
    }
  }, [])

  async function resolveAdmin(session: import('@supabase/supabase-js').Session | null) {
    if (!session || !supabase) { setIsAdmin(false); return }
    if (session.user.email === import.meta.env.VITE_ADMIN_EMAIL) { setIsAdmin(true); return }
    const { data } = await supabase.from('admins').select('id').eq('user_id', session.user.id).maybeSingle()
    setIsAdmin(!!data)
  }

  // Auth
  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? null)
      setUserName(data.session?.user.user_metadata?.first_name ?? null)
      resolveAdmin(data.session ?? null)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null)
      setUserName(session?.user.user_metadata?.first_name ?? null)
      resolveAdmin(session ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Loading bar fill
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

  // Delay heavy 3D until idle
  useEffect(() => {
    if (useLightEffects) return
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    const start = () => setEnhanceHero(true)
    const idleId = win.requestIdleCallback?.(start, { timeout: 1200 })
    const timeoutId = window.setTimeout(start, 900)
    return () => {
      if (idleId !== undefined) win.cancelIdleCallback?.(idleId)
      window.clearTimeout(timeoutId)
    }
  }, [useLightEffects])





  // Global cursor-driven tilt for section 2 image
  useEffect(() => {
    if (loadingMounted) return
    const frame = document.querySelector('.hp-intro__img-frame') as HTMLElement | null
    if (!frame) return
    let curRotX = 0, curRotY = 0, tarRotX = 0, tarRotY = 0, raf: number
    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = (e.clientY / window.innerHeight) * 2 - 1
      tarRotY =  nx * 12
      tarRotX = -ny * 8
    }
    const tick = () => {
      curRotX += (tarRotX - curRotX) * 0.05
      curRotY += (tarRotY - curRotY) * 0.05
      frame.style.transform = `perspective(900px) translateY(-15%) rotate(-4deg) rotateX(${curRotX}deg) rotateY(${curRotY}deg)`
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    raf = requestAnimationFrame(tick)
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf) }
  }, [loadingMounted])

  // Typewriter triggers when section 2 scrolls into view
  useEffect(() => {
    if (loadingMounted) return
    const section = document.querySelector('.hp-intro')
    if (!section) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { section.classList.add('is-visible'); obs.disconnect() } },
      { threshold: 0.25 }
    )
    obs.observe(section)
    return () => obs.disconnect()
  }, [loadingMounted])

  // Section reveal observer + GSAP game-world animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.section
            if (id) setRevealed(prev => new Set([...prev, id]))
          }
        })
      },
      { threshold: 0.12 },
    )
    const els = document.querySelectorAll('[data-section]')
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [loadingMounted])

  // GSAP scroll-driven game world animations
  useEffect(() => {
    if (loadingMounted) return // wait until loading screen is gone

    const ctx = gsap.context(() => {


      // ── MORTAL KOMBAT: stat values slam in one by one ──
      gsap.from('.hp-stat', {
        y: 60,
        opacity: 0,
        scale: 0.6,
        duration: 0.5,
        ease: 'back.out(2)',
        stagger: 0.1,
        scrollTrigger: {
          trigger: '.hp-stats',
          start: 'top 75%',
          toggleActions: 'play none none none',
        },
      })

      // MK screen flash on entry
      gsap.from('.mk-fight-flash', {
        duration: 0,
        scrollTrigger: {
          trigger: '.hp-stats',
          start: 'top 75%',
          toggleActions: 'play none none none',
        },
      })




    })

    return () => ctx.revert()
  }, [loadingMounted])


  const handleHeroReady = useCallback(() => {
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

  return (
    <div className={`homepage hp-scrollable${!loadingMounted ? ' hackathon-page--hero-ready' : ''}`}>
      <HackathonNavbar
        activeSection={0}
        hidden={navHidden}
        scrolled={navScrolled}
        links={[{ label: 'Overview', index: 0 }, { label: 'Hackathons', index: 1 }]}
        onNavigate={(i) => { if (i === 1) navigate('/hackathons') }}
        userEmail={userEmail}
        userName={userName}
        isAdmin={isAdmin}
        onSignIn={() => setShowAuthModal(true)}
        onSignOut={() => void supabase?.auth.signOut()}
      />

      {/* ── Hero sticky scroll space ── */}
      {/* ── Hero — full viewport, TV model, no zoom ── */}
      <div className="hp-hero">
        {!useLightEffects && enhanceHero && (
          <Suspense fallback={null}><FogCanvas /></Suspense>
        )}
        <div className="hero-atmosphere hero-atmosphere--back" aria-hidden="true" />
        <div className="canvas-container">
          {useLightEffects || !enhanceHero ? (
            <div aria-hidden="true" style={{ width: '100%', height: '100%', background: 'radial-gradient(circle at 50% 40%, rgba(255, 213, 125, 0.18), rgba(17, 13, 32, 0.92) 55%, #05030a 100%)' }} />
          ) : (
            <Suspense fallback={<div aria-hidden="true" style={{ width: '100%', height: '100%', background: 'radial-gradient(circle at 50% 40%, rgba(255, 213, 125, 0.18), rgba(17, 13, 32, 0.92) 55%, #05030a 100%)' }} />}>
              <HeroCanvas onReady={handleHeroReady} />
            </Suspense>
          )}
        </div>
        <div className="hero-atmosphere hero-atmosphere--glow" aria-hidden="true" />
        <div className="hero-grain" aria-hidden="true" />
        <div className="hero-content">
          <h1 className="hero-title-sr">Augusta Dev Hackathon 2026</h1>
          <img className="hero-title-art" src="/AugustaDevHeader.png" alt="Augusta Dev" />
          <p className="tagline">Think. Create. Innovate.</p>
          <p className="hero-body">Connect with a community of innovators and create without limits. Your project starts here.</p>
          <button className="cta-button" type="button" onClick={() => document.getElementById('hp-world')?.scrollIntoView({ behavior: 'smooth' })}>
            Explore Events
          </button>
        </div>
        <div className="hero-atmosphere hero-atmosphere--front" aria-hidden="true" />
        {!useLightEffects && enhanceHero && (
          <Suspense fallback={null}><FogCanvas overlay fogOpacity={0.45} /></Suspense>
        )}
        <div className="hp-scroll-hint" aria-hidden="true">
          <span>Scroll to explore</span>
          <div className="hp-scroll-hint__arrow" />
        </div>
      </div>


      {/* ── Explore section ── */}
      {/* ── Section 2: Intro — large right photo, text bleeds over it from left ── */}
      <section className="hp-intro">
        <div className="hp-intro__img-frame" aria-hidden="true">
          <img src={claudeRetroPC} alt="" className="hp-intro__img" />
        </div>
        <div className="hp-intro__content">
          <span className="hp-intro__eyebrow">
            <span className="hp-intro__typed">AUGUSTA, GA</span><span className="hp-intro__cursor">_</span>
          </span>
          <h2 className="hp-intro__heading">Where Builders<br />Become Legends.</h2>
        </div>
      </section>

      {/* ── Section 3: Explore Hackathons ── */}
      <section className="hp-explore">
        {/* Floating game elements */}
        <span className="hp-explore__float hp-explore__float--1" aria-hidden="true">🎮</span>
        <span className="hp-explore__float hp-explore__float--2" aria-hidden="true">🏆</span>
        <span className="hp-explore__float hp-explore__float--3" aria-hidden="true">⚡</span>
        <span className="hp-explore__float hp-explore__float--4" aria-hidden="true">🎲</span>
        <span className="hp-explore__float hp-explore__float--5" aria-hidden="true">🕹️</span>
        <img src={computerIcon} className="hp-explore__float hp-explore__float--6" alt="" aria-hidden="true" />

        {/* Center content */}
        <div className="hp-explore__center">
          <p className="hp-explore__eyebrow">Augusta Dev</p>
          <h2 className="hp-explore__heading">Explore<br />Hackathons</h2>
          <button type="button" className="hp-explore__cta" onClick={() => navigate('/hackathons')}>
            EXPLORE
          </button>
        </div>
      </section>

      {/* ── Retro world sections ── */}
      <div id="hp-world" className="hp-world">
        <GameboysSection />
        <GlitchySection />

        {/* Stats bar — MORTAL KOMBAT — hidden, not deleted */}
        {false && (
        <section
          className={`hp-stats${revealed.has('stats') ? ' hp-revealed' : ''}`}
          data-section="stats"
        >
          <div className="mk-arena" aria-hidden="true">
            {MK_EMBERS.map((style, i) => <div key={i} className="mk-ember" style={style} />)}
          </div>
          <div className="mk-fight-flash" aria-hidden="true">FIGHT!</div>
          <div className="hp-stats__scanlines" aria-hidden="true" />
          <div className="hp-stats__inner">
            {STATS.map(s => (
              <StatCounter
                key={s.label}
                value={s.value}
                prefix={s.prefix}
                suffix={s.suffix}
                label={s.label}
                revealed={revealed.has('stats')}
              />
            ))}
          </div>
        </section>
        )}





      </div>


      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {loadingMounted && <RetroLoadingScreen progress={loadingProgress} visible={loadingVisible} />}
    </div>
  )
}
