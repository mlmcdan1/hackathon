import { useEffect, useRef, useState } from 'react'

const NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'Hackathons', path: '/hackathons' },
  { label: 'About', path: '/about' },
]

interface HackathonNavbarProps {
  hidden?: boolean
  scrolled?: boolean
  activePath: string
  onNavigate: (path: string) => void
}

export default function HackathonNavbar({
  hidden = false,
  scrolled = false,
  activePath,
  onNavigate,
}: HackathonNavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const navClass = [
    'hackathon-nav',
    hidden ? 'hackathon-nav--hidden' : '',
    scrolled ? 'hackathon-nav--scrolled' : '',
  ].filter(Boolean).join(' ')

  const handleSelect = (path: string) => {
    setMenuOpen(false)
    onNavigate(path)
  }

  return (
    <>
      <header className={navClass}>
        <button type="button" className="hackathon-nav__brand" onClick={() => handleSelect('/')}>
          Augusta Hackathon
        </button>

        <button
          ref={triggerRef}
          type="button"
          className="hackathon-nav__menu-trigger"
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          aria-controls="hackathon-nav-panel"
        >
          <span className="hackathon-nav__menu-bars" aria-hidden="true">
            <span /><span /><span />
          </span>
          MENU
        </button>
      </header>

      <div
        className={`hackathon-nav__backdrop${menuOpen ? ' is-open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      <aside
        id="hackathon-nav-panel"
        className={`hackathon-nav__panel${menuOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        <div className="hackathon-nav__panel-head">
          <button
            type="button"
            className="hackathon-nav__panel-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <svg width="34" height="34" viewBox="0 0 40 40" aria-hidden="true">
              <polygon points="12,4 28,4 38,20 28,36 12,36 2,20" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <line x1="15" y1="15" x2="25" y2="25" stroke="currentColor" strokeWidth="1.5" />
              <line x1="25" y1="15" x2="15" y2="25" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        <ul className="hackathon-nav__panel-list">
          {NAV_ITEMS.map((item) => (
            <li
              key={item.path}
              className={`hackathon-nav__panel-item${activePath === item.path ? ' is-active' : ''}`}
            >
              <button
                type="button"
                className="hackathon-nav__panel-link"
                onClick={() => handleSelect(item.path)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </>
  )
}
