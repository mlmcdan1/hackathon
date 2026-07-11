import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

interface HackathonNavbarProps {
  activeSection: number
  hidden?: boolean
  scrolled?: boolean
  links: Array<{
    label: string
    index: number
  }>
  onNavigate: (sectionIndex: number) => void
  userEmail: string | null
  userName?: string | null
  isAdmin?: boolean
  onSignIn: () => void
  onSignOut: () => void
}

function formatDisplayName(userEmail: string | null) {
  if (!userEmail) return ''

  const localPart = userEmail.split('@')[0] ?? ''
  return localPart
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function HackathonNavbar({
  activeSection,
  hidden = false,
  scrolled = false,
  links,
  onNavigate,
  userEmail,
  userName,
  isAdmin = false,
  onSignIn,
  onSignOut,
}: HackathonNavbarProps) {
  const displayName = userName?.trim() || formatDisplayName(userEmail)
  const registerLink = links.find((link) => link.index === 1)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuOpen])

  const navClass = [
    'hackathon-nav',
    hidden ? 'hackathon-nav--hidden' : '',
    scrolled ? 'hackathon-nav--scrolled' : '',
  ].filter(Boolean).join(' ')

  return (
    <header className={navClass}>
      <div className="hackathon-nav__brand-group">
        <button type="button" className="hackathon-nav__brand" onClick={() => onNavigate(0)}>
          Hackathon
        </button>
      </div>

      <nav className="hackathon-nav__links" aria-label="Hackathon navigation">
        <button
          type="button"
          className={`hackathon-nav__link${activeSection === 0 ? ' is-active' : ''}`}
          onClick={() => onNavigate(0)}
        >
          Home
        </button>
        {registerLink && (
          <button
            type="button"
            className={`hackathon-nav__link${activeSection === registerLink.index ? ' is-active' : ''}`}
            onClick={() => onNavigate(registerLink.index)}
          >
            Hackathons
          </button>
        )}
        <Link to="/about" className="hackathon-nav__link">
          About Us
        </Link>
      </nav>

      <div className="hackathon-nav__actions">
        {userEmail ? (
          <div className="hackathon-nav__user-menu" ref={menuRef}>
            <button
              type="button"
              className="hackathon-nav__hello"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
            >
              <span className="hackathon-nav__hello-label">Hello</span>
              <strong>{displayName || 'Builder'}</strong>
            </button>

            {menuOpen && (
              <div className="hackathon-nav__user-dropdown">
                <Link
                  className="hackathon-nav__menu-item"
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
                {isAdmin && (
                  <Link
                    className="hackathon-nav__menu-item hackathon-nav__menu-item--admin"
                    to="/admin"
                    onClick={() => setMenuOpen(false)}
                  >
                    Admin Portal
                  </Link>
                )}
                <div className="hackathon-nav__menu-divider" />
                <button
                  type="button"
                  className="hackathon-nav__menu-item hackathon-nav__menu-item--danger"
                  onClick={() => { setMenuOpen(false); onSignOut() }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button type="button" className="hackathon-nav__action hackathon-nav__action--signin" onClick={onSignIn}>
            Sign In / Register
          </button>
        )}
      </div>
    </header>
  )
}
