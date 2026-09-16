import { Clock, MapPin, Trophy, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

let _hoverSnd: HTMLAudioElement | null = null
function playHoverSound() {
  if (!_hoverSnd) { _hoverSnd = new Audio('/ButtonHoverSound.wav'); _hoverSnd.volume = 0.35 }
  _hoverSnd.currentTime = 0
  _hoverSnd.play().catch(() => {})
}
import placeholderImage from '../assets/placeholderImage.png'
import {
  computeStatus,
  displayDay,
  displayMonth,
  displayYear,
  fetchPublicEvents,
  publicStatusLabel,
  type EventRecord,
} from '../lib/eventUtils'
import { useNavScroll } from '../hooks/useNavScroll'
import HackathonNavbar from './navigation/HackathonNavbar'
import './HackathonSection.css'

type Format    = 'All' | 'Online' | 'In-Person'
type StatusFilter = 'All' | 'Open Reg' | 'Upcoming' | 'Active Now'
type EventType = 'All' | 'Hackathon' | 'Workshop' | 'Summit' | 'Sprint'

const FORMAT_OPTS: Format[]         = ['All', 'Online', 'In-Person']
const STATUS_OPTS: StatusFilter[]   = ['All', 'Open Reg', 'Active Now', 'Upcoming']
const TYPE_OPTS: EventType[]        = ['All', 'Hackathon', 'Workshop', 'Summit', 'Sprint']

interface Props {
  onNavigateHome: () => void
}

export default function HackathonSection({ onNavigateHome }: Props) {
  const navigate = useNavigate()
  const { scrolled, hidden } = useNavScroll()
  const [format, setFormat]       = useState<Format>('All')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [eventType, setEventType] = useState<EventType>('All')
  const [events, setEvents]       = useState<EventRecord[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)

  useEffect(() => {
    fetchPublicEvents().then((data) => { setEvents(data); setEventsLoading(false) })
  }, [])

  const filtered = useMemo(() => events.filter((e) => {
    const status = computeStatus(e)
    const label  = publicStatusLabel(status)
    const loc    = e.format === 'virtual' ? 'Online' : 'In-Person'
    if (format !== 'All' && loc !== format) return false
    if (statusFilter !== 'All' && label !== statusFilter) return false
    if (eventType !== 'All' && e.tag !== eventType) return false
    return true
  }), [events, format, statusFilter, eventType])

  const isFiltered = format !== 'All' || statusFilter !== 'All' || eventType !== 'All'

  function clearFilters() {
    setFormat('All')
    setStatusFilter('All')
    setEventType('All')
  }

  return (
    <div className="hs-page">

      <HackathonNavbar
        activePath="/hackathons"
        hidden={hidden}
        scrolled={scrolled}
        onNavigate={(path) => { if (path === '/') onNavigateHome(); else navigate(path) }}
      />

      {/* Hero */}
      <header className="hs-hero">
        <p className="hs-hero__eyebrow">Augusta Dev — 2026 Season</p>
        <img src="/SelectAHackathon.png" alt="Select a Hackathon" className="hs-hero__title-img" />
        <p className="hs-hero__sub">Pick your event, assemble your team, and ship something legendary.</p>
      </header>

      {/* Body */}
      <div className="hs-body">

        {/* Filters sidebar */}
        <aside className="hs-filters">
          <div className="hs-filters__header">
            <p className="hs-filters__heading">Filters</p>
            {isFiltered && (
              <button type="button" className="hs-filters__clear" onClick={clearFilters}>
                <X size={12} /> Clear
              </button>
            )}
          </div>

          <div className="hs-filter-group">
            <p className="hs-filter-group__label">Format</p>
            {FORMAT_OPTS.map((opt) => (
              <label key={opt} className="hs-filter-radio">
                <input
                  type="radio"
                  name="format"
                  checked={format === opt}
                  onChange={() => setFormat(opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>

          <div className="hs-filter-group">
            <p className="hs-filter-group__label">Status</p>
            {STATUS_OPTS.map((opt) => (
              <label key={opt} className="hs-filter-radio">
                <input
                  type="radio"
                  name="status"
                  checked={statusFilter === opt}
                  onChange={() => setStatusFilter(opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>

          <div className="hs-filter-group">
            <p className="hs-filter-group__label">Type</p>
            {TYPE_OPTS.map((opt) => (
              <label key={opt} className="hs-filter-radio">
                <input
                  type="radio"
                  name="type"
                  checked={eventType === opt}
                  onChange={() => setEventType(opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </aside>

        {/* Event list */}
        <main className="hs-stack">
          <p className="hs-stack__count">
            {eventsLoading
              ? 'Loading events…'
              : `${filtered.length} of ${events.length} events${isFiltered ? ' — filtered' : ''}`
            }
          </p>

          {eventsLoading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="hs-card hs-card--skeleton" aria-hidden="true">
              <div className="hs-card__bar hs-skel" />
              <div className="hs-card__thumb hs-skel" />
              <div className="hs-card__info">
                <div className="hs-skel hs-skel--tag" />
                <div className="hs-skel hs-skel--title" />
                <div className="hs-skel hs-skel--desc" />
                <div className="hs-skel hs-skel--meta" />
              </div>
              <div className="hs-card__date hs-skel--date-block">
                <div className="hs-skel hs-skel--day" />
                <div className="hs-skel hs-skel--month" />
              </div>
              <div className="hs-skel hs-skel--cta" />
            </div>
          ))}

          {!eventsLoading && filtered.length === 0 && (
            <div className="hs-empty">
              <p className="hs-empty__text">{events.length === 0 ? 'No events found.' : 'No events match your filters.'}</p>
              {isFiltered && <button type="button" className="hs-empty__reset" onClick={clearFilters}>Clear filters</button>}
            </div>
          )}

          {filtered.map((event) => {
            const status      = computeStatus(event)
            const statusLabel = publicStatusLabel(status)
            const loc         = event.format === 'virtual' ? 'Online' : event.location
            const isOpen      = status === 'open-reg' || status === 'active'
            return (
              <article
                key={event.id}
                className={`hs-card hs-card--${event.color}`}
              >
                <div className="hs-card__bar" />

                <div className="hs-card__thumb">
                  <img src={event.image ?? placeholderImage} alt={event.title} className="hs-card__thumb-img" width="112" height="112" loading="lazy" />
                </div>

                <div className="hs-card__info">
                  <div className="hs-card__tags">
                    <span className="hs-card__tag">{event.tag}</span>
                    <span className={`hs-card__status hs-card__status--${isOpen ? 'open' : status}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <h2 className="hs-card__title">{event.title}</h2>
                  <p className="hs-card__desc">{event.description}</p>
                  <div className="hs-card__meta">
                    <span className="hs-card__meta-item"><MapPin size={11} /> {loc}</span>
                    {event.duration && (
                      <span className="hs-card__meta-item"><Clock size={11} /> {event.duration}</span>
                    )}
                    <span className="hs-card__meta-item"><Trophy size={11} /> {event.prizePool}</span>
                  </div>
                </div>

                <div className="hs-card__date">
                  <span className="hs-card__day">{displayDay(event)}</span>
                  <span className="hs-card__month">{displayMonth(event)}</span>
                  <span className="hs-card__year">{displayYear(event)}</span>
                </div>

                <div className="hs-card__actions">
                  <Link
                    to={`/hackathons/${event.id}`}
                    className="hs-card__details"
                    onMouseEnter={playHoverSound}
                  >
                    View Details
                  </Link>
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
