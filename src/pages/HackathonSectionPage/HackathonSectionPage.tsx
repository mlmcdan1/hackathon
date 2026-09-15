import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HackathonSection from '../../components/HackathonSection'
import '../HackathonPage/HackathonPage.css'

export default function HackathonSectionPage() {
  const navigate = useNavigate()
  const [isExiting, setIsExiting] = useState(false)

  const handleNavigateHome = () => {
    if (isExiting) return
    setIsExiting(true)
    setTimeout(() => navigate('/'), 300)
  }

  // Undoes HackathonPage.css's global `overscroll-behavior: none` on body
  // (still in effect here — that stylesheet is imported above too) so this
  // page's native scroll bounces normally. Does NOT touch `overflow`:
  // nothing on this page or Lenis actually sets it inline, and forcing it
  // to 'auto' on *both* html and body turned body into its own nested,
  // roughly-viewport-height scroll container — trapping the whole event
  // list inside it and leaving the footer (rendered after body's box in
  // the outer layout) stuck just below the fold regardless of how far you
  // scrolled the list itself.
  useEffect(() => {
    const previousBodyOverscroll = document.body.style.overscrollBehavior
    document.body.style.overscrollBehavior = 'auto'
    return () => {
      document.body.style.overscrollBehavior = previousBodyOverscroll
    }
  }, [])

  return (
    <div
      className="hack-section-route"
      style={{
        opacity: isExiting ? 0 : 1,
        transition: isExiting ? 'opacity 0.3s ease' : 'none',
      }}
    >
      <HackathonSection onNavigateHome={handleNavigateHome} />
    </div>
  )
}
