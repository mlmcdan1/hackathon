import { useState } from 'react'
import {
  FlaskConical,
  Gamepad2,
  Globe,
  Home,
  Music,
  ShoppingBag,
  Tv,
  Users,
  Rocket,
  CalendarDays,
  MapPin,
} from 'lucide-react'

const tabs = [
  { label: 'Home', icon: Home, color: 'bg-nick-orange' },
  { label: 'Hackathons', icon: Tv, color: 'bg-nick-magenta' },
  { label: 'Games', icon: Gamepad2, color: 'bg-nick-green' },
  { label: 'Music', icon: Music, color: 'bg-nick-yellow' },
  { label: 'Lab', icon: FlaskConical, color: 'bg-nick-cyan' },
  { label: 'Teams', icon: Users, color: 'bg-nick-purple' },
  { label: 'Global', icon: Globe, color: 'bg-nick-blue' },
  { label: 'Shop', icon: ShoppingBag, color: 'bg-nick-pink' },
]

const lineupCards = [
  {
    time: 'Mar 4',
    title: 'PixelHack 2026',
    desc: '48-hour retro game jam. Build something wild.',
    color: 'bg-nick-orange',
  },
  {
    time: 'Mar 12',
    title: 'Midnight Build Jam',
    desc: 'Ship a project from midnight to midnight.',
    color: 'bg-nick-magenta',
  },
  {
    time: 'Apr 2',
    title: 'Founders x Hackers',
    desc: 'Pitch, prototype, and partner up.',
    color: 'bg-nick-cyan',
  },
]

interface Props {
  userEmail: string | null
  onSignIn: () => void
  onSignOut: () => void
  onSchedule?: () => void
  onNavigateHome: () => void
}

function NavTab({
  label,
  icon: Icon,
  color,
  active,
  onClick,
}: {
  label: string
  icon: React.ElementType
  color: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`nick-tab ${color} gloss-effect transition-all duration-200 cursor-pointer
        ${active ? 'h-[110%] -translate-y-2 z-10' : 'h-[90%] opacity-80 hover:opacity-100 hover:-translate-y-1'}`}
      style={{ minWidth: 64 }}
    >
      <Icon size={18} className="text-nick-border-dark mb-0.5" />
      <span className="text-[10px] font-bold text-nick-border-dark tracking-wide uppercase leading-none">
        {label}
      </span>
    </button>
  )
}

export default function HackathonNickSection({
  userEmail,
  onSignIn,
  onSignOut,
  onNavigateHome,
}: Props) {
  const [activeTab, setActiveTab] = useState(1)

  return (
    <div className="min-h-screen bg-white font-[Outfit,sans-serif] flex flex-col">

      {/* Top nav bar */}
      <div className="bg-white border-b-4 border-nick-border-dark flex items-end px-3 gap-1 h-16 overflow-x-auto">
        {tabs.map((tab, i) => (
          <NavTab
            key={tab.label}
            label={tab.label}
            icon={tab.icon}
            color={tab.color}
            active={activeTab === i}
            onClick={() => setActiveTab(i)}
          />
        ))}
      </div>

      {/* Orange ticker */}
      <div className="bg-nick-orange border-b-2 border-nick-border-dark px-4 py-1 overflow-hidden">
        <div className="flex gap-8 animate-marquee whitespace-nowrap">
          {[0, 1].map((n) => (
            <span key={n} className="text-xs font-bold text-nick-border-dark tracking-widest uppercase">
              AugustaDev Ticker &gt;&gt;&gt;&nbsp;&nbsp;PixelHack 2026 Registration Open &bull;&nbsp;&nbsp;Midnight Build Jam — Sign up now &bull;&nbsp;&nbsp;Founders x Hackers — April 2&nbsp;&nbsp;&bull;&nbsp;&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* Logo bar */}
      <div className="bg-nick-yellow border-b-4 border-nick-border-dark flex items-center justify-between px-6 py-2">
        <button
          type="button"
          onClick={onNavigateHome}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-14 h-14 rounded-full bg-nick-orange border-4 border-nick-border-dark flex items-center justify-center shadow-[3px_3px_0_#000] gloss-effect">
            <span className="text-white font-black text-lg leading-none select-none">AD</span>
          </div>
          <span className="text-2xl font-black text-nick-border-dark tracking-tight leading-none">
            AugustaDev
          </span>
        </button>

        <div className="flex items-center gap-3">
          {userEmail ? (
            <>
              <span className="text-sm font-bold text-nick-border-dark">
                Hey, {userEmail.split('@')[0]}!
              </span>
              <button
                type="button"
                onClick={onSignOut}
                className="bg-nick-border-dark text-white text-xs font-bold px-4 py-2 rounded-full border-2 border-nick-border-dark shadow-[2px_2px_0_#000] hover:opacity-80 transition-opacity"
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="bg-nick-border-dark text-white text-xs font-bold px-4 py-2 rounded-full border-2 border-nick-border-dark shadow-[2px_2px_0_#000] hover:opacity-80 transition-opacity"
            >
              Enter My AugustaDev
            </button>
          )}
        </div>
      </div>

      {/* Main 3-column grid */}
      <div className="flex-1 grid grid-cols-[220px_1fr_200px] gap-4 p-4 bg-white max-w-[1200px] mx-auto w-full">

        {/* LEFT COLUMN */}
        <aside className="flex flex-col gap-4">

          {/* Featured promo */}
          <div className="nick-panel bg-nick-orange p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-nick-border-dark mb-1">
              Featured
            </p>
            <div className="bg-white border-2 border-nick-border-dark rounded-2xl overflow-hidden mb-2 gloss-effect">
              <div className="h-24 bg-gradient-to-br from-nick-purple to-nick-magenta flex items-center justify-center">
                <Gamepad2 size={40} className="text-white drop-shadow" />
              </div>
            </div>
            <p className="text-xs font-black text-nick-border-dark leading-tight">
              PixelHack 2026
            </p>
            <p className="text-[10px] text-nick-border-dark opacity-70 mt-0.5">
              48-hour retro jam — Mar 4
            </p>
            <button
              type="button"
              onClick={onSignIn}
              className="mt-2 w-full bg-nick-border-dark text-white text-[10px] font-black py-1.5 rounded-full border-2 border-nick-border-dark shadow-[2px_2px_0_rgba(0,0,0,0.5)] hover:opacity-80 transition-opacity"
            >
              Register Now!
            </button>
          </div>

          {/* Daily Poll */}
          <div className="nick-panel bg-nick-cyan p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-nick-border-dark mb-2">
              Daily Poll
            </p>
            <p className="text-xs font-bold text-nick-border-dark mb-2">
              Which track are you most excited about?
            </p>
            {['Web / Mobile', 'AI / ML', 'Games', 'Hardware'].map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-[11px] font-semibold text-nick-border-dark mb-1 cursor-pointer">
                <input type="radio" name="poll" className="accent-nick-orange" />
                {opt}
              </label>
            ))}
            <button
              type="button"
              className="mt-2 w-full bg-nick-border-dark text-white text-[10px] font-black py-1 rounded-full border-2 border-nick-border-dark shadow-[2px_2px_0_rgba(0,0,0,0.5)] hover:opacity-80 transition-opacity"
            >
              Vote!
            </button>
          </div>

          {/* Login box */}
          <div className="nick-panel bg-nick-green p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-nick-border-dark mb-2">
              {userEmail ? 'Your Account' : 'Sign In'}
            </p>
            {userEmail ? (
              <p className="text-xs font-bold text-nick-border-dark">{userEmail}</p>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="w-full bg-nick-border-dark text-white text-[10px] font-black py-1.5 rounded-full border-2 border-nick-border-dark shadow-[2px_2px_0_rgba(0,0,0,0.5)] hover:opacity-80 transition-opacity"
              >
                Log In / Sign Up
              </button>
            )}
          </div>
        </aside>

        {/* CENTER COLUMN */}
        <main className="flex flex-col gap-4">

          {/* Hero orb panel */}
          <div className="nick-panel bg-nick-magenta p-4 gloss-effect flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-white border-4 border-nick-border-dark flex items-center justify-center shadow-[4px_4px_0_#000] gloss-effect mb-3">
              <span className="text-3xl font-black text-nick-magenta leading-none select-none">AD</span>
            </div>
            <h1 className="text-2xl font-black text-white drop-shadow mb-1">
              Welcome to AugustaDev!
            </h1>
            <p className="text-xs font-semibold text-white opacity-90 mb-3">
              Build. Create. Compete. Repeat.
            </p>
            <button
              type="button"
              onClick={onSignIn}
              className="bg-nick-yellow text-nick-border-dark text-sm font-black px-6 py-2 rounded-full border-2 border-nick-border-dark shadow-[3px_3px_0_#000] hover:opacity-80 transition-opacity"
            >
              Enter My AugustaDev
            </button>
          </div>

          {/* Today on AugustaDev */}
          <div className="nick-panel bg-white border-2 border-nick-border-dark p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-nick-orange border border-nick-border-dark" />
              <p className="text-xs font-black uppercase tracking-widest text-nick-border-dark">
                Today on AugustaDev
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {lineupCards.map((card) => (
                <div key={card.title} className={`nick-panel ${card.color} p-2`}>
                  <p className="text-[9px] font-black uppercase tracking-widest text-nick-border-dark mb-0.5">
                    {card.time}
                  </p>
                  <p className="text-xs font-black text-nick-border-dark leading-tight mb-1">
                    {card.title}
                  </p>
                  <p className="text-[9px] text-nick-border-dark opacity-75 leading-tight">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Event listing */}
          <div className="nick-panel bg-white border-2 border-nick-border-dark p-3">
            <p className="text-xs font-black uppercase tracking-widest text-nick-border-dark mb-3">
              Upcoming Events
            </p>
            <div className="flex flex-col gap-2">
              {[
                { month: 'Mar', day: '4', year: '2026', tag: 'Hackathon', title: 'PixelHack 2026', location: 'Online', color: 'bg-nick-orange' },
                { month: 'Mar', day: '12', year: '2026', tag: 'Workshop', title: 'Midnight Build Jam', location: 'Online', color: 'bg-nick-purple' },
                { month: 'Apr', day: '2', year: '2026', tag: 'Hackathon', title: 'Founders x Hackers', location: 'Austin | Innovation Hub', color: 'bg-nick-cyan' },
              ].map((event) => (
                <div key={event.title} className="flex items-center gap-3 border-2 border-nick-border-dark rounded-2xl overflow-hidden shadow-[2px_2px_0_#000]">
                  <div className={`${event.color} flex flex-col items-center justify-center px-3 py-2 min-w-[52px]`}>
                    <span className="text-[9px] font-black uppercase text-nick-border-dark">{event.month}</span>
                    <span className="text-xl font-black text-nick-border-dark leading-none">{event.day}</span>
                    <span className="text-[9px] font-black text-nick-border-dark">{event.year}</span>
                  </div>
                  <div className="flex-1 py-2 pr-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-nick-orange">{event.tag}</span>
                    <p className="text-xs font-black text-nick-border-dark leading-tight">{event.title}</p>
                    <p className="text-[9px] text-nick-border-dark opacity-60 flex items-center gap-1 mt-0.5">
                      <MapPin size={9} />{event.location}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="mr-2 bg-nick-border-dark text-white text-[9px] font-black px-3 py-1 rounded-full border border-nick-border-dark hover:opacity-80 transition-opacity flex items-center gap-1"
                  >
                    <Rocket size={9} />Register
                  </button>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* RIGHT COLUMN */}
        <aside className="flex flex-col gap-4">

          {/* Green ad box */}
          <div className="nick-panel bg-nick-green p-3 flex flex-col items-center text-center">
            <CalendarDays size={28} className="text-nick-border-dark mb-1" />
            <p className="text-xs font-black text-nick-border-dark leading-tight mb-2">
              Augusta Dev Spring Build Weekend
            </p>
            <p className="text-[10px] text-nick-border-dark opacity-75 mb-2">
              Apr 2 · Austin, TX
            </p>
            <button
              type="button"
              onClick={onSignIn}
              className="w-full bg-nick-border-dark text-white text-[10px] font-black py-1.5 rounded-full border-2 border-nick-border-dark shadow-[2px_2px_0_rgba(0,0,0,0.5)] hover:opacity-80 transition-opacity"
            >
              Get Tickets
            </button>
          </div>

          {/* Blue ad box */}
          <div className="nick-panel bg-nick-blue p-3 flex flex-col items-center text-center">
            <Gamepad2 size={28} className="text-white mb-1" />
            <p className="text-xs font-black text-white leading-tight mb-2">
              Play the ADEV Trivia Challenge
            </p>
            <button
              type="button"
              className="w-full bg-white text-nick-blue text-[10px] font-black py-1.5 rounded-full border-2 border-white shadow-[2px_2px_0_rgba(0,0,0,0.3)] hover:opacity-80 transition-opacity"
            >
              Play Now
            </button>
          </div>

          {/* Tagline box */}
          <div className="nick-panel bg-nick-yellow p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-nick-border-dark">
              Think. Create. Innovate.
            </p>
          </div>
        </aside>
      </div>

      {/* Footer ticker */}
      <div className="bg-nick-orange border-t-4 border-nick-border-dark px-4 py-1">
        <div className="flex gap-8 animate-marquee whitespace-nowrap">
          {[0, 1].map((n) => (
            <span key={n} className="text-[10px] font-bold text-nick-border-dark tracking-widest uppercase">
              AugustaDev &copy; 2026 &bull;&nbsp;Think. Create. Innovate.&nbsp;&bull;&nbsp;All Rights Reserved&nbsp;&bull;&nbsp;
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
