import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import HackathonPage from './pages/HackathonPage/HackathonPage'
import HackathonSectionPage from './pages/HackathonSectionPage/HackathonSectionPage'
import ChatWidget from './components/chat/ChatWidget'
const hoverSoundSrc = '/ButtonHoverSound.wav'

const Profile = lazy(() => import('./pages/Profile/Profile'))
const AdminPage = lazy(() => import('./pages/AdminPage/AdminPage'))
const AboutPage = lazy(() => import('./pages/AboutPage/AboutPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage/ResetPasswordPage'))

function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession]   = useState<Session | null | undefined>(undefined)
  const [isAdmin, setIsAdmin]   = useState<boolean | null>(null)

  async function resolveAdmin(s: Session | null) {
    if (!s || !supabase) { setIsAdmin(false); return }
    if (s.user.email === import.meta.env.VITE_ADMIN_EMAIL) { setIsAdmin(true); return }
    if (s.user.app_metadata?.role === 'admin' || s.user.user_metadata?.role === 'admin') { setIsAdmin(true); return }
    const { data } = await supabase.from('admins').select('id').eq('user_id', s.user.id).maybeSingle()
    setIsAdmin(!!data)
  }

  useEffect(() => {
    if (!supabase) { setSession(null); setIsAdmin(false); return }
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session ?? null
      setSession(s)
      resolveAdmin(s)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s ?? null)
      resolveAdmin(s ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined || isAdmin === null) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#05030a' }}><div className="adm-loading__spinner" /></div>
  }

  if (!session || !isAdmin) return <Navigate to="/" replace />

  return <>{children}</>
}

// Always start at top on refresh
if (typeof window !== 'undefined') {
  window.history.scrollRestoration = 'manual'
}

const SOUND_ROUTES = ['/', '/hackathons', '/about']

function useButtonHoverSound(enabled: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio(hoverSoundSrc)
    audio.volume = 0.35
    audioRef.current = audio
  }, [])

  useEffect(() => {
    if (!enabled) return

    const play = (e: MouseEvent) => {
      const target = e.target
      if (!(target instanceof Element)) return
      if (target.closest('button')) {
        const snd = audioRef.current
        if (!snd) return
        snd.currentTime = 0
        snd.play().catch(() => {})
      }
    }

    document.addEventListener('mouseenter', play, true)
    return () => document.removeEventListener('mouseenter', play, true)
  }, [enabled])
}

export default function App() {
  const { pathname } = useLocation()
  useButtonHoverSound(SOUND_ROUTES.includes(pathname))

  return (
    <>
    <Routes>
      <Route path="/" element={<HackathonPage />} />
      <Route path="/hackathons" element={<HackathonSectionPage />} />
      <Route path="/about" element={<Suspense fallback={null}><AboutPage /></Suspense>} />
      <Route path="/reset-password" element={<Suspense fallback={null}><ResetPasswordPage /></Suspense>} />
      <Route path="/profile" element={<Suspense fallback={null}><Profile /></Suspense>} />
      <Route
        path="/admin"
        element={
          <ProtectedAdminRoute>
            <Suspense fallback={null}><AdminPage /></Suspense>
          </ProtectedAdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>

    <ChatWidget />
    </>
  )
}
