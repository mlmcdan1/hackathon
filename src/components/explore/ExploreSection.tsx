import { useEffect, useRef, type RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ParallaxGameboy from './ParallaxGameboy'

gsap.registerPlugin(ScrollTrigger)

interface CommunityCard {
  id: string
  title: string
  cadence: string | null
  video: string
  blurb: string
}

const COMMUNITY_CARDS: CommunityCard[] = [
  {
    id: 'peer',
    title: 'Peer Connection',
    cadence: 'Drop in anytime',
    video: '/video/collab.mp4',
    blurb: 'Connect with others in the field, swap project ideas, and find people to build with.',
  },
  {
    id: 'techtalk',
    title: 'Tech Talk Augusta',
    cadence: '1st Tuesday · Monthly',
    video: '/video/tech.mp4',
    blurb: "Short talks, demos, and time to meet other local builders. Everyone's welcome.",
  },
  {
    id: 'shared',
    title: 'Shared Interests',
    cadence: null,
    video: '/video/drone.mp4',
    blurb: 'Into drones, robotics, or something else? Connect with peers who share your interest.',
  },
]

// One auto-rotate loop per card, matched to the @keyframes in HackathonPage.css.
const CARD_MORPH = [
  { name: 'card-morph-0', duration: '10s' },
  { name: 'card-morph-1', duration: '8.5s' },
  { name: 'card-morph-2', duration: '9.5s' },
]

// Paper-unfold reveal: the container starts tilted back and scaled down,
// then unwinds flat as it scrolls up into view — scrubbed continuously
// against scroll position (not a fixed-duration one-shot), but bounded
// between "just below the fold" and "centered," unlike a tilt that keeps
// reacting to scroll position forever. Runs on .explore-card__tilt, a
// wrapper OUTSIDE the polygon/video element — not on the polygon itself —
// so the polygon's own clip-path rotation + hover-to-box behavior is
// completely untouched by this.
function useUnfoldReveal(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(el, { opacity: 1, rotateX: 0, scale: 1 })
      return
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { rotateX: -60, scale: 0.7, opacity: 0 },
        {
          rotateX: 0,
          scale: 1,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom',
            end: 'center center',
            scrub: true,
          },
        }
      )
    })
    return () => ctx.revert()
  }, [ref])
}

// Plays itself only while actually on screen — no click, no hover needed,
// and no GPU cost while scrolled away (plain <video>, not a WebGL texture).
function CommunityVideoCard({ card, index }: { card: CommunityCard; index: number }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const tiltRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const leaveTimeoutRef = useRef<number | null>(null)

  useUnfoldReveal(tiltRef)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) v.play().catch(() => {})
        else v.pause()
      },
      { threshold: 0.35 }
    )
    io.observe(v)
    return () => io.disconnect()
  }, [])

  useEffect(
    () => () => {
      if (leaveTimeoutRef.current) window.clearTimeout(leaveTimeoutRef.current)
    },
    []
  )

  // Hover pauses the auto-rotate loop and morphs to a rectangle. Leaving
  // reverses that morph first, then hands control back to the CSS loop only
  // once the shape has settled back at its resting keyframe — so the loop
  // never has to jump to catch up.
  const handleMouseEnter = () => {
    const el = wrapRef.current
    if (!el) return
    if (leaveTimeoutRef.current) {
      window.clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = null
    }
    el.style.animation = 'none'
    el.classList.add('is-boxed')
  }

  const handleMouseLeave = () => {
    const el = wrapRef.current
    if (!el) return
    el.classList.remove('is-boxed')
    const { name, duration } = CARD_MORPH[index]
    leaveTimeoutRef.current = window.setTimeout(() => {
      el.style.animation = `${name} ${duration} ease-in-out infinite`
      leaveTimeoutRef.current = null
    }, 520)
  }

  return (
    <div className="explore-card" data-card-index={index}>
      <div className="explore-card__tilt" ref={tiltRef}>
        <div
          className="explore-card__video-wrap"
          ref={wrapRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <video
            ref={videoRef}
            className="explore-card__video"
            src={card.video}
            muted
            loop
            playsInline
            preload="metadata"
          />
        </div>
      </div>
      <div className="explore-card__body">
        <div className="explore-card__meta-row">
          <h3 className="explore-card__title">{card.title}</h3>
          {card.cadence && <span className="explore-card__cadence">{card.cadence}</span>}
        </div>
        <p className="explore-card__blurb">{card.blurb}</p>
      </div>
    </div>
  )
}

export default function ExploreSection({ onExplore }: { onExplore: () => void }) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const parallaxWrapRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Block-text reveal: a solid bar covers each line, then wipes away
      // (scaleX 1→0) while the text underneath rises up out of its masked
      // container — a one-time reveal as the heading enters view, not a
      // scroll-scrubbed effect.
      if (headingRef.current) {
        const blocks = headingRef.current.querySelectorAll('.line-block')
        const texts = headingRef.current.querySelectorAll('.line-text')
        // .from() captures the hidden state and animates in one atomic call,
        // rather than a separate gsap.set() + .to() — that split combined
        // with React StrictMode's double-invoked effects (both touching the
        // same DOM nodes) left the tween completing at its *starting* value
        // instead of its target. .from() is also what the phases section
        // already uses elsewhere on this page, so this matches a pattern
        // already proven to work here.
        gsap.timeline({ scrollTrigger: { trigger: headingRef.current, start: 'top 85%' } })
          .from(texts, { yPercent: 110, duration: 0.85, ease: 'power3.out', stagger: 0.12 }, 0.1)
          .to(blocks, { scaleX: 0, duration: 0.6, ease: 'power2.inOut', stagger: 0.12 }, 0)
      }

      // Parallax: the gameboy's wrapper moves at a different rate than the
      // surrounding text as the section scrolls past, purely via a scrubbed
      // transform on its container — the model itself stays a simple idle
      // canvas, same low-risk pattern already used on the phases section.
      if (parallaxWrapRef.current && sectionRef.current) {
        gsap.to(parallaxWrapRef.current, {
          yPercent: -16,
          ease: 'none',
          scrollTrigger: { trigger: sectionRef.current, start: 'top bottom', end: 'bottom top', scrub: true },
        })
      }

      // Staggered grid reveal — fade + rise, offset per card.
      if (gridRef.current) {
        gsap.from(gridRef.current.querySelectorAll('.explore-card'), {
          y: 46,
          opacity: 0,
          duration: 0.75,
          ease: 'power2.out',
          stagger: 0.15,
          scrollTrigger: { trigger: gridRef.current, start: 'top 82%' },
        })
      }
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <div className="explore-section" ref={sectionRef}>
      <div className="explore-hero">
        <div className="explore-hero__text">
          <span className="explore-eyebrow">Augusta Dev</span>
          <h2 className="explore-heading" ref={headingRef}>
            <span className="line-mask"><span className="line-block" /><span className="line-text">Explore</span></span>
            <span className="line-mask"><span className="line-block" /><span className="line-text">Hackathons</span></span>
          </h2>
          <button type="button" className="explore-cta" onClick={onExplore}>Explore</button>
        </div>
        <div className="explore-hero__visual" ref={parallaxWrapRef}>
          <ParallaxGameboy />
        </div>
      </div>

      <div className="explore-grid" ref={gridRef}>
        {COMMUNITY_CARDS.map((card, i) => (
          <CommunityVideoCard key={card.id} card={card} index={i} />
        ))}
      </div>
    </div>
  )
}
