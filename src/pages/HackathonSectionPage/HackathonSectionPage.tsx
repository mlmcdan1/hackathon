import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthModal from '../../components/auth/AuthModal'
import HackathonSection from '../../components/HackathonSection'
import RegistrationModal from '../../components/registration/RegistrationModal'
import ProjectSubmissionModal from '../../components/registration/ProjectSubmissionModal'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { type EventRecord } from '../../lib/eventUtils'
import { type ProjectSubmission } from '../../lib/registrationUtils'
import '../HackathonPage/HackathonPage.css'

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

export default function HackathonSectionPage() {
  const navigate = useNavigate()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [regEvent, setRegEvent] = useState<EventRecord | null>(null)
  const [subEvent, setSubEvent] = useState<EventRecord | null>(null)
  const [subExisting, setSubExisting] = useState<ProjectSubmission | null>(null)
  const [dataVersion, setDataVersion] = useState(0)

  const handleNavigateHome = () => {
    if (isExiting) return
    setIsExiting(true)
    setTimeout(() => navigate('/'), 300)
  }

  async function resolveAdmin(session: import('@supabase/supabase-js').Session | null) {
    if (!session || !supabase) { setIsAdmin(false); return }
    if (session.user.email === import.meta.env.VITE_ADMIN_EMAIL) { setIsAdmin(true); return }
    if (session.user.app_metadata?.role === 'admin' || session.user.user_metadata?.role === 'admin') { setIsAdmin(true); return }
    const { data } = await supabase.from('admins').select('id').eq('user_id', session.user.id).maybeSingle()
    setIsAdmin(!!data)
  }

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return

    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? null)
      setUserName(data.session?.user.user_metadata?.first_name ?? null)
      setUserId(data.session?.user.id ?? null)
      resolveAdmin(data.session ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null)
      setUserName(session?.user.user_metadata?.first_name ?? null)
      setUserId(session?.user.id ?? null)
      resolveAdmin(session ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverscroll = document.body.style.overscrollBehavior

    document.documentElement.style.overflow = 'auto'
    document.body.style.overflow = 'auto'
    document.body.style.overscrollBehavior = 'auto'

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
      document.body.style.overscrollBehavior = previousBodyOverscroll
    }
  }, [])

  return (
    <>
      <div
        className="hack-section-route"
        style={{
          opacity: isExiting ? 0 : 1,
          transition: isExiting ? 'opacity 0.3s ease' : 'none',
        }}
      >
        <HackathonSection
          userEmail={userEmail}
          userName={userName}
          userId={userId}
          isAdmin={isAdmin}
          onSignIn={() => setShowAuthModal(true)}
          onSignOut={() => void supabase?.auth.signOut()}
          onNavigateHome={handleNavigateHome}
          onRegister={(event) => setRegEvent(event)}
          onSubmitProject={(event, existing) => { setSubEvent(event); setSubExisting(existing) }}
          refreshKey={dataVersion}
        />
      </div>

      {regEvent && (
        <RegistrationModal
          eventId={regEvent.id}
          eventTitle={regEvent.title}
          colorHex={COLOR_HEX[regEvent.color] ?? '#4ade80'}
          colorRgb={COLOR_RGB[regEvent.color] ?? '74, 222, 128'}
          userId={userId}
          userEmail={userEmail}
          existing={null}
          onClose={() => setRegEvent(null)}
          onSaved={() => { setRegEvent(null); setDataVersion((v) => v + 1) }}
        />
      )}

      {subEvent && userId && (
        <ProjectSubmissionModal
          eventId={subEvent.id}
          eventTitle={subEvent.title}
          colorHex={COLOR_HEX[subEvent.color] ?? '#4ade80'}
          colorRgb={COLOR_RGB[subEvent.color] ?? '74, 222, 128'}
          userId={userId}
          existing={subExisting}
          onClose={() => { setSubEvent(null); setSubExisting(null) }}
          onSaved={() => { setSubEvent(null); setSubExisting(null); setDataVersion((v) => v + 1) }}
        />
      )}

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  )
}
