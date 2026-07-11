import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthModal from '../../components/auth/AuthModal'
import HackathonSection from '../../components/HackathonSection'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import '../HackathonPage/HackathonPage.css'

export default function HackathonSectionPage() {
  const navigate = useNavigate()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const handleNavigateHome = () => {
    if (isExiting) return
    setIsExiting(true)
    setTimeout(() => navigate('/'), 300)
  }

  async function resolveAdmin(session: import('@supabase/supabase-js').Session | null) {
    if (!session || !supabase) { setIsAdmin(false); return }
    if (session.user.email === import.meta.env.VITE_ADMIN_EMAIL) { setIsAdmin(true); return }
    const { data } = await supabase.from('admins').select('id').eq('user_id', session.user.id).maybeSingle()
    setIsAdmin(!!data)
  }

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return

    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? null)
      setUserName(data.session?.user.user_metadata?.first_name ?? null)
      resolveAdmin(data.session ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null)
      setUserName(session?.user.user_metadata?.first_name ?? null)
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
          isAdmin={isAdmin}
          onSignIn={() => setShowAuthModal(true)}
          onSignOut={() => void supabase?.auth.signOut()}
          onNavigateHome={handleNavigateHome}
        />
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  )
}
