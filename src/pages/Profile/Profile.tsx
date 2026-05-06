import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import {
  Award,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Code2,
  Cpu,
  Edit2,
  ExternalLink,
  Globe,
  Layers,
  LogOut,
  Search,
  Terminal,
  Trophy,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './Profile.css'

type ActiveTab =
  | 'Profile'
  | 'My Projects'
  | 'Achievements'
  | 'Teams'
  | 'Upcoming Events'
  | 'Skills'
  | 'Calendar'

interface NavItemConfig {
  icon: typeof User
  label: ActiveTab
}

interface SkillTag {
  name: string
  level: 'Expert' | 'Intermediate' | 'Beginner'
}

interface ProjectCardData {
  title: string
  tags: string[]
  status?: string
  isCurrent?: boolean
}

interface ProfileState {
  name: string
  role: string
  bio: string
  location: string
  socials: {
    github: string
    twitter: string
    website: string
  }
}

const navItems: NavItemConfig[] = [
  { icon: User, label: 'Profile' },
  { icon: Code2, label: 'My Projects' },
  { icon: Trophy, label: 'Achievements' },
  { icon: Users, label: 'Teams' },
  { icon: Zap, label: 'Upcoming Events' },
  { icon: Terminal, label: 'Skills' },
  { icon: CalendarDays, label: 'Calendar' },
]

const skills: SkillTag[] = [
  { name: 'TypeScript', level: 'Expert' },
  { name: 'React', level: 'Expert' },
  { name: 'Node.js', level: 'Intermediate' },
  { name: 'PostgreSQL', level: 'Intermediate' },
  { name: 'Docker', level: 'Beginner' },
  { name: 'Python', level: 'Intermediate' },
]

const projects: ProjectCardData[] = [
  {
    title: 'HackTheFuture 2024',
    tags: ['Next.js', 'PyTorch', 'Tailwind'],
    status: 'Live Now',
    isCurrent: true,
  },
  {
    title: 'MetaVerse Builder',
    tags: ['Three.js', 'WebXR', 'Rust'],
    status: 'In Progress',
  },
]

const teammateSeeds = ['Nova', 'Cipher', 'Orbit']

function formatNameFromSession(session: Session | null) {
  if (!session?.user) return 'John Doe'

  const fullName =
    session.user.user_metadata?.full_name ||
    [session.user.user_metadata?.first_name, session.user.user_metadata?.last_name].filter(Boolean).join(' ')

  if (typeof fullName === 'string' && fullName.trim()) return fullName.trim()

  const email = session.user.email ?? ''
  const handle = email.split('@')[0]

  if (!handle) return 'John Doe'

  return handle
    .split(/[._-]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function ProfileNavItem({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: typeof User
  label: string
  isActive?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`profile-nav-item${isActive ? ' is-active' : ''}`}
      onClick={onClick}
    >
      <span className="profile-nav-item__rail" aria-hidden="true" />
      <Icon size={20} />
      <span>{label}</span>
    </button>
  )
}

function StatCard({
  icon: Icon,
  label,
  count,
  sublabel,
  tone,
}: {
  icon: typeof Zap
  label: string
  count: string
  sublabel: string
  tone: 'yellow' | 'indigo' | 'green' | 'violet'
}) {
  return (
    <article className={`profile-stat-card profile-stat-card--${tone}`}>
      <div className="profile-stat-card__icon">
        <Icon size={26} strokeWidth={1.8} />
      </div>
      <p className="profile-stat-card__count">{count}</p>
      <p className="profile-stat-card__label">{label}</p>
      <p className="profile-stat-card__sublabel">{sublabel}</p>
    </article>
  )
}

function SkillBadge({ name, level }: SkillTag) {
  return (
    <span className={`profile-skill profile-skill--${level.toLowerCase()}`}>
      <span className="profile-skill__dot" aria-hidden="true" />
      {name}
    </span>
  )
}

function ProjectCard({ title, tags, status, isCurrent }: ProjectCardData) {
  return (
    <article className={`profile-project-card${isCurrent ? ' is-current' : ''}`}>
      <div className="profile-project-card__head">
        <div>
          {status ? <span className="profile-project-card__status">{status}</span> : null}
          <h3>{title}</h3>
        </div>
        <div className="profile-project-card__badge" aria-hidden="true">
          {isCurrent ? <Zap size={22} /> : <Layers size={22} />}
        </div>
      </div>

      <div className="profile-project-card__tags">
        {tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>

      <div className="profile-project-card__actions">
        <button type="button">{isCurrent ? 'Dashboard' : 'View Project'}</button>
        <div className="profile-project-card__links" aria-label="Project links">
          <Code2 size={18} />
          <ExternalLink size={18} />
        </div>
      </div>
    </article>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('Profile')
  const [isEditing, setIsEditing] = useState(false)
  const [draftProfile, setDraftProfile] = useState<ProfileState>({
    name: 'John Doe',
    role: 'Full Stack Developer',
    bio: 'Passionate about building scalable web applications and exploring the depths of AI. Frequent hackathon participant and open-source contributor.',
    location: 'San Francisco, CA',
    socials: {
      github: 'johndoe',
      twitter: '@johndoe',
      website: 'johndoe.dev',
    },
  })
  const [savedProfile, setSavedProfile] = useState<ProfileState>(draftProfile)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const derivedName = formatNameFromSession(session)

    setDraftProfile((current) => ({ ...current, name: derivedName }))
    setSavedProfile((current) => ({ ...current, name: derivedName }))
  }, [session])

  const avatarSeed = useMemo(() => draftProfile.name.replace(/\s+/g, ''), [draftProfile.name])
  const memberLabel = session?.user?.email ? 'Signed In' : 'Guest Mode'

  function updateProfile<K extends keyof ProfileState>(key: K, value: ProfileState[K]) {
    setDraftProfile((current) => ({ ...current, [key]: value }))
  }

  function handleSave() {
    setSavedProfile(draftProfile)
    setIsEditing(false)
  }

  function handleCancel() {
    setDraftProfile(savedProfile)
    setIsEditing(false)
  }

  return (
    <div className="profile-page">
      <aside className="profile-sidebar">
        <div className="profile-sidebar__brand">
          <div className="profile-sidebar__brand-mark">
            <Terminal size={38} strokeWidth={2.2} />
          </div>
          <p>HackerHub</p>
        </div>

        <nav className="profile-sidebar__nav" aria-label="Profile sections">
          {navItems.map((item) => (
            <ProfileNavItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              isActive={activeTab === item.label}
              onClick={() => setActiveTab(item.label)}
            />
          ))}
        </nav>

        <div className="profile-sidebar__footer">
          <button type="button" className="profile-sidebar__secondary" onClick={() => navigate('/')}>
            Home
          </button>
          <button type="button" className="profile-sidebar__secondary" onClick={() => navigate('/hackathons')}>
            Hackathons
          </button>
          <button type="button" className="profile-sidebar__logout" onClick={() => supabase.auth.signOut()}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="profile-main">
        <header className="profile-header">
          <label className="profile-search">
            <Search size={18} />
            <input type="text" placeholder="Search hackers, projects, or events..." />
          </label>

          <div className="profile-header__actions">
            <div className="profile-header__identity">
              <div className="profile-header__avatar">
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}&backgroundColor=c0aede`}
                  alt={`${draftProfile.name} avatar`}
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <p>{draftProfile.name}</p>
                <span>
                  {memberLabel}
                  <ChevronDown size={11} />
                </span>
              </div>
            </div>

            <button type="button" className="profile-header__notify" aria-label="Notifications">
              <Bell size={20} />
              <span />
            </button>
          </div>
        </header>

        <div className="profile-layout">
          <div className="profile-primary">
            <section className="profile-hero">
              <div className="profile-hero__shape" aria-hidden="true">
                <Terminal size={360} strokeWidth={1.3} />
              </div>

              <div className="profile-hero__avatar-wrap">
                <div className="profile-hero__avatar">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}&backgroundColor=c0aede`}
                    alt={`${draftProfile.name} profile`}
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    className="profile-hero__avatar-edit"
                    onClick={() => setIsEditing((current) => !current)}
                    aria-label="Edit profile"
                  >
                    <Edit2 size={22} />
                  </button>
                </div>
                <div className="profile-hero__status">
                  <Users size={14} />
                </div>
              </div>

              <div className="profile-hero__body">
                <div className="profile-hero__title-row">
                  <div>
                    {isEditing ? (
                      <input
                        className="profile-edit-input profile-edit-input--title"
                        value={draftProfile.name}
                        onChange={(event) => updateProfile('name', event.target.value)}
                      />
                    ) : (
                      <h1>{draftProfile.name}</h1>
                    )}
                    <p className="profile-hero__role">
                      <Code2 size={15} />
                      <span>{draftProfile.role}</span>
                    </p>
                  </div>

                  {!isEditing ? (
                    <button type="button" className="profile-hero__edit-toggle" onClick={() => setIsEditing(true)}>
                      <Edit2 size={18} />
                    </button>
                  ) : null}
                </div>

                <div className="profile-hero__bio">
                  {isEditing ? (
                    <textarea
                      className="profile-edit-textarea"
                      value={draftProfile.bio}
                      onChange={(event) => updateProfile('bio', event.target.value)}
                    />
                  ) : (
                    <p>"{draftProfile.bio}"</p>
                  )}
                </div>

                <div className="profile-hero__chips">
                  <a href="#" onClick={(event) => event.preventDefault()}>
                    <Code2 size={14} /> @{draftProfile.socials.github}
                  </a>
                  <a href="#" onClick={(event) => event.preventDefault()}>
                    <Zap size={14} /> {draftProfile.socials.twitter}
                  </a>
                  <a href="#" onClick={(event) => event.preventDefault()}>
                    <Globe size={14} /> {draftProfile.socials.website}
                  </a>
                </div>

                {isEditing ? (
                  <div className="profile-hero__edit-actions">
                    <button type="button" className="profile-button profile-button--success" onClick={handleSave}>
                      <Check size={16} />
                      <span>Save Changes</span>
                    </button>
                    <button type="button" className="profile-button profile-button--ghost" onClick={handleCancel}>
                      <X size={16} />
                      <span>Cancel</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="profile-section">
              <div className="profile-section__heading">
                <h2>Performance</h2>
              </div>
              <div className="profile-stats-grid">
                <StatCard icon={Zap} label="Hackathons" count="14" sublabel="Total Joined" tone="yellow" />
                <StatCard icon={Cpu} label="Projects" count="28" sublabel="Submissions" tone="indigo" />
                <StatCard icon={Trophy} label="Wins" count="06" sublabel="Prizes Won" tone="green" />
                <StatCard icon={Users} label="Rank" count="#12" sublabel="Global Level" tone="violet" />
              </div>
            </section>

            <section className="profile-section">
              <div className="profile-section__heading profile-section__heading--between">
                <h2>Active Participation</h2>
                <button type="button" className="profile-pill-button">
                  Find More
                </button>
              </div>
              <div className="profile-projects-grid">
                {projects.map((project) => (
                  <ProjectCard key={project.title} {...project} />
                ))}
              </div>
            </section>

            <section className="profile-section">
              <div className="profile-section__heading profile-section__heading--between">
                <h2 className="is-muted">Archive</h2>
                <button type="button" className="profile-link-button">
                  View Full Portfolio
                </button>
              </div>

              <div className="profile-archive-grid">
                <article className="profile-archive-card">
                  <div className="profile-archive-card__icon">
                    <Award size={30} />
                  </div>
                  <div>
                    <h3>CivicHack Winner</h3>
                    <p>Voted Best Social Impact App - 2023</p>
                    <div className="profile-archive-card__tags">
                      <span>React Native</span>
                      <span>Firebase</span>
                    </div>
                  </div>
                </article>

                <article className="profile-archive-card">
                  <div className="profile-archive-card__icon">
                    <Globe size={30} />
                  </div>
                  <div>
                    <h3>EduConnect AI</h3>
                    <p>Top 10 Finalist - Global AI Summit</p>
                    <div className="profile-archive-card__tags">
                      <span>OpenAI SDK</span>
                      <span>Vite</span>
                    </div>
                  </div>
                </article>
              </div>
            </section>
          </div>

          <aside className="profile-secondary">
            <section className="profile-panel">
              <div className="profile-panel__corner" aria-hidden="true">
                <Terminal size={28} />
              </div>
              <div className="profile-panel__heading">
                <h3>Tech Stack</h3>
              </div>
              <div className="profile-skills">
                {skills.map((skill) => (
                  <SkillBadge key={skill.name} {...skill} />
                ))}
                <button type="button" className="profile-pill-button profile-pill-button--solid">
                  + Add Skill
                </button>
              </div>
            </section>

            <section className="profile-panel">
              <div className="profile-panel__heading profile-section__heading--between">
                <h3>Core Team</h3>
                <button type="button" className="profile-link-button">
                  Manage
                </button>
              </div>

              <div className="profile-team-list">
                {teammateSeeds.map((seed, index) => (
                  <article key={seed} className="profile-team-item">
                    <div className="profile-team-item__identity">
                      <div className="profile-team-item__avatar">
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`}
                          alt={`Team member ${index + 1}`}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <p>Team Member {index + 1}</p>
                        <span>UI Design / Logic</span>
                      </div>
                    </div>
                    <span className="profile-team-item__presence" aria-hidden="true" />
                  </article>
                ))}
              </div>

              <button type="button" className="profile-panel__footer-button">
                <Users size={15} />
                <span>Broadcast Invite</span>
              </button>
            </section>

            <section className="profile-panel profile-panel--activity">
              <div className="profile-panel__heading profile-section__heading--between">
                <h3>Recent Activity</h3>
                <Bell size={18} />
              </div>

              <div className="profile-activity-list">
                <article className="profile-activity-item is-current">
                  <span className="profile-activity-item__dot" aria-hidden="true" />
                  <p className="profile-activity-item__time">Today</p>
                  <h4>Submitted Project "FutureGrid"</h4>
                  <p>Integrated Blockchain for energy tracking.</p>
                </article>

                <article className="profile-activity-item">
                  <span className="profile-activity-item__dot" aria-hidden="true" />
                  <p className="profile-activity-item__time">2 Days Ago</p>
                  <h4>Joined "Team Nebula"</h4>
                </article>

                <article className="profile-activity-item">
                  <span className="profile-activity-item__dot" aria-hidden="true" />
                  <p className="profile-activity-item__time">Last Week</p>
                  <h4>Earned "Clean Coder" Badge</h4>
                </article>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}
