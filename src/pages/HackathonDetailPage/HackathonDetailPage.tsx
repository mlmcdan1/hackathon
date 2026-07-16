import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Bell, Calendar, Clock, MapPin, Trophy, Users } from 'lucide-react'
import placeholderImage from '../../assets/placeholderImage.png'
import {
  computeStatus,
  fetchPublicEvents,
  fetchReminder,
  publicStatusLabel,
  saveReminder,
  type EventRecord,
  type ReminderPrefs,
} from '../../lib/eventUtils'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import HackathonNavbar from '../../components/navigation/HackathonNavbar'
import AuthModal from '../../components/auth/AuthModal'
import './HackathonDetailPage.css'

// ── Color maps (match HackathonSection) ───────────────────────────

const COLOR_HEX: Record<string, string> = {
  red:    '#f87171',
  yellow: '#fbbf24',
  teal:   '#2dd4bf',
  purple: '#c084fc',
  orange: '#fb923c',
  green:  '#4ade80',
}

const COLOR_RGB: Record<string, string> = {
  red:    '248, 113, 113',
  yellow: '251, 191, 36',
  teal:   '45, 212, 191',
  purple: '192, 132, 252',
  orange: '251, 146, 60',
  green:  '74, 222, 128',
}

const REMINDER_OPTIONS: Array<{ key: keyof ReminderPrefs; label: string; desc: string }> = [
  { key: 'remind1Week', label: '1 week before', desc: '7 days out' },
  { key: 'remind3Days', label: '3 days before', desc: '72 hours out' },
  { key: 'remindDayOf', label: 'Day of event',  desc: 'Morning of the event' },
]

// ── Utilities ─────────────────────────────────────────────────────

function parseEventDateTime(dateStr: string, timeStr: string): Date {
  if (!dateStr) return new Date(0)
  return new Date(`${dateStr}T${timeStr || '00:00'}:00`)
}

function getRemaining(target: Date) {
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true }
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000)  / 60000),
    seconds: Math.floor((diff % 60000)    / 1000),
    done: false,
  }
}

// ── Sub-components ────────────────────────────────────────────────

function CountdownDisplay({ target, colorHex }: { target: Date; colorHex: string }) {
  const [rem, setRem] = useState(() => getRemaining(target))

  useEffect(() => {
    setRem(getRemaining(target))
    const id = setInterval(() => setRem(getRemaining(target)), 1000)
    return () => clearInterval(id)
  }, [target])

  if (rem.done) return <p className="hdp-countdown__done">Happening now!</p>

  return (
    <div className="hdp-countdown">
      {[
        { val: rem.days,    unit: 'Days' },
        { val: rem.hours,   unit: 'Hrs'  },
        { val: rem.minutes, unit: 'Min'  },
        { val: rem.seconds, unit: 'Sec'  },
      ].map(({ val, unit }) => (
        <div key={unit} className="hdp-countdown__block" style={{ '--hdp-color': colorHex } as React.CSSProperties}>
          <span className="hdp-countdown__num">{String(val).padStart(2, '0')}</span>
          <span className="hdp-countdown__unit">{unit}</span>
        </div>
      ))}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="hdp-skeleton">
      <div className="hdp-skeleton__hero" />
      <div className="hdp-skeleton__body">
        <div>
          <div className="hdp-skel hdp-skel--h" />
          <div className="hdp-skel hdp-skel--p" />
          <div className="hdp-skel hdp-skel--p" />
          <div className="hdp-skel hdp-skel--p hdp-skel--short" />
        </div>
        <div>
          <div className="hdp-skel hdp-skel--card" />
          <div className="hdp-skel hdp-skel--card" />
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────

export default function HackathonDetailPage() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()

  const [event, setEvent]                   = useState<EventRecord | null>(null)
  const [loading, setLoading]               = useState(true)
  const [notFound, setNotFound]             = useState(false)
  const [scrolled, setScrolled]             = useState(false)
  const [showAuthModal, setShowAuthModal]   = useState(false)
  const [userEmail, setUserEmail]           = useState<string | null>(null)
  const [userName, setUserName]             = useState<string | null>(null)
  const [userId, setUserId]                 = useState<string | null>(null)
  const [isAdmin, setIsAdmin]               = useState(false)
  const [reminders, setReminders]           = useState<ReminderPrefs>({ remind1Week: false, remind3Days: false, remindDayOf: true })
  const [reminderLoaded, setReminderLoaded] = useState(false)
  const [reminderSaving, setReminderSaving] = useState(false)
  const [registered, setRegistered]         = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Load event from cache (instant if coming from list page)
  useEffect(() => {
    fetchPublicEvents().then((events) => {
      const found = events.find((e) => e.id === id)
      setEvent(found ?? null)
      setNotFound(!found)
      setLoading(false)
    })
  }, [id])

  // Auth
  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return
    const resolve = (s: import('@supabase/supabase-js').Session | null) => {
      setUserEmail(s?.user.email ?? null)
      setUserName(s?.user.user_metadata?.first_name ?? null)
      setUserId(s?.user.id ?? null)
      setIsAdmin(
        s?.user.app_metadata?.role === 'admin' ||
        s?.user.user_metadata?.role  === 'admin'
      )
    }
    supabase.auth.getSession().then(({ data }) => resolve(data.session ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => resolve(s ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  // Load reminders
  useEffect(() => {
    if (!userId || !id) { setReminderLoaded(true); return }
    fetchReminder(id, userId).then((prefs) => {
      if (prefs) setReminders(prefs)
      setReminderLoaded(true)
    })
  }, [userId, id])

  // Load registration state from localStorage
  useEffect(() => {
    if (id) setRegistered(localStorage.getItem(`registered-${id}`) === '1')
  }, [id])

  const handleReminderToggle = async (key: keyof ReminderPrefs) => {
    if (!userId || !id) { setShowAuthModal(true); return }
    const next = { ...reminders, [key]: !reminders[key] }
    setReminders(next)
    setReminderSaving(true)
    await saveReminder(id, userId, next)
    setReminderSaving(false)
  }

  const handleRegister = () => {
    if (!userEmail) { setShowAuthModal(true); return }
    const next = !registered
    setRegistered(next)
    if (id) {
      if (next) localStorage.setItem(`registered-${id}`, '1')
      else      localStorage.removeItem(`registered-${id}`)
    }
  }

  if (loading) return <DetailSkeleton />

  if (notFound || !event) {
    return (
      <div className="hdp-notfound">
        <p>Hackathon not found.</p>
        <button type="button" onClick={() => navigate('/hackathons')}>← Back to Hackathons</button>
      </div>
    )
  }

  const status      = computeStatus(event)
  const statusLabel = publicStatusLabel(status)
  const isOpen      = status === 'open-reg' || status === 'active'
  const colorHex    = COLOR_HEX[event.color] ?? '#c084fc'
  const colorRgb    = COLOR_RGB[event.color] ?? '192, 132, 252'

  const startDt   = parseEventDateTime(event.startDate, event.startTime)
  const endDt     = parseEventDateTime(event.endDate,   event.endTime)
  const spotsLeft = event.maxParticipants > 0
    ? event.maxParticipants - event.currentParticipants
    : null
  const loc = event.format === 'virtual' ? 'Online' : event.location

  let countdownTarget: Date | null = null
  let countdownLabel               = ''
  if (status === 'open-reg') {
    countdownTarget = startDt
    countdownLabel  = 'Event Starts In'
  } else if (status === 'upcoming') {
    countdownTarget = startDt
    countdownLabel  = 'Coming Up In'
  } else if (status === 'active') {
    countdownTarget = endDt
    countdownLabel  = 'Event Ends In'
  }

  const pageStyle = {
    '--hdp-color': colorHex,
    '--hdp-rgb':   colorRgb,
  } as React.CSSProperties

  return (
    <>
      <div className="hdp" style={pageStyle}>
        <HackathonNavbar
          activeSection={1}
          scrolled={scrolled}
          links={[{ label: 'Hackathons', index: 1 }]}
          onNavigate={(i) => { if (i === 0) navigate('/'); else if (i === 1) navigate('/hackathons') }}
          userEmail={userEmail}
          userName={userName}
          isAdmin={isAdmin}
          onSignIn={() => setShowAuthModal(true)}
          onSignOut={() => void supabase?.auth.signOut()}
        />

        {/* ── Hero ── */}
        <div className="hdp-hero">
          <img
            src={event.image ?? placeholderImage}
            alt={event.title}
            className="hdp-hero__img"
            width="1200"
            height="460"
          />
          <div className="hdp-hero__overlay" />
          <div className="hdp-hero__accent" />

          <div className="hdp-hero__top">
            <button type="button" className="hdp-back" onClick={() => navigate('/hackathons')}>
              <ArrowLeft size={14} />
              Back to Hackathons
            </button>
            <span className={`hdp-status hdp-status--${isOpen ? 'open' : status}`}>
              {statusLabel}
            </span>
          </div>

          <div className="hdp-hero__bottom">
            <span className="hdp-hero__tag">{event.tag}</span>
            <h1 className="hdp-hero__title">{event.title}</h1>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="hdp-body">

          {/* Main column */}
          <div className="hdp-main">
            <section className="hdp-section">
              <p className="hdp-section__heading">About This Event</p>
              <p className="hdp-section__body">{event.description || 'No description provided.'}</p>
            </section>

            {event.tags.length > 0 && (
              <section className="hdp-section">
                <p className="hdp-section__heading">Tags</p>
                <div className="hdp-tags">
                  {event.tags.map((t) => <span key={t} className="hdp-tag">{t}</span>)}
                </div>
              </section>
            )}

            {event.prizePool && (
              <section className="hdp-section">
                <p className="hdp-section__heading">Prize Pool</p>
                <div className="hdp-prize">
                  <Trophy size={22} className="hdp-prize__icon" />
                  <span className="hdp-prize__value">{event.prizePool}</span>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hdp-sidebar">

            {/* Countdown */}
            {countdownTarget && (
              <div className="hdp-card">
                <span className="hdp-card__label">{countdownLabel}</span>
                <CountdownDisplay target={countdownTarget} colorHex={colorHex} />
              </div>
            )}

            {/* Event info */}
            <div className="hdp-card">
              <span className="hdp-card__label">Event Details</span>
              <ul className="hdp-info">
                <li className="hdp-info__row">
                  <Calendar size={14} className="hdp-info__icon" />
                  <div>
                    <span className="hdp-info__key">Starts</span>
                    <span className="hdp-info__val">
                      {startDt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      {event.startTime ? ` · ${event.startTime}` : ''}
                    </span>
                  </div>
                </li>
                <li className="hdp-info__row">
                  <Calendar size={14} className="hdp-info__icon" />
                  <div>
                    <span className="hdp-info__key">Ends</span>
                    <span className="hdp-info__val">
                      {endDt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      {event.endTime ? ` · ${event.endTime}` : ''}
                    </span>
                  </div>
                </li>
                {event.duration && (
                  <li className="hdp-info__row">
                    <Clock size={14} className="hdp-info__icon" />
                    <div>
                      <span className="hdp-info__key">Duration</span>
                      <span className="hdp-info__val">{event.duration}</span>
                    </div>
                  </li>
                )}
                <li className="hdp-info__row">
                  <MapPin size={14} className="hdp-info__icon" />
                  <div>
                    <span className="hdp-info__key">Location</span>
                    <span className="hdp-info__val">{loc}</span>
                  </div>
                </li>
                {event.maxParticipants > 0 && (
                  <li className="hdp-info__row">
                    <Users size={14} className="hdp-info__icon" />
                    <div>
                      <span className="hdp-info__key">Participants</span>
                      <span className="hdp-info__val">
                        {spotsLeft !== null
                          ? `${spotsLeft} of ${event.maxParticipants} spots left`
                          : `${event.currentParticipants} registered`}
                      </span>
                    </div>
                  </li>
                )}
                {event.maxTeams > 0 && (
                  <li className="hdp-info__row">
                    <Users size={14} className="hdp-info__icon" />
                    <div>
                      <span className="hdp-info__key">Teams</span>
                      <span className="hdp-info__val">{event.currentTeams} / {event.maxTeams} teams</span>
                    </div>
                  </li>
                )}
              </ul>
            </div>

            {/* Register */}
            <div className="hdp-card hdp-card--cta">
              {isOpen ? (
                <button
                  type="button"
                  className={`hdp-register${registered ? ' hdp-register--in' : ''}`}
                  onClick={handleRegister}
                >
                  {registered ? "✓ You're Registered!" : 'Register Now'}
                </button>
              ) : (
                <button type="button" className="hdp-register hdp-register--disabled" disabled>
                  {statusLabel}
                </button>
              )}
              {!userEmail && isOpen && (
                <p className="hdp-cta-hint">
                  <button type="button" className="hdp-cta-hint__link" onClick={() => setShowAuthModal(true)}>
                    Sign in
                  </button>{' '}to save your spot &amp; get reminders.
                </p>
              )}
            </div>

            {/* Reminders (logged-in only) */}
            {userEmail && (
              <div className="hdp-card">
                <div className="hdp-card__header">
                  <Bell size={13} />
                  <span className="hdp-card__label">Email Reminders</span>
                  {reminderSaving && <span className="hdp-card__saving">saving…</span>}
                </div>
                {!reminderLoaded ? (
                  <ul className="hdp-reminders hdp-reminders--loading">
                    {[0, 1, 2].map((i) => <li key={i} className="hdp-skel hdp-skel--row" />)}
                  </ul>
                ) : (
                  <ul className="hdp-reminders">
                    {REMINDER_OPTIONS.map(({ key, label, desc }) => (
                      <li
                        key={key}
                        className="hdp-reminder"
                        onClick={() => void handleReminderToggle(key)}
                      >
                        <div className={`hdp-reminder__toggle${reminders[key] ? ' hdp-reminder__toggle--on' : ''}`} />
                        <div className="hdp-reminder__text">
                          <span className="hdp-reminder__label">{label}</span>
                          <span className="hdp-reminder__desc">{desc}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

          </aside>
        </div>
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  )
}
