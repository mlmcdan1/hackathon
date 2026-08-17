import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { ArrowLeft, Camera, Check, Globe, LogOut, X } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import profilePlaceholder from '../../assets/profilePlaceholder.png'
import './Profile.css'

const TABS = ['Projects'] as const
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

// ── Brand icons (not available in lucide-react v1+) ───────────────
function GithubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
    </svg>
  )
}
function LinkedinIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}
function TwitterIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.732-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}
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
  const [guestPreview, setGuestPreview] = useState(false)
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

  // Load avatar from Supabase Storage on first sign-in (overrides any stale localStorage base64)
  const storageLoadedRef = useRef(false)
  useEffect(() => {
    if (!supabase || !isSupabaseConfigured || !session?.user?.id || storageLoadedRef.current) return
    storageLoadedRef.current = true
    const uid = session.user.id
    supabase.storage.from('avatars').list(uid).then(({ data: files }) => {
      if (!files || files.length === 0) return
      const latest = files.sort((a, b) =>
        new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime()
      )[0]
      const { data: { publicUrl } } = supabase!.storage.from('avatars').getPublicUrl(`${uid}/${latest.name}`)
      setSaved((p) => ({ ...p, avatarDataUrl: `${publicUrl}?t=${Date.now()}` }))
      setDraft((p) => ({ ...p, avatarDataUrl: `${publicUrl}?t=${Date.now()}` }))
    })
  }, [session?.user?.id])

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
    e.target.value = ''
    setUploading(true)
    const uid = session?.user?.id

    try {
      if (supabase && isSupabaseConfigured && uid) {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const path = `${uid}/avatar.${ext}`
        const { error } = await supabase.storage
          .from('avatars')
          .upload(path, file, { upsert: true, contentType: file.type })
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
          const url = `${publicUrl}?t=${Date.now()}`
          const next = { ...saved, avatarDataUrl: url }
          setSaved(next)
          setDraft((p) => ({ ...p, avatarDataUrl: url }))
          persist(next)
          return
        }
      }
      // Fallback: base64 data URL
      const reader = new FileReader()
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string
        const next = { ...saved, avatarDataUrl: dataUrl }
        setSaved(next)
        setDraft((p) => ({ ...p, avatarDataUrl: dataUrl }))
        persist(next)
      }
      reader.readAsDataURL(file)
    } finally {
      setUploading(false)
    }
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

      {/* Guest preview banner */}
      {guestPreview && (
        <div className="pf-preview-bar">
          <span className="pf-preview-bar__label">👁 Guest Preview — this is how others see your profile</span>
          <button type="button" className="pf-preview-bar__exit" onClick={() => setGuestPreview(false)}>
            Exit Preview
          </button>
        </div>
      )}

      {/* Top nav — hidden in guest preview */}
      {!guestPreview && (
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
      )}

      {/* Hero */}
      <div className="pf-hero">
        <div className="pf-hero__gradient" aria-hidden />
        <div className="pf-hero__inner">

          {/* Avatar */}
          <div className="pf-hero__photo-wrap">
            {guestPreview ? (
              <img
                src={displayAvatar}
                alt="Profile"
                className="pf-hero__photo"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = profilePlaceholder }}
              />
            ) : (
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
            )}
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

            {!guestPreview && (
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
                    <button type="button" className="pf-btn pf-btn--outline" onClick={() => setGuestPreview(true)}>
                      View as Guest
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Stats — absolute bottom-right of gradient */}
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

      {/* ── About Me — always visible, above tabs ── */}
      <div className="pf-aboutme">
        <div className="pf-aboutme__inner">
          {isEditingAbout && !guestPreview ? (
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
                  rows={4}
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
            <>
              {/* Bio */}
              {saved.bio && <p className="pf-aboutme__bio">{saved.bio}</p>}

              {/* Info pills */}
              {(saved.location || (session?.user?.email && !guestPreview)) && (
                <div className="pf-aboutme__meta">
                  {session?.user?.email && !guestPreview && (
                    <span className="pf-aboutme__pill">{session.user.email}</span>
                  )}
                  {saved.location && (
                    <span className="pf-aboutme__pill">{saved.location}</span>
                  )}
                </div>
              )}

              {/* Connect cards */}
              {(saved.github || saved.linkedin || saved.twitter || saved.devpost || saved.website) && (
                <div className="pf-connect">
                  <p className="pf-connect__heading">Connect</p>
                  <div className="pf-connect__grid">
                    {saved.github && (
                      <a href={socialUrl.github(saved.github)} target="_blank" rel="noreferrer"
                         className="pf-connect__card pf-connect__card--github" title="GitHub">
                        <GithubIcon size={22} />
                        <span className="pf-connect__card-name">GitHub</span>
                      </a>
                    )}
                    {saved.linkedin && (
                      <a href={socialUrl.linkedin(saved.linkedin)} target="_blank" rel="noreferrer"
                         className="pf-connect__card pf-connect__card--linkedin" title="LinkedIn">
                        <LinkedinIcon size={22} />
                        <span className="pf-connect__card-name">LinkedIn</span>
                      </a>
                    )}
                    {saved.twitter && (
                      <a href={socialUrl.twitter(saved.twitter)} target="_blank" rel="noreferrer"
                         className="pf-connect__card pf-connect__card--twitter" title="Twitter / X">
                        <TwitterIcon size={22} />
                        <span className="pf-connect__card-name">Twitter</span>
                      </a>
                    )}
                    {saved.devpost && (
                      <a href={socialUrl.devpost(saved.devpost)} target="_blank" rel="noreferrer"
                         className="pf-connect__card pf-connect__card--devpost" title="DevPost">
                        <DevpostIcon size={22} />
                        <span className="pf-connect__card-name">DevPost</span>
                      </a>
                    )}
                    {saved.website && (
                      <a href={socialUrl.website(saved.website)} target="_blank" rel="noreferrer"
                         className="pf-connect__card pf-connect__card--website" title="Website">
                        <Globe size={22} />
                        <span className="pf-connect__card-name">Website</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {!guestPreview && (
                <button
                  type="button"
                  className="pf-btn pf-btn--outline pf-about__edit-btn"
                  onClick={() => { setDraft(saved); setIsEditingAbout(true) }}
                >
                  Edit About
                </button>
              )}
            </>
          )}
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
