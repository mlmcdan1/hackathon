import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { ArrowLeft, Camera, Check, Github, Globe, Linkedin, LogOut, Twitter, X } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import profilePlaceholder from '../../assets/profilePlaceholder.png'
import './Profile.css'

const TABS = ['Projects', 'Teams', 'Achievements', 'About'] as const
type Tab = typeof TABS[number]

const LS_KEY = 'pf_profile_data'

interface ProfileData {
  name: string
  tagline: string
  location: string
  website: string
  github: string
  linkedin: string
  twitter: string
  devpost: string
  bio: string
  avatarDataUrl: string | null
}

const EMPTY: ProfileData = {
  name: '', tagline: '', location: '', website: '', github: '',
  linkedin: '', twitter: '', devpost: '', bio: '', avatarDataUrl: null,
}

// ── URL normalizers ────────────────────────────────────────────────
function toAbsUrl(prefix: string, val: string): string {
  if (!val) return ''
  return /^https?:\/\//i.test(val) ? val : `${prefix}${val.replace(/^@/, '')}`
}
const socialUrl = {
  github:   (v: string) => toAbsUrl('https://github.com/',        v),
  linkedin: (v: string) => toAbsUrl('https://linkedin.com/in/',   v),
  twitter:  (v: string) => toAbsUrl('https://twitter.com/',       v),
  devpost:  (v: string) => toAbsUrl('https://devpost.com/',       v),
  website:  (v: string) => toAbsUrl('https://',                   v),
}

// ── Inline DevPost icon (no lucide equivalent) ─────────────────────
function DevpostIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.002 1.61L0 12.004 6.002 22.39h11.996L24 12.004 17.998 1.61zm1.593 16.526l-3.274-6.132 3.274-6.132h4.409l3.274 6.132-3.274 6.132z"/>
    </svg>
  )
}

function formatName(session: Session | null): string {
  if (!session?.user) return ''
  const meta = session.user.user_metadata ?? {}
  const full = meta.full_name ?? [meta.first_name, meta.last_name].filter(Boolean).join(' ')
  if (typeof full === 'string' && full.trim()) return full.trim()
  const handle = (session.user.email ?? '').split('@')[0]
  return handle.split(/[._-]/g).filter(Boolean)
    .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
}

export default function Profile() {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('Projects')
  const [saved, setSaved] = useState<ProfileData>(EMPTY)
  const [draft, setDraft] = useState<ProfileData>(EMPTY)
  const [isEditingHero, setIsEditingHero] = useState(false)
  const [isEditingAbout, setIsEditingAbout] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY)
      if (stored) {
        const parsed: ProfileData = JSON.parse(stored)
        setSaved(parsed)
        setDraft(parsed)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session ?? null
      setSession(s)
      const oauthName = formatName(s)
      if (oauthName) {
        setSaved((p) => ({ ...p, name: p.name || oauthName }))
        setDraft((p) => ({ ...p, name: p.name || oauthName }))
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      const oauthName = formatName(s)
      if (oauthName) {
        setSaved((p) => ({ ...p, name: p.name || oauthName }))
        setDraft((p) => ({ ...p, name: p.name || oauthName }))
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const oauthAvatar = session?.user?.user_metadata?.avatar_url as string | undefined
  const displayAvatar = saved.avatarDataUrl ?? oauthAvatar ?? profilePlaceholder

  function setField<K extends keyof ProfileData>(k: K, v: ProfileData[K]) {
    setDraft((p) => ({ ...p, [k]: v }))
  }

  function persist(data: ProfileData) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch {}
  }

  function saveHero() {
    const next = { ...saved, name: draft.name, tagline: draft.tagline }
    setSaved(next)
    persist(next)
    setIsEditingHero(false)
  }

  function saveAbout() {
    const next = { ...saved, location: draft.location, website: draft.website, github: draft.github, linkedin: draft.linkedin, twitter: draft.twitter, devpost: draft.devpost, bio: draft.bio }
    setSaved(next)
    persist(next)
    setIsEditingAbout(false)
  }

  function cancelHero() {
    setDraft(saved)
    setIsEditingHero(false)
  }

  function cancelAbout() {
    setDraft(saved)
    setIsEditingAbout(false)
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      const next = { ...saved, avatarDataUrl: dataUrl }
      setSaved(next)
      setDraft((p) => ({ ...p, avatarDataUrl: dataUrl }))
      persist(next)
      setUploading(false)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="pf-page">

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleAvatarFile}
      />

      {/* Top nav */}
      <nav className="pf-nav">
        <button type="button" className="pf-nav__back" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Back
        </button>
        <span className="pf-nav__brand">Augusta Dev</span>
        <button
          type="button"
          className="pf-nav__signout"
          onClick={() => void supabase?.auth.signOut().then(() => navigate('/'))}
        >
          <LogOut size={15} /> Sign out
        </button>
      </nav>

      {/* Hero */}
      <div className="pf-hero">
        <div className="pf-hero__gradient" aria-hidden />
        <div className="pf-hero__inner">

          {/* Avatar */}
          <div className="pf-hero__photo-wrap">
            <button
              type="button"
              className="pf-avatar-btn"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Change photo"
            >
              <img
                src={displayAvatar}
                alt="Profile"
                className="pf-hero__photo"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = profilePlaceholder }}
              />
              <div className="pf-avatar-btn__overlay">
                <Camera size={22} />
                <span>{uploading ? 'Uploading…' : 'Change photo'}</span>
              </div>
            </button>
          </div>

          {/* Identity */}
          <div className="pf-hero__identity">
            <div className="pf-hero__name-row">
              {isEditingHero ? (
                <input
                  className="pf-input pf-input--name"
                  value={draft.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Your name"
                  autoFocus
                />
              ) : (
                <h1 className="pf-hero__name">{saved.name || 'Your Name'}</h1>
              )}
              <span className="pf-hero__badge">DEV ⚡</span>
            </div>

            {isEditingHero ? (
              <input
                className="pf-input pf-input--tagline"
                value={draft.tagline}
                onChange={(e) => setField('tagline', e.target.value)}
                placeholder="Developer · Hackathon builder based in Augusta"
              />
            ) : (
              <p className="pf-hero__bio">
                {saved.tagline || 'Developer · Hackathon builder based in Augusta'}
              </p>
            )}

            {/* Social links */}
            {(saved.github || saved.linkedin || saved.twitter || saved.devpost || saved.website) && !isEditingHero && (
              <div className="pf-hero__socials">
                {saved.github && (
                  <a href={socialUrl.github(saved.github)} target="_blank" rel="noreferrer" className="pf-social pf-social--github" title="GitHub">
                    <Github size={17} />
                  </a>
                )}
                {saved.linkedin && (
                  <a href={socialUrl.linkedin(saved.linkedin)} target="_blank" rel="noreferrer" className="pf-social pf-social--linkedin" title="LinkedIn">
                    <Linkedin size={17} />
                  </a>
                )}
                {saved.twitter && (
                  <a href={socialUrl.twitter(saved.twitter)} target="_blank" rel="noreferrer" className="pf-social pf-social--twitter" title="Twitter / X">
                    <Twitter size={17} />
                  </a>
                )}
                {saved.devpost && (
                  <a href={socialUrl.devpost(saved.devpost)} target="_blank" rel="noreferrer" className="pf-social pf-social--devpost" title="DevPost">
                    <DevpostIcon size={17} />
                  </a>
                )}
                {saved.website && (
                  <a href={socialUrl.website(saved.website)} target="_blank" rel="noreferrer" className="pf-social pf-social--website" title="Website">
                    <Globe size={17} />
                  </a>
                )}
              </div>
            )}

            <div className="pf-hero__actions">
              {isEditingHero ? (
                <>
                  <button type="button" className="pf-btn pf-btn--primary" onClick={saveHero}>
                    <Check size={14} /> Save
                  </button>
                  <button type="button" className="pf-btn pf-btn--outline" onClick={cancelHero}>
                    <X size={14} /> Cancel
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="pf-btn pf-btn--primary" onClick={() => { setDraft(saved); setIsEditingHero(true) }}>
                    Edit Profile
                  </button>
                  <button type="button" className="pf-btn pf-btn--outline" onClick={() => navigate('/')}>
                    View Hackathons
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="pf-hero__stats">
            <div className="pf-stat">
              <span className="pf-stat__label">Hackathons</span>
              <span className="pf-stat__value">0</span>
            </div>
            <div className="pf-stat">
              <span className="pf-stat__label">Projects</span>
              <span className="pf-stat__value">0</span>
            </div>
            <div className="pf-stat">
              <span className="pf-stat__label">Wins</span>
              <span className="pf-stat__value">0</span>
            </div>
          </div>

        </div>
      </div>

      {/* Tabs */}
      <div className="pf-tabs">
        <div className="pf-tabs__inner">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`pf-tab${activeTab === tab ? ' pf-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === 'Projects' && <span className="pf-tab__count">0</span>}
            </button>
          ))}
        </div>
        <div className="pf-tabs__rule" />
      </div>

      {/* Content */}
      <div className="pf-content">

        {activeTab === 'Projects' && (
          <div className="pf-grid">
            <EmptyState message="No projects yet. Join a hackathon to get started." />
          </div>
        )}

        {activeTab === 'Teams' && (
          <EmptyState message="You haven't joined any teams yet." />
        )}

        {activeTab === 'Achievements' && (
          <EmptyState message="Achievements will appear after your first hackathon." />
        )}

        {activeTab === 'About' && (
          <div className="pf-about">
            {isEditingAbout ? (
              <div className="pf-about__form">
                <label className="pf-label">
                  Location
                  <input
                    className="pf-input pf-input--field"
                    value={draft.location}
                    onChange={(e) => setField('location', e.target.value)}
                    placeholder="Augusta, GA"
                  />
                </label>
                <label className="pf-label">
                  Website
                  <input
                    className="pf-input pf-input--field"
                    value={draft.website}
                    onChange={(e) => setField('website', e.target.value)}
                    placeholder="https://yoursite.com"
                    type="url"
                  />
                </label>
                <label className="pf-label">
                  GitHub
                  <input
                    className="pf-input pf-input--field"
                    value={draft.github}
                    onChange={(e) => setField('github', e.target.value)}
                    placeholder="yourhandle"
                  />
                </label>
                <label className="pf-label">
                  LinkedIn
                  <input
                    className="pf-input pf-input--field"
                    value={draft.linkedin}
                    onChange={(e) => setField('linkedin', e.target.value)}
                    placeholder="yourname"
                  />
                </label>
                <label className="pf-label">
                  Twitter / X
                  <input
                    className="pf-input pf-input--field"
                    value={draft.twitter}
                    onChange={(e) => setField('twitter', e.target.value)}
                    placeholder="@yourhandle"
                  />
                </label>
                <label className="pf-label">
                  DevPost
                  <input
                    className="pf-input pf-input--field"
                    value={draft.devpost}
                    onChange={(e) => setField('devpost', e.target.value)}
                    placeholder="yourhandle"
                  />
                </label>
                <label className="pf-label">
                  Bio
                  <textarea
                    className="pf-input pf-textarea"
                    value={draft.bio}
                    onChange={(e) => setField('bio', e.target.value)}
                    placeholder="Tell the community about yourself..."
                    rows={5}
                  />
                </label>
                <div className="pf-about__actions">
                  <button type="button" className="pf-btn pf-btn--primary" onClick={saveAbout}>
                    <Check size={14} /> Save
                  </button>
                  <button type="button" className="pf-btn pf-btn--outline" onClick={cancelAbout}>
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="pf-about__view">
                {session?.user?.email && (
                  <div className="pf-about__row">
                    <span className="pf-about__label">Email</span>
                    <span className="pf-about__val">{session.user.email}</span>
                  </div>
                )}
                {saved.location && (
                  <div className="pf-about__row">
                    <span className="pf-about__label">Location</span>
                    <span className="pf-about__val">{saved.location}</span>
                  </div>
                )}
                {saved.website && (
                  <div className="pf-about__row">
                    <span className="pf-about__label">Website</span>
                    <a href={saved.website} target="_blank" rel="noreferrer" className="pf-about__link">{saved.website}</a>
                  </div>
                )}
                {saved.github && (
                  <div className="pf-about__row">
                    <span className="pf-about__label">GitHub</span>
                    <a href={socialUrl.github(saved.github)} target="_blank" rel="noreferrer" className="pf-about__link pf-about__link--github">
                      <Github size={13} /> {saved.github.replace(/^https?:\/\/(www\.)?github\.com\//i, '')}
                    </a>
                  </div>
                )}
                {saved.linkedin && (
                  <div className="pf-about__row">
                    <span className="pf-about__label">LinkedIn</span>
                    <a href={socialUrl.linkedin(saved.linkedin)} target="_blank" rel="noreferrer" className="pf-about__link pf-about__link--linkedin">
                      <Linkedin size={13} /> {saved.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, '')}
                    </a>
                  </div>
                )}
                {saved.twitter && (
                  <div className="pf-about__row">
                    <span className="pf-about__label">Twitter / X</span>
                    <a href={socialUrl.twitter(saved.twitter)} target="_blank" rel="noreferrer" className="pf-about__link pf-about__link--twitter">
                      <Twitter size={13} /> {saved.twitter.replace(/^https?:\/\/(www\.)?twitter\.com\//i, '@')}
                    </a>
                  </div>
                )}
                {saved.devpost && (
                  <div className="pf-about__row">
                    <span className="pf-about__label">DevPost</span>
                    <a href={socialUrl.devpost(saved.devpost)} target="_blank" rel="noreferrer" className="pf-about__link pf-about__link--devpost">
                      <DevpostIcon size={13} /> {saved.devpost.replace(/^https?:\/\/(www\.)?devpost\.com\//i, '')}
                    </a>
                  </div>
                )}
                {saved.bio && (
                  <div className="pf-about__bio">{saved.bio}</div>
                )}
                <button
                  type="button"
                  className="pf-btn pf-btn--outline pf-about__edit-btn"
                  onClick={() => { setDraft(saved); setIsEditingAbout(true) }}
                >
                  Edit About
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="pf-empty">
      <div className="pf-empty__icon">◻</div>
      <p className="pf-empty__text">{message}</p>
    </div>
  )
}
