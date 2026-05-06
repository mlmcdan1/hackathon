import { CalendarDays, FlaskConical, Gamepad2, MapPin, Rocket, Shield, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import HackathonNavbar from './navigation/HackathonNavbar'
import './HackathonSection.css'

const events = [
  {
    tag: 'Hackathon',
    day: '04',
    month: 'MAR 2026',
    title: 'PixelHack 2026',
    location: 'Online',
    color: 'red',
    icon: Gamepad2,
  },
  {
    tag: 'Workshop',
    day: '12',
    month: 'MAR 2026',
    title: 'Midnight Build Jam',
    location: 'Online',
    color: 'yellow',
    icon: Zap,
  },
  {
    tag: 'Hackathon',
    day: '02',
    month: 'APR 2026',
    title: 'Founders x Hackers',
    location: 'Austin, TX',
    color: 'teal',
    icon: Rocket,
  },
  {
    tag: 'Summit',
    day: '18',
    month: 'APR 2026',
    title: 'Augusta Dev Summit',
    location: 'Online',
    color: 'purple',
    icon: Shield,
  },
  {
    tag: 'Sprint',
    day: '09',
    month: 'MAY 2026',
    title: 'Spring Build Weekend',
    location: 'Augusta, GA',
    color: 'orange',
    icon: FlaskConical,
  },
  {
    tag: 'Hackathon',
    day: '20',
    month: 'JUN 2026',
    title: 'Summer Code Jam',
    location: 'Online',
    color: 'green',
    icon: CalendarDays,
  },
]

function XboxAButton() {
  return (
    <span className="btn-xbox-a" aria-hidden="true">A</span>
  )
}


interface Props {
  userEmail: string | null
  userName?: string | null
  onSignIn: () => void
  onSignOut: () => void
  onNavigateHome: () => void
}

export default function HackathonSection({ userEmail, userName, onSignIn, onSignOut, onNavigateHome }: Props) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="hs-page">

      <HackathonNavbar
        activeSection={1}
        scrolled={scrolled}
        links={[{ label: 'Hackathons', index: 1 }]}
        onNavigate={(i) => { if (i === 0) onNavigateHome() }}
        userEmail={userEmail}
        userName={userName}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
      />

      <header className="hs-hero">
        <p className="hs-hero__eyebrow">Augusta Dev — 2026 Season</p>
        <img
          src="/SelectAHackathon.png"
          alt="Select a Hackathon"
          className="hs-hero__title-img"
        />
        <p className="hs-hero__sub">
          Pick your event, assemble your team, and ship something legendary.
        </p>
      </header>


      <div className="hs-body">

        {/* ── Filters sidebar ── */}
        <aside className="hs-filters">
          <div className="hs-filter-group">
            <p className="hs-filter-group__label">Format</p>
            {['All', 'Online', 'In-Person'].map((opt, i) => (
              <label key={opt} className="hs-filter-radio">
                <input type="radio" name="format" defaultChecked={i === 0} />
                <span>{opt}</span>
              </label>
            ))}
          </div>

          <div className="hs-filter-group">
            <p className="hs-filter-group__label">Status</p>
            {['All', 'Upcoming', 'Open Reg'].map((opt, i) => (
              <label key={opt} className="hs-filter-radio">
                <input type="radio" name="status" defaultChecked={i === 0} />
                <span>{opt}</span>
              </label>
            ))}
          </div>

          <div className="hs-filter-group">
            <p className="hs-filter-group__label">Type</p>
            {['All', 'Hackathon', 'Workshop', 'Summit', 'Sprint'].map((opt, i) => (
              <label key={opt} className="hs-filter-radio">
                <input type="radio" name="type" defaultChecked={i === 0} />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </aside>

        <main className="hs-stack">
        {events.map((event) => {
          const Icon = event.icon
          return (
            <article key={event.title} className={`hs-char-card hs-char-card--${event.color}`}>

              {/* Left color bar */}
              <div className="hs-char-card__accent" />

              {/* Portrait circle */}
              <div className="hs-char-card__portrait">
                <div className="hs-char-card__portrait-ring">
                  <Icon size={58} className="hs-char-card__portrait-icon" strokeWidth={1.5} />
                </div>
              </div>

              {/* Body */}
              <div className="hs-char-card__body">
                <div className="hs-char-card__info">
                  <p className="hs-char-card__tag">{event.tag}</p>
                  <h2 className="hs-char-card__title">{event.title}</h2>
                  <div className="hs-char-card__meta">
                    <span><MapPin size={10} />{event.location}</span>
                  </div>
                </div>

                {/* Date box */}
                <div className="hs-char-card__datebox">
                  <span className="hs-char-card__day">{event.day}</span>
                  <span className="hs-char-card__month">{event.month}</span>
                </div>

                {/* CTA */}
                <button
                  type="button"
                  className="hs-char-card__cta"
                  onClick={onSignIn}
                  aria-label={`Register for ${event.title}`}
                >
                  <XboxAButton />
                  Register
                </button>
              </div>

            </article>
          )
        })}
        </main>

      </div>

      <footer className="hs-footer">
        <span className="hs-footer__text">Think. Create. Innovate.</span>
<span className="hs-footer__brand">Augusta Dev © 2026</span>
      </footer>

    </div>
  )
}
