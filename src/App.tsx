import { lazy, Suspense, useEffect, useRef } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import HackathonPage from './pages/HackathonPage/HackathonPage'
import HackathonSectionPage from './pages/HackathonSectionPage/HackathonSectionPage'
import SiteFooter from './components/footer/SiteFooter'
const hoverSoundSrc = '/ButtonHoverSound.wav'

const AboutPage = lazy(() => import('./pages/AboutPage/AboutPage'))
const HackathonDetailPage = lazy(() => import('./pages/HackathonDetailPage/HackathonDetailPage'))

const SOUND_ROUTE_PREFIXES = ['/', '/hackathons', '/about']

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
  useButtonHoverSound(SOUND_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/')))

  return (
    <>
      <Routes>
        <Route path="/" element={<HackathonPage />} />
        <Route path="/hackathons" element={<HackathonSectionPage />} />
        <Route path="/hackathons/:id" element={<Suspense fallback={null}><HackathonDetailPage /></Suspense>} />
        <Route path="/about" element={<Suspense fallback={null}><AboutPage /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SiteFooter />
    </>
  )
}
