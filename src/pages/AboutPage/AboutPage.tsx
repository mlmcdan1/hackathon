import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HackathonNavbar from '../../components/navigation/HackathonNavbar'
import AuthModal from '../../components/auth/AuthModal'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { useNavScroll } from '../../hooks/useNavScroll'
import './AboutPage.css'

export default function AboutPage() {
  const navigate = useNavigate()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const { scrolled, hidden: navHidden } = useNavScroll()

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return

    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? null)
      setUserName(data.session?.user.user_metadata?.first_name ?? null)
      setIsAdmin(data.session?.user?.app_metadata?.role === 'admin')
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null)
      setUserName(session?.user.user_metadata?.first_name ?? null)
      setIsAdmin(session?.user?.app_metadata?.role === 'admin')
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <>
      <div className="about-page">
        <HackathonNavbar
          activeSection={-1}
          hidden={navHidden}
          scrolled={scrolled}
          links={[{ label: 'Hackathons', index: 1 }]}
          onNavigate={(i) => { if (i === 0) navigate('/'); else if (i === 1) navigate('/hackathons') }}
          userEmail={userEmail}
          userName={userName}
          isAdmin={isAdmin}
          onSignIn={() => setShowAuthModal(true)}
          onSignOut={() => void supabase?.auth.signOut()}
        />

        <main className="about-page__content">
          {/* Content coming soon */}
        </main>
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  )
}
