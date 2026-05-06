import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthModal from '../../components/auth/AuthModal'
import HackathonSection from '../../components/HackathonSection'
import { supabase } from '../../lib/supabase'
import '../HackathonPage/HackathonPage.css'

const TV_OFF_DURATION_MS = 680

export default function HackathonSectionPage() {
  const navigate = useNavigate()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [isPoweringOff, setIsPoweringOff] = useState(false)
  const transitionTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? null)
      setUserName(data.session?.user.user_metadata?.first_name ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null)
      setUserName(session?.user.user_metadata?.first_name ?? null)
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

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [])

  const navigateHomeWithTvOff = () => {
    if (isPoweringOff) return

    setIsPoweringOff(true)
    transitionTimeoutRef.current = window.setTimeout(() => {
      navigate('/')
    }, TV_OFF_DURATION_MS)
  }

  return (
    <>
      <div className={`hack-section-route${isPoweringOff ? ' hack-section-route--powering-off' : ''}`}>
        <HackathonSection
          userEmail={userEmail}
          userName={userName}
          onSignIn={() => setShowAuthModal(true)}
          onSignOut={() => supabase.auth.signOut()}
          onNavigateHome={navigateHomeWithTvOff}
        />
        {isPoweringOff && (
          <div className="hack-section-route__tv-off" aria-hidden="true">
            <div className="hack-section-route__tv-line" />
          </div>
        )}
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  )
}
