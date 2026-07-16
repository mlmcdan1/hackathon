import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Bell, BellOff, Calendar, Clock, MapPin, Trophy, Users } from 'lucide-react'
import placeholderImage from '../../assets/placeholderImage.png'
import {
  computeStatus,
  fetchPublicEvents,
  fetchReminderSubscribed,
  publicStatusLabel,
  toggleReminder,
  type EventRecord,
} from '../../lib/eventUtils'
import {
  fetchRegistration,
  fetchSubmission,
  type Registration,
  type ProjectSubmission,
} from '../../lib/registrationUtils'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import HackathonNavbar from '../../components/navigation/HackathonNavbar'
import AuthModal from '../../components/auth/AuthModal'
import RegistrationModal from '../../components/registration/RegistrationModal'
import ProjectSubmissionModal from '../../components/registration/ProjectSubmissionModal'
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

function CountdownDisplay({ target, colorHex, colorRgb }: { target: Date; colorHex: string; colorRgb: string }) {
  const [rem, setRem] = useState(() => getRemaining(target))

  useEffect(() => {
    setRem(getRemaining(target))
    const id = setInterval(() => setRem(getRemaining(target)), 1000)
    return () => clearInterval(id)
  }, [target])

  if (rem.done) return <p className="hdp-countdown__done">Happening now!</p>

  const style = { '--hdp-color': colorHex, '--hdp-rgb': colorRgb } as React.CSSProperties
  return (
    <div className="hdp-countdown">
      {[
        { val: rem.days,    unit: 'Days' },
        { val: rem.hours,   unit: 'Hrs'  },
        { val: rem.minutes, unit: 'Min'  },
        { val: rem.seconds, unit: 'Sec'  },
      ].map(({ val, unit }) => (
        <div key={unit} className="hdp-countdown__block" style={style}>
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
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [event,    setEvent]    = useState<EventRecord | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const [showAuthModal,         setShowAuthModal]         = useState(false)
  const [showRegModal,          setShowRegModal]          = useState(false)
  const [showSubModal,          setShowSubModal]          = useState(false)

  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName,  setUserName]  = useState<string | null>(null)
  const [userId,    setUserId]    = useState<string | null>(null)
  const [isAdmin,   setIsAdmin]   = useState(false)

  const [registration,  setRegistration]  = useState<Registration | null>(null)
  const [submission,    setSubmission]    = useState<ProjectSubmission | null>(null)
  const [regLoading,    setRegLoading]    = useState(true)

  const [reminded,      setReminded]      = useState(false)
  const [reminderLoading, setReminderLoading] = useState(false)

  // Scroll listener
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Load event (instant from cache if coming from list page)
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

  // Load registration, submission, and reminder state when userId is known
  useEffect(() => {
    if (!userId || !id) { setRegLoading(false); return }
    setRegLoading(true)
    Promise.all([
      fetchRegistration(id, userId),
      fetchSubmission(id, userId),
      fetchReminderSubscribed(id, userId),
    ]).then(([reg, sub, rem]) => {
      setRegistration(reg)
      setSubmission(sub)
      setReminded(rem)
      setRegLoading(false)
    })
  }, [userId, id])

  const handleReminderToggle = async () => {
    if (!userId || !id) { setShowAuthModal(true); return }
    const next = !reminded
    setReminded(next)
    setReminderLoading(true)
    await toggleReminder(id, userId, next)
    setReminderLoading(false)
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
  const isOpen      = status === 'open-reg'
  const isActive    = status === 'active'
  const isCompleted = status === 'completed'
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
  if (isOpen) {
    countdownTarget = startDt
    countdownLabel  = 'Event Starts In'
  } else if (status === 'upcoming') {
    countdownTarget = startDt
    countdownLabel  = 'Coming Up In'
  } else if (isActive) {
    countdownTarget = endDt
    countdownLabel  = 'Event Ends In'
  }

  const pageStyle = { '--hdp-color': colorHex, '--hdp-rgb': colorRgb } as React.CSSProperties

  // ── CTA logic ─────────────────────────────────────────────────────
  // What to show in the sidebar CTA depends on auth + registration + event phase

  const canSubmitProject = (isActive || isCompleted) && !!registration

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
            <span className={`hdp-status hdp-status--${isOpen || isActive ? 'open' : status}`}>
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
                <CountdownDisplay target={countdownTarget} colorHex={colorHex} colorRgb={colorRgb} />
              </div>
            )}

            {/* Event details */}
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

            {/* ── CTA card ── */}
            <div className="hdp-card hdp-card--cta">
              {regLoading ? (
                <div className="hdp-skel" style={{ height: 44, borderRadius: 10 }} />
              ) : !userEmail ? (
                /* Not logged in */
                <>
                  <button
                    type="button"
                    className="hdp-register"
                    onClick={() => setShowAuthModal(true)}
                  >
                    Sign In to Register
                  </button>
                  <p className="hdp-cta-hint">
                    Create a free account to register and track this event.
                  </p>
                </>
              ) : !registration && !isOpen && !isActive ? (
                /* Logged in, registration not open */
                <button type="button" className="hdp-register hdp-register--disabled" disabled>
                  {isCompleted ? 'Event Ended' : 'Registration Not Open Yet'}
                </button>
              ) : !registration && (isOpen || isActive) ? (
                /* Logged in, can register */
                <button
                  type="button"
                  className="hdp-register"
                  onClick={() => setShowRegModal(true)}
                >
                  Register Now
                </button>
              ) : registration && !canSubmitProject ? (
                /* Registered, event hasn't started yet */
                <>
                  <div className="hdp-registered-state">
                    <span className="hdp-registered-state__check">✓</span>
                    <span className="hdp-registered-state__text">You&apos;re Registered</span>
                  </div>
                  {registration.teamName && (
                    <p className="hdp-cta-hint">Team: {registration.teamName}</p>
                  )}
                  <button
                    type="button"
                    className="hdp-edit-link"
                    onClick={() => setShowRegModal(true)}
                  >
                    Edit Registration
                  </button>
                </>
              ) : registration && canSubmitProject && !submission ? (
                /* Registered, event active or ended, no submission yet */
                <>
                  <div className="hdp-registered-state hdp-registered-state--sm">
                    <span className="hdp-registered-state__check">✓</span>
                    <span className="hdp-registered-state__text">You&apos;re Registered</span>
                  </div>
                  <button
                    type="button"
                    className="hdp-register hdp-register--submit"
                    onClick={() => setShowSubModal(true)}
                  >
                    {isCompleted ? 'Submit Your Project' : 'Submit Project Now'}
                  </button>
                  {isActive && (
                    <p className="hdp-cta-hint">
                      Submissions close when the event ends.
                    </p>
                  )}
                </>
              ) : submission ? (
                /* Project submitted */
                <>
                  <div className="hdp-registered-state">
                    <span className="hdp-registered-state__check">✓</span>
                    <span className="hdp-registered-state__text">Project Submitted</span>
                  </div>
                  <p className="hdp-cta-hint" style={{ marginTop: '0.5rem' }}>
                    {submission.projectTitle}
                  </p>
                  <button
                    type="button"
                    className="hdp-edit-link"
                    onClick={() => setShowSubModal(true)}
                  >
                    Edit Submission
                  </button>
                </>
              ) : null}
            </div>

            {/* ── Reminder toggle (logged-in, event not completed) ── */}
            {userEmail && !isCompleted && (
              <div className="hdp-card hdp-card--reminder">
                <button
                  type="button"
                  className={`hdp-remind-btn${reminded ? ' hdp-remind-btn--on' : ''}`}
                  onClick={handleReminderToggle}
                  disabled={reminderLoading}
                >
                  {reminded
                    ? <><BellOff size={14} /> Reminders On</>
                    : <><Bell size={14} /> Remind Me</>
                  }
                </button>
                {reminded && (
                  <p className="hdp-remind-hint">
                    We&apos;ll email you 1 week out, 3 days out, and the morning of the event.
                  </p>
                )}
              </div>
            )}

          </aside>
        </div>
      </div>

      {/* Modals */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      {showRegModal && userId && userEmail && (
        <RegistrationModal
          eventId={id!}
          eventTitle={event.title}
          colorHex={colorHex}
          colorRgb={colorRgb}
          userId={userId}
          userEmail={userEmail}
          existing={registration}
          onClose={() => setShowRegModal(false)}
          onSaved={(reg) => { setRegistration(reg); setShowRegModal(false) }}
        />
      )}

      {showSubModal && userId && (
        <ProjectSubmissionModal
          eventId={id!}
          eventTitle={event.title}
          colorHex={colorHex}
          colorRgb={colorRgb}
          userId={userId}
          existing={submission}
          onClose={() => setShowSubModal(false)}
          onSaved={(sub) => { setSubmission(sub); setShowSubModal(false) }}
        />
      )}
    </>
  )
}
