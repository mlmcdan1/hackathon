import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { ArrowLeft, Camera, Check, LogOut, X } from 'lucide-react'
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
  bio: string
  avatarDataUrl: string | null
}

const EMPTY: ProfileData = {
  name: '', tagline: '', location: '', website: '', github: '', bio: '', avatarDataUrl: null,
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
    const next = { ...saved, location: draft.location, website: draft.website, github: draft.github, bio: draft.bio }
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
                    placeholder="github.com/username"
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
                    <a href={`https://${saved.github.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="pf-about__link">{saved.github}</a>
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
